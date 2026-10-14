/**
 * scripts/verify-campaign-about.ts
 *
 * Automated verification for Campaign "About this campaign" feature & AI writing assistant context.
 * Tests:
 * (a) an owner saves the text and it persists after reload;
 * (b) another user editing it directly through the API gets 403 and sees it read-only in the canvas, and an admin can edit it;
 * (c) show the exact prompt sent to the model for a lead with a campaign: it contains the company text and then the campaign text, correctly labelled;
 * (d) a lead with no campaign omits the campaign part;
 * (e) duplicating a campaign copies the text;
 * (f) editing the text does not show the affected-leads warning;
 * (g) the 1,000 character limit is enforced and HTML is stripped;
 * (h) the panel's "Using:" line shows the right names.
 */

import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { hashPassword } from '../server/auth.ts';
import { ROLE_PERMISSIONS } from '../server/permissions.ts';

const BASE_URL = 'http://localhost:3000';

interface HttpResponse {
  status: number;
  data: any;
  headers: Headers;
  cookieHeader?: string;
}

async function request(
  urlPath: string,
  method = 'GET',
  body?: any,
  cookie?: string
): Promise<HttpResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    data,
    headers: res.headers,
    cookieHeader: res.headers.get('set-cookie') || undefined
  };
}

function extractCookie(setCookieHeader?: string): string {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(/gini_auth_token=[^;]+/);
  return match ? match[0] : '';
}

