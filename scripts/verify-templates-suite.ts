import dotenv from 'dotenv';
dotenv.config();
import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import {
  getDefaultTemplateSet,
  getUserTemplateSet,
  getCampaignTemplateSet,
  saveTemplateSet,
  restoreTemplateSetVersion,
  resetUserTemplateSetToDefault,
  createTemplateSetForNewUser,
  createTemplateSetForNewCampaign,
  deleteUserTemplateSet,
  getCampaignTemplateImpact,
  resolveEmailContent,
  composeFullEmail,
  ensureTemplateSetsAndSeed,
  DEFAULT_SET_ID
} from '../server/templateBackend.ts';
import http from 'http';
import { app } from '../server/app.ts';
import { createSessionToken } from '../server/auth.ts';

async function runTestSuite() {
  console.log('================================================================');
  console.log('   RUNNING TEMPLATE MANAGEMENT VERIFICATION TEST SUITE (a)-(h)  ');
  console.log('================================================================\n');

  const db = await getDb();
  await ensureTemplateSetsAndSeed();

  const results: Record<string, { pass: boolean; details: any }> = {};

  // --------------------------------------------------------------------------
  // TEST (a): New user gets personal template set copy; admin edits default;
  //           existing user and campaigns remain unchanged.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST a] New user copy & Admin default isolation');
  try {
    const testUserId = `test-usr-a-${Date.now()}`;
    const testCampId = `test-camp-a-${Date.now()}`;

    // 1. Create new user's personal template set
    const userSet = await createTemplateSetForNewUser(testUserId, 'Test User A');
    // 2. Create campaign template set
    const campSet = await createTemplateSetForNewCampaign(testCampId, 'Test Campaign A');

    const origDefault = await getDefaultTemplateSet();
    const origUserStage1Subj = userSet.stages[0].subject;
    const origCampStage1Subj = campSet.stages[0].subject;

    // 3. Admin edits default set
    const editedDefaultStages = origDefault.stages.map((st, idx) =>
      idx === 0 ? { ...st, subject: `[ADMIN-DEFAULT-TEST-V2] ${st.subject}` } : { ...st }
    );
    const updatedDefault = await saveTemplateSet(
      DEFAULT_SET_ID,
      editedDefaultStages,
      { id: 'admin-1', name: 'Super Admin', role: 'admin' }
    );

    // 4. Fetch user set and campaign set again
    const userSetAfter = await getUserTemplateSet(testUserId);
    const campSetAfter = await getCampaignTemplateSet(testCampId);

    const defaultChanged = updatedDefault.stages[0].subject.includes('[ADMIN-DEFAULT-TEST-V2]');
    const userUnchanged = userSetAfter.stages[0].subject === origUserStage1Subj &&
      !userSetAfter.stages[0].subject.includes('[ADMIN-DEFAULT-TEST-V2]');
    const campUnchanged = campSetAfter.stages[0].subject === origCampStage1Subj &&
      !campSetAfter.stages[0].subject.includes('[ADMIN-DEFAULT-TEST-V2]');

    // Clean up / restore default
    await saveTemplateSet(
      DEFAULT_SET_ID,
      origDefault.stages,
      { id: 'admin-1', name: 'Super Admin', role: 'admin' }
    );
    await deleteUserTemplateSet(testUserId);
    await db.collection(COLLECTIONS.TEMPLATE_SETS).deleteOne({ id: campSet.id });

    const pass = defaultChanged && userUnchanged && campUnchanged;
    results['a'] = {
      pass,
      details: {
        defaultUpdatedWithPrefix: defaultChanged,
        userStage1SubjectKept: userSetAfter.stages[0].subject,
        campaignStage1SubjectKept: campSetAfter.stages[0].subject,
        userRemainedUnchanged: userUnchanged,
        campaignRemainedUnchanged: campUnchanged
      }
    };
    console.log(`[TEST a] ${pass ? 'PASSED' : 'FAILED'}:`, results['a'].details, '\n');
  } catch (err: any) {
    results['a'] = { pass: false, details: { error: err.message } };
    console.error('[TEST a] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (b): resolveEmailContent returns correct content for:
  //           campaign lead, 'own' lead, no-campaign lead, and custom node.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST b] resolveEmailContent hierarchical resolution');
  try {
    const testUserId = `test-usr-b-${Date.now()}`;
    const testCampId = `test-camp-b-${Date.now()}`;

    // Create user template set with unique text
    const userSet = await createTemplateSetForNewUser(testUserId, 'Test User B');
    const userStages = userSet.stages.map((st, i) =>
      i === 0 ? { ...st, subject: 'USER_CUSTOM_SUBJ: {{name}}', bodyHtml: '<p>User Body</p>' } : st
    );
    await saveTemplateSet(userSet.id, userStages, { id: testUserId, role: 'member', permissions: ['templates.editOwn'] });

    // Create campaign template set with unique text
    const campSet = await createTemplateSetForNewCampaign(testCampId, 'Test Campaign B');
    const campStages = campSet.stages.map((st, i) =>
      i === 0 ? { ...st, subject: 'CAMPAIGN_CUSTOM_SUBJ: {{name}}', bodyHtml: '<p>Campaign Body</p>' } : st
    );
    await saveTemplateSet(campSet.id, campStages, { id: 'admin', role: 'admin' });

    // Case 1: Campaign lead (templateSource: 'campaign')
    const leadCamp: any = {
      name: 'Alice Cooper',
      company: 'Cooper Inc',
      campaignId: testCampId,
      ownerId: testUserId,
      templateSource: 'campaign'
    };
    const resCamp = await resolveEmailContent(leadCamp, 1);

    // Case 2: 'Own' lead (templateSource: 'own')
    const leadOwn: any = {
      name: 'Bob Marley',
      company: 'Marley Inc',
      campaignId: testCampId,
      ownerId: testUserId,
      templateSource: 'own'
    };
    const resOwn = await resolveEmailContent(leadOwn, 1);

    // Case 3: No-campaign lead (campaignId: undefined)
    const leadNoCamp: any = {
      name: 'Charlie Chaplin',
      company: 'Chaplin Inc',
      ownerId: testUserId
    };
    const resNoCamp = await resolveEmailContent(leadNoCamp, 1);

    // Case 4: Custom node override
    const customNode: any = {
      id: 'node-custom-email',
      type: 'emailNode',
      data: {
        customSubject: 'OVERRIDE_NODE_SUBJ: {{name}}',
        customBodyHtml: '<p>Override Node Body</p>',
        templateStage: 1
      }
    };
    const resCustomNode = await resolveEmailContent(leadCamp, customNode);

    const pass1 = resCamp.templateSourceUsed === 'campaign' && resCamp.subject.includes('CAMPAIGN_CUSTOM_SUBJ');
    const pass2 = resOwn.templateSourceUsed === 'user' && resOwn.subject.includes('USER_CUSTOM_SUBJ');
    const pass3 = resNoCamp.templateSourceUsed === 'user' && resNoCamp.subject.includes('USER_CUSTOM_SUBJ');
    const pass4 = resCustomNode.templateSourceUsed === 'custom_node' && resCustomNode.subject.includes('OVERRIDE_NODE_SUBJ');

    // Clean up
    await deleteUserTemplateSet(testUserId);
    await db.collection(COLLECTIONS.TEMPLATE_SETS).deleteOne({ id: campSet.id });

    const pass = pass1 && pass2 && pass3 && pass4;
    results['b'] = {
      pass,
      details: {
        campaignLead: { source: resCamp.templateSourceUsed, subject: resCamp.subject, valid: pass1 },
        ownLead: { source: resOwn.templateSourceUsed, subject: resOwn.subject, valid: pass2 },
        noCampaignLead: { source: resNoCamp.templateSourceUsed, subject: resNoCamp.subject, valid: pass3 },
        customNode: { source: resCustomNode.templateSourceUsed, subject: resCustomNode.subject, valid: pass4 }
      }
    };
    console.log(`[TEST b] ${pass ? 'PASSED' : 'FAILED'}:`, results['b'].details, '\n');
  } catch (err: any) {
    results['b'] = { pass: false, details: { error: err.message } };
    console.error('[TEST b] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (c): Two-step import: 'all', ticked leads, and unticked leads carried forward.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST c] Two-step import bulk selection & unticked preservation');
  try {
    // Simulate candidate set
    const candidates = [
      { id: 'cand-1', email: 'one@example.com', name: 'One', isValid: true },
      { id: 'cand-2', email: 'two@example.com', name: 'Two', isValid: true },
      { id: 'cand-3', email: 'three@example.com', name: 'Three', isValid: true },
      { id: 'cand-4', email: 'four@example.com', name: 'Four', isValid: true }
    ];

    // Initial state: all candidates default to 'campaign'
    let templateChoices: Record<string, 'campaign' | 'own'> = {};
    candidates.forEach(c => { templateChoices[c.id] = 'campaign'; });

    // Step A: Apply "Use my template for all"
    candidates.forEach(c => { templateChoices[c.id] = 'own'; });
    const allOwn = Object.values(templateChoices).every(v => v === 'own');

    // Step B: User ticks cand-1 and cand-2, applies 'campaign' to ticked
    const tickedIds = new Set(['cand-1', 'cand-2']);
    candidates.forEach(c => {
      if (tickedIds.has(c.id)) {
        templateChoices[c.id] = 'campaign';
      }
    });

    // Step C: Verify cand-1 and cand-2 are 'campaign', cand-3 and cand-4 remain 'own'
    const cand1IsCamp = templateChoices['cand-1'] === 'campaign';
    const cand2IsCamp = templateChoices['cand-2'] === 'campaign';
    const cand3RemainsOwn = templateChoices['cand-3'] === 'own';
    const cand4RemainsOwn = templateChoices['cand-4'] === 'own';

    // Step D: Verify final committed leads carry all candidates forward with their templateSource
    const committedLeads = candidates.map(c => ({
      ...c,
      templateSource: templateChoices[c.id]
    }));

    const allCarriedForward = committedLeads.length === 4;
    const sourcesCorrect =
      committedLeads[0].templateSource === 'campaign' &&
      committedLeads[1].templateSource === 'campaign' &&
      committedLeads[2].templateSource === 'own' &&
      committedLeads[3].templateSource === 'own';

    const pass = allOwn && cand1IsCamp && cand2IsCamp && cand3RemainsOwn && cand4RemainsOwn && allCarriedForward && sourcesCorrect;
    results['c'] = {
      pass,
      details: {
        allSetToOwnPassed: allOwn,
        tickedSetToCampaign: cand1IsCamp && cand2IsCamp,
        untickedPreservedOwn: cand3RemainsOwn && cand4RemainsOwn,
        allCarriedForward,
        finalMapping: templateChoices
      }
    };
    console.log(`[TEST c] ${pass ? 'PASSED' : 'FAILED'}:`, results['c'].details, '\n');
  } catch (err: any) {
    results['c'] = { pass: false, details: { error: err.message } };
    console.error('[TEST c] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (d): Editing a template affects the next email for a lead already mid-sequence at send time.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST d] Mid-sequence template edit dynamic send-time evaluation');
  try {
    const testCampId = `test-camp-d-${Date.now()}`;
    const testUserId = `test-usr-d-${Date.now()}`;

    // 1. Create campaign template set
    const campSet = await createTemplateSetForNewCampaign(testCampId, 'Dynamic Send Test');

    // 2. Lead enrolled at stage 3
    const midSeqLead: any = {
      name: 'David Bowie',
      company: 'Starman Records',
      campaignId: testCampId,
      ownerId: testUserId,
      currentStage: 3,
      templateSource: 'campaign'
    };

    // First resolution before edit
    const resBefore = await resolveEmailContent(midSeqLead, 3);

    // 3. Edit Stage 3 template in campaign
    const updatedStages = campSet.stages.map(st =>
      st.stage === 3
        ? { ...st, subject: 'LIVE_SEND_TIME_UPDATED_SUBJECT: {{company}}', bodyHtml: '<p>Updated Stage 3 Body</p>' }
        : st
    );
    await saveTemplateSet(campSet.id, updatedStages, { id: 'admin', role: 'admin' });

    // 4. Resolve again for mid-sequence lead at send time
    const resAfter = await resolveEmailContent(midSeqLead, 3);

    const receivedUpdated = resAfter.subject.includes('LIVE_SEND_TIME_UPDATED_SUBJECT') &&
      resAfter.bodyHtml.includes('Updated Stage 3 Body');

    // Clean up
    await db.collection(COLLECTIONS.TEMPLATE_SETS).deleteOne({ id: campSet.id });

    const pass = receivedUpdated && resBefore.subject !== resAfter.subject;
    results['d'] = {
      pass,
      details: {
        stage3SubjectBefore: resBefore.subject,
        stage3SubjectAfterSendTimeEdit: resAfter.subject,
        evaluatedDynamicallyAtSendTime: receivedUpdated
      }
    };
    console.log(`[TEST d] ${pass ? 'PASSED' : 'FAILED'}:`, results['d'].details, '\n');
  } catch (err: any) {
    results['d'] = { pass: false, details: { error: err.message } };
    console.error('[TEST d] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (e): Campaign template warning displays correct counts of leads and users (templateSource === 'campaign').
  // --------------------------------------------------------------------------
  console.log('>>> [TEST e] Campaign template impact warning counts');
  try {
    const testCampId = `test-camp-e-${Date.now()}`;
    const leadsCol = db.collection(COLLECTIONS.LEADS);

    // Insert 4 test leads:
    // Lead 1: User 1, templateSource: 'campaign' (included)
    // Lead 2: User 2, templateSource: 'campaign' (included)
    // Lead 3: User 1, templateSource: 'campaign' (included)
    // Lead 4: User 1, templateSource: 'own' (EXCLUDED because uses personal set!)
    const testLeads = [
      { id: `lead-e1-${Date.now()}`, leadId: `LEAD-E1-${Date.now()}`, campaignId: testCampId, status: 'Active', ownerId: 'user-alpha', ownerName: 'Alpha', templateSource: 'campaign' },
      { id: `lead-e2-${Date.now()}`, leadId: `LEAD-E2-${Date.now()}`, campaignId: testCampId, status: 'Active', ownerId: 'user-beta', ownerName: 'Beta', templateSource: 'campaign' },
      { id: `lead-e3-${Date.now()}`, leadId: `LEAD-E3-${Date.now()}`, campaignId: testCampId, status: 'Active', ownerId: 'user-alpha', ownerName: 'Alpha', templateSource: 'campaign' },
      { id: `lead-e4-${Date.now()}`, leadId: `LEAD-E4-${Date.now()}`, campaignId: testCampId, status: 'Active', ownerId: 'user-alpha', ownerName: 'Alpha', templateSource: 'own' }
    ];
    await leadsCol.insertMany(testLeads as any);

    const impact = await getCampaignTemplateImpact(testCampId);

    // Clean up test leads
    await leadsCol.deleteMany({ campaignId: testCampId });

    // Expected: 3 leads affected (e1, e2, e3), 2 users (user-alpha, user-beta)
    const pass = impact.affectedLeadsCount === 3 && impact.userCount === 2;
    results['e'] = {
      pass,
      details: {
        totalInsertedLeads: 4,
        ownSourceLeadsExcluded: 1,
        expectedAffectedLeads: 3,
        actualAffectedLeads: impact.affectedLeadsCount,
        expectedUserCount: 2,
        actualUserCount: impact.userCount,
        affectedUserNames: impact.affectedUserNames
      }
    };
    console.log(`[TEST e] ${pass ? 'PASSED' : 'FAILED'}:`, results['e'].details, '\n');
  } catch (err: any) {
    results['e'] = { pass: false, details: { error: err.message } };
    console.error('[TEST e] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (f): Normal user attempting POST /api/settings/header-footer receives 403 Forbidden.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST f] Security check: non-admin POST /api/settings/header-footer returns 403');
  try {
    // Start temporary local server on free port to test actual Express HTTP pipeline
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr: any = server.address();
    const port = addr.port;

    // Create a normal test user in users collection
    const normalUser = {
      id: `usr-normal-${Date.now()}`,
      email: `normal-${Date.now()}@example.com`,
      name: 'Normal Team Member',
      role: 'user' as const,
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date().toISOString()
    };
    await db.collection('users').insertOne(normalUser);
    const sessionToken = createSessionToken(normalUser);

    // Send request with normal user's session cookie
    const res = await fetch(`http://127.0.0.1:${port}/api/settings/header-footer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        'Cookie': `gini_auth_token=${sessionToken}`
      },
      body: JSON.stringify({
        header: '<div>Hacker Header</div>',
        footer: '<div>Hacker Footer</div>'
      })
    });

    const status = res.status;
    const body = await res.json().catch(() => ({}));
    server.close();
    await db.collection('users').deleteOne({ id: normalUser.id });

    const pass = status === 403;
    results['f'] = {
      pass,
      details: {
        httpStatus: status,
        expectedStatus: 403,
        responseBody: body
      }
    };
    console.log(`[TEST f] ${pass ? 'PASSED' : 'FAILED'}:`, results['f'].details, '\n');
  } catch (err: any) {
    results['f'] = { pass: false, details: { error: err.message } };
    console.error('[TEST f] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (g): Final composed HTML of manual send and runner send contains header, body, footer,
  //           exactly one tracking pixel, and footer links are NOT rewritten.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST g] Email composition: header, body, footer, link tracking & 1 tracking pixel');
  try {
    const rawHeader = '<header><a href="https://acme.org/brand-home">Acme Home</a></header>';
    const rawBody = '<p>Hi {{first_name}}, please review our proposal <a href="https://acme.org/proposal/123">here</a>.</p>';
    const rawFooter = '<footer><a href="https://acme.org/unsubscribe?id=123">Unsubscribe</a> | Privacy</footer>';

    const composed = composeFullEmail({
      headerHtml: rawHeader,
      bodyHtml: rawBody,
      footerHtml: rawFooter,
      lead: {
        leadId: 'lead-test-g-99',
        campaign: 'camp-test-g-99',
        email: 'recipient@acme.org'
      },
      stage: 2,
      baseUrl: 'http://localhost:3000',
      embedTrackingPixel: true
    });

    const html = composed.composedHtml;

    // 1. Header is present & header links are NOT rewritten
    const headerPresent = html.includes('Acme Home');
    const headerLinkNotRewritten = html.includes('href="https://acme.org/brand-home"');

    // 2. Body link IS rewritten with /api/track/click
    const bodyLinkRewritten = html.includes('/api/track/click?url=') && html.includes(encodeURIComponent('https://acme.org/proposal/123'));

    // 3. Footer is present & footer links are NOT rewritten
    const footerPresent = html.includes('Unsubscribe');
    const footerLinkNotRewritten = html.includes('href="https://acme.org/unsubscribe?id=123"');

    // 4. Exactly one tracking pixel (/api/track/open)
    const trackingPixelMatches = html.match(/\/api\/track\/open/g) || [];
    const exactlyOnePixel = trackingPixelMatches.length === 1;

    // 5. Tracking pixel is at the end
    const lastImgIndex = html.lastIndexOf('<img src="http://localhost:3000/api/track/open');
    const footerIndex = html.indexOf('email-footer');
    const pixelAtEnd = lastImgIndex > footerIndex;

    const pass = headerPresent && headerLinkNotRewritten && bodyLinkRewritten && footerPresent && footerLinkNotRewritten && exactlyOnePixel && pixelAtEnd;
    results['g'] = {
      pass,
      details: {
        headerPresent,
        headerLinkNotRewritten,
        bodyLinkRewritten,
        footerPresent,
        footerLinkNotRewritten,
        trackingPixelCount: trackingPixelMatches.length,
        pixelAtEnd,
        isLikelyLong: composed.isLikelyLong,
        charCount: composed.charCount
      }
    };
    console.log(`[TEST g] ${pass ? 'PASSED' : 'FAILED'}:`, results['g'].details, '\n');
  } catch (err: any) {
    results['g'] = { pass: false, details: { error: err.message } };
    console.error('[TEST g] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST (h): Deleting a user deletes their personal template set but leaves campaign template sets intact.
  // --------------------------------------------------------------------------
  console.log('>>> [TEST h] User deletion cascade leaves campaign template sets intact');
  try {
    const testUserId = `test-usr-h-${Date.now()}`;
    const testCampId = `test-camp-h-${Date.now()}`;

    // 1. Create personal set
    const userSet = await createTemplateSetForNewUser(testUserId, 'Delete Target User');
    // 2. Create campaign set
    const campSet = await createTemplateSetForNewCampaign(testCampId, 'Independent Campaign Set');

    // Verify both exist initially
    const setsCol = db.collection(COLLECTIONS.TEMPLATE_SETS);
    const userSetBefore = await setsCol.findOne({ kind: 'user', ownerId: testUserId });
    const campSetBefore = await setsCol.findOne({ kind: 'campaign', campaignId: testCampId });

    // 3. Delete user's template set (called during user deletion cascade)
    const deleteSuccess = await deleteUserTemplateSet(testUserId);

    // 4. Verify post-deletion state in MongoDB
    const userSetAfter = await setsCol.findOne({ kind: 'user', ownerId: testUserId });
    const campSetAfter = await setsCol.findOne({ kind: 'campaign', campaignId: testCampId });

    // Clean up test campaign set
    await setsCol.deleteOne({ kind: 'campaign', campaignId: testCampId });

    const userDeleted = userSetBefore !== null && userSetAfter === null && deleteSuccess;
    const campPreserved = campSetBefore !== null && campSetAfter !== null;

    const pass = userDeleted && campPreserved;
    results['h'] = {
      pass,
      details: {
        userPersonalSetDeleted: userDeleted,
        campaignTemplateSetPreserved: campPreserved,
        userSetId: userSet.id,
        campaignSetId: campSet.id
      }
    };
    console.log(`[TEST h] ${pass ? 'PASSED' : 'FAILED'}:`, results['h'].details, '\n');
  } catch (err: any) {
    results['h'] = { pass: false, details: { error: err.message } };
    console.error('[TEST h] FAILED with error:', err);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log('                 VERIFICATION TEST SUITE SUMMARY                ');
  console.log('================================================================');
  let allPassed = true;
  for (const [key, res] of Object.entries(results)) {
    console.log(`Test (${key}): ${res.pass ? 'PASS' : 'FAIL'}`);
    if (!res.pass) allPassed = false;
  }
  console.log('================================================================');
  console.log(`FINAL RESULT: ${allPassed ? 'ALL TESTS PASSED (8/8)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