async function loginUser(email: string, password = 'TestUser123!'): Promise<string> {
  const res = await request('/api/auth/login', 'POST', { email, password });
  if (res.status !== 200 || !res.cookieHeader) {
    throw new Error(`Failed to log in ${email}: status ${res.status}, body: ${JSON.stringify(res.data)}`);
  }
  return extractCookie(res.cookieHeader);
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${desc}${detail ? ` -> ${detail}` : ''}`);
    failedCount++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('   CAMPAIGN "ABOUT THIS CAMPAIGN" & AI ASSIST CONTEXT SUITE     ');
  console.log('================================================================\n');

  const db = await getDb();
  const usersCol = db.collection(COLLECTIONS.USERS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const leadsCol = db.collection(COLLECTIONS.LEADS);

  // 1. Setup Test Users: Admin, Alice (Owner), Bob (Colleague/Non-owner)
  const hashedPassword = await hashPassword('TestUser123!');
  const now = new Date().toISOString();

  const adminUser = {
    id: 'user-admin-about-test',
    email: 'admin.about.test@example.com',
    name: 'Admin User',
    passwordHash: hashedPassword,
    role: 'admin',
    permissions: ROLE_PERMISSIONS['admin'],
    isDefaultAdmin: true,
    isActive: true,
    mustChangePassword: false,
    createdAt: now
  };

  const aliceUser = {
    id: 'user-alice-about-test',
    email: 'alice.about.test@example.com',
    name: 'Alice Owner',
    passwordHash: hashedPassword,
    role: 'user',
    permissions: ROLE_PERMISSIONS['user'],
    isActive: true,
    mustChangePassword: false,
    createdAt: now
  };

  const bobUser = {
    id: 'user-bob-about-test',
    email: 'bob.about.test@example.com',
    name: 'Bob Colleague',
    passwordHash: hashedPassword,
    role: 'user',
    permissions: ROLE_PERMISSIONS['user'],
    isActive: true,
    mustChangePassword: false,
    createdAt: now
  };

  await usersCol.updateOne({ id: adminUser.id }, { $set: adminUser }, { upsert: true });
  await usersCol.updateOne({ id: aliceUser.id }, { $set: aliceUser }, { upsert: true });
  await usersCol.updateOne({ id: bobUser.id }, { $set: bobUser }, { upsert: true });

  const adminCookie = await loginUser(adminUser.email);
  const aliceCookie = await loginUser(aliceUser.email);
  const bobCookie = await loginUser(bobUser.email);

  // Set company description in settings
  await request('/api/settings/ai-writing-assistant', 'POST', {
    companyDescription: 'Outreach Flow provides next-generation multi-channel outbound automation and deliverability infrastructure for high-growth sales teams.',
    enabled: true
  }, adminCookie);

  // Create test campaign owned by Alice
  const testCampaignId = 'camp-about-test-101';
  const testCampaignName = 'Spring SaaS Founder Outreach';
  await campaignsCol.updateOne(
    { id: testCampaignId },
    {
      $set: {
        id: testCampaignId,
        name: testCampaignName,
        description: 'Targeting Series A founders in North America',
        aboutCampaign: '',
        version: 1,
        is_active: true,
        workflow_graph: { nodes: [], edges: [] },
        created_date: now,
        updated_date: now,
        ownerId: aliceUser.id,
        ownerName: aliceUser.name,
        lastEditedBy: aliceUser.name,
        lastEditedAt: now,
        versions: []
      }
    },
    { upsert: true }
  );

  console.log('\n--- TEST (a): Owner saves text and it persists after reload ---');
  const aliceAboutText = 'Describe the offer: Free 14-day pipeline architecture audit for Series A B2B founders. Goal: book a 15-min discovery call. AI should avoid promising custom integrations or discounts.';
  const saveRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: aliceAboutText
  }, aliceCookie);

  assert(saveRes.status === 200, 'Alice (owner) successfully saves text via POST /api/campaigns/:id/about');
  assert(saveRes.data.aboutCampaign === aliceAboutText, 'Response returns saved aboutCampaign text');
  assert(saveRes.data.lastEditedBy === aliceUser.name, `lastEditedBy is updated to "${aliceUser.name}"`);

  // Reload / GET campaign about info
  const getRes = await request(`/api/campaigns/${testCampaignId}/about`, 'GET', undefined, aliceCookie);
  assert(getRes.status === 200, 'GET /api/campaigns/:id/about returns 200');
  assert(getRes.data.aboutCampaign === aliceAboutText, 'aboutCampaign persists and matches saved text after reload');
  assert(getRes.data.canEdit === true, 'Owner sees canEdit: true');

  console.log('\n--- TEST (b): Non-owner gets 403 via API, sees read-only in canvas, admin can edit ---');
  // Bob tries to edit Alice's campaign directly through API
  const bobEditRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: 'Hacked by Bob'
  }, bobCookie);

  assert(bobEditRes.status === 403, 'Non-owner (Bob) gets 403 Forbidden via API');
  assert(
    typeof bobEditRes.data.error === 'string' && bobEditRes.data.error.includes(aliceUser.name),
    `403 error includes owner name: "${bobEditRes.data.error}"`
  );

  // Bob views the campaign via GET
  const bobGetRes = await request(`/api/campaigns/${testCampaignId}/about`, 'GET', undefined, bobCookie);
  assert(bobGetRes.status === 200, 'Bob can view the campaign info');
  assert(bobGetRes.data.canEdit === false, 'Bob sees canEdit: false (read-only in canvas)');
  assert(bobGetRes.data.ownerName === aliceUser.name, `Owner name displayed correctly: "${bobGetRes.data.ownerName}"`);

  // Admin edits the campaign
  const adminEditText = aliceAboutText + ' [Admin approved]';
  const adminEditRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: adminEditText
  }, adminCookie);

  assert(adminEditRes.status === 200, 'Admin can edit campaign about text (status 200)');
  assert(adminEditRes.data.aboutCampaign === adminEditText, 'Admin edit applied successfully');

  console.log('\n--- TEST (c): Exact prompt sent to model for lead with campaign ---');
  // Create lead with campaign
  const testLeadWithCamp = {
    leadId: 'lead-test-camp-888',
    name: 'David Vance',
    company: 'Apex Cloud',
    email: 'david.vance@apexcloud-test.com',
    painPoint: 'High cold email bounce rate and poor domain reputation',
    campaignId: testCampaignId,
    campaign: testCampaignName,
    ownerId: aliceUser.id,
    ownerName: aliceUser.name,
    status: 'Replied',
    notes: 'Hi, we are struggling with deliverability on our outbound campaigns. How do you help?'
  };
  await leadsCol.updateOne({ leadId: testLeadWithCamp.leadId }, { $set: testLeadWithCamp }, { upsert: true });

  const aiAssistResWithCamp = await request('/api/email/ai-assist', 'POST', {
    leadId: testLeadWithCamp.leadId,
    instruction: 'Thank them and suggest a brief call on Thursday',
    mode: 'write'
  }, aliceCookie);

  assert(aiAssistResWithCamp.status === 200, 'POST /api/email/ai-assist succeeds for lead with campaign');
  const promptWithCamp = aiAssistResWithCamp.data.promptText || '';
  assert(
    promptWithCamp.includes('=== CONTEXT (ABOUT OUR COMPANY) ==='),
    'Prompt contains "=== CONTEXT (ABOUT OUR COMPANY) ==="'
  );
  assert(
    promptWithCamp.includes(`=== CONTEXT (ABOUT THIS CAMPAIGN: ${testCampaignName}) ===`),
    `Prompt contains "=== CONTEXT (ABOUT THIS CAMPAIGN: ${testCampaignName}) ==="`
  );
  assert(
    promptWithCamp.includes('Free 14-day pipeline architecture audit'),
    'Prompt contains the exact campaign about text'
  );
  assert(
    promptWithCamp.includes('BACKGROUND CONFLICT RULE:'),
    'Prompt contains background conflict rule prioritizing campaign text'
  );

  console.log('\n>>> EXACT PROMPT EXTRACT (LEAD WITH CAMPAIGN):');
  console.log('----------------------------------------------------');
  const contextLines = promptWithCamp.split('\n').filter((l: string) => 
    l.includes('CONTEXT') || l.includes('Outreach Flow') || l.includes('pipeline architecture') || l.includes('Apex Cloud')
  ).slice(0, 10).join('\n');
  console.log(contextLines);
  console.log('----------------------------------------------------');

  console.log('\n--- TEST (d): Lead with no campaign omits the campaign part ---');
  const testLeadNoCamp = {
    leadId: 'lead-test-nocamp-999',
    name: 'Sarah Connor',
    company: 'Cyberdyne Systems',
    email: 'sarah.c@cyberdyne-test.com',
    painPoint: 'Security automation',
    campaignId: '',
    campaign: '',
    ownerId: aliceUser.id,
    ownerName: aliceUser.name,
    status: 'Replied',
    notes: 'Interested in learning more about your system.'
  };
  await leadsCol.updateOne({ leadId: testLeadNoCamp.leadId }, { $set: testLeadNoCamp }, { upsert: true });

  const aiAssistResNoCamp = await request('/api/email/ai-assist', 'POST', {
    leadId: testLeadNoCamp.leadId,
    instruction: 'Acknowledge interest and send product overview',
    mode: 'write'
  }, aliceCookie);

  assert(aiAssistResNoCamp.status === 200, 'POST /api/email/ai-assist succeeds for lead without campaign');
  const promptNoCamp = aiAssistResNoCamp.data.promptText || '';
  assert(
    promptNoCamp.includes('=== CONTEXT (ABOUT OUR COMPANY) ==='),
    'Prompt contains company context'
  );
  assert(
    !promptNoCamp.includes('=== CONTEXT (ABOUT THIS CAMPAIGN'),
    'Prompt OMITS campaign context section completely when lead has no campaign'
  );

  console.log('\n--- TEST (e): Duplicating a campaign copies the text ---');
  const dupRes = await request(`/api/campaigns/${testCampaignId}/duplicate`, 'POST', {
    name: 'Spring SaaS Founder Outreach (Duplicated Copy)'
  }, aliceCookie);

  assert(dupRes.status === 200, 'Duplicate campaign endpoint returns 200');
  const duplicatedCampaign = dupRes.data.campaign;
  assert(Boolean(duplicatedCampaign && duplicatedCampaign.id), 'Duplicated campaign created with new ID');
  assert(
    duplicatedCampaign.aboutCampaign === adminEditText,
    'Duplicated campaign has exact copy of aboutCampaign text'
  );
  assert(
    duplicatedCampaign.lastEditedBy === aliceUser.name,
    `Duplicated campaign records lastEditedBy: "${aliceUser.name}"`
  );
  assert(
    Boolean(duplicatedCampaign.lastEditedAt),
    `Duplicated campaign records lastEditedAt: "${duplicatedCampaign.lastEditedAt}"`
  );

  console.log('\n--- TEST (f): Editing the text does not show affected-leads warning ---');
  // Enroll active leads in campaign
  for (let i = 1; i <= 3; i++) {
    await leadsCol.updateOne(
      { leadId: `lead-impact-test-${i}` },
      {
        $set: {
          leadId: `lead-impact-test-${i}`,
          name: `Enrolled Lead #${i}`,
          campaignId: testCampaignId,
          status: 'Active',
          ownerId: i === 1 ? aliceUser.id : bobUser.id,
          ownerName: i === 1 ? aliceUser.name : bobUser.name
        }
      },
      { upsert: true }
    );
  }

  // Check impact API (which flow canvas calls before saving flow graph/schedule)
  const impactRes = await request(`/api/campaigns/${testCampaignId}/impact`, 'GET', undefined, aliceCookie);
  assert(impactRes.status === 200 && impactRes.data.totalActiveLeadsCount >= 3, 'Impact check indicates active leads would be affected if flow changed');

  // Verify POST /api/campaigns/:id/about saves directly WITHOUT requiring impact check / warning
  const updatedAboutDirect = 'Updated about text for campaign without flow alteration.';
  const aboutEditRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: updatedAboutDirect
  }, aliceCookie);

  assert(aboutEditRes.status === 200, 'POST /api/campaigns/:id/about executed directly without flow impact warning');
  assert(aboutEditRes.data.aboutCampaign === updatedAboutDirect, 'Text saved cleanly without touching workflow graph');

  console.log('\n--- TEST (g): 1,000 character limit enforced and HTML stripped ---');
  // Send HTML payload
  const dirtyHtml = '<p>Exclusive offer: <b>10% discount</b>.<script>alert("hack")</script><style>body {display:none;}</style> Visit <a href="https://example.com">here</a> &amp; save &pound;50.</p>';
  const htmlStripRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: dirtyHtml
  }, aliceCookie);

  assert(htmlStripRes.status === 200, 'HTML payload accepted for sanitization');
  const storedText = htmlStripRes.data.aboutCampaign;
  assert(!storedText.includes('<p>') && !storedText.includes('<b>') && !storedText.includes('<script>'), 'HTML tags stripped');
  assert(!storedText.includes('alert(') && !storedText.includes('display:none'), 'Script and style contents completely stripped');
  assert(storedText.includes('Exclusive offer: 10% discount.'), `Clean plain text preserved: "${storedText}"`);

  // Send > 1,000 characters
  const longPayload = 'A'.repeat(1005);
  const tooLongRes = await request(`/api/campaigns/${testCampaignId}/about`, 'POST', {
    aboutCampaign: longPayload
  }, aliceCookie);

  assert(tooLongRes.status === 400, 'Payload exceeding 1,000 characters rejected with status 400');
  assert(
    typeof tooLongRes.data.error === 'string' && tooLongRes.data.error.includes('1,000'),
    `Error message mentions 1,000 characters limit: "${tooLongRes.data.error}"`
  );

  console.log('\n--- TEST (h): AI panel "Using:" line shows right names ---');
  // Context for lead with campaign and info
  const ctxWithCampRes = await request(`/api/email/ai-assist/context?leadId=${testLeadWithCamp.leadId}`, 'GET', undefined, aliceCookie);
  assert(ctxWithCampRes.status === 200, 'GET /api/email/ai-assist/context returns 200');
  assert(ctxWithCampRes.data.campaignName === testCampaignName, `Context has campaignName: "${ctxWithCampRes.data.campaignName}"`);
  assert(ctxWithCampRes.data.hasCompanyInfo === true, 'Context has hasCompanyInfo: true');
  assert(ctxWithCampRes.data.hasCampaignInfo === true, 'Context has hasCampaignInfo: true');

  // Format string check for UI
  const formatUsingLine = (ctx: any) => {
    let parts: string[] = [];
    if (ctx.hasCompanyInfo) parts.push('company info');
    if (ctx.campaignName) {
      if (ctx.hasCampaignInfo) parts.push(`campaign '${ctx.campaignName}' info`);
      else parts.push('No campaign info set');
    }
    return `Using: ${parts.join(' + ')}`;
  };

  const lineWithCamp = formatUsingLine(ctxWithCampRes.data);
  assert(
    lineWithCamp === `Using: company info + campaign '${testCampaignName}' info`,
    `Panel line correctly formatted: "${lineWithCamp}"`
  );

  // Context for lead without campaign info (clear aboutCampaign)
  await campaignsCol.updateOne({ id: testCampaignId }, { $set: { aboutCampaign: '' } });
  const ctxEmptyCampRes = await request(`/api/email/ai-assist/context?leadId=${testLeadWithCamp.leadId}`, 'GET', undefined, aliceCookie);
  const lineEmptyCamp = formatUsingLine(ctxEmptyCampRes.data);
  assert(
    lineEmptyCamp === "Using: company info + No campaign info set",
    `Panel line for empty campaign correctly formatted: "${lineEmptyCamp}"`
  );

  // Context for lead with no campaign assigned
  const ctxNoCampRes = await request(`/api/email/ai-assist/context?leadId=${testLeadNoCamp.leadId}`, 'GET', undefined, aliceCookie);
  const lineNoCamp = formatUsingLine(ctxNoCampRes.data);
  assert(
    lineNoCamp === "Using: company info",
    `Panel line for lead without campaign correctly formatted: "${lineNoCamp}"`
  );

  // Clean up test leads and campaigns
  await leadsCol.deleteMany({ leadId: { $regex: /^(lead-test|lead-impact-test)/ } });
  await campaignsCol.deleteMany({ id: { $regex: /^camp-about-test/ } });
  await usersCol.deleteMany({ id: { $regex: /^user-(admin|alice|bob)-about-test/ } });

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
