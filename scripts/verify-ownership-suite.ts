/**
 * scripts/verify-ownership-suite.ts
 *
 * Full-stack multi-tenant data ownership, resource scoping, role-based permissions,
 * and deny-by-default route enforcement verification suite.
 */

import { MongoClient } from 'mongodb';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { hashPassword } from '../server/auth.ts';

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

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failedCount++;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('   GINI OUTREACH FLOW: OWNERSHIP & PERMISSIONS VERIFICATION     ');
  console.log('================================================================\n');

  const db = await getDb();
  const usersCol = db.collection(COLLECTIONS.USERS);
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const tasksCol = db.collection(COLLECTIONS.TASKS);

  // 1. Setup Test Users: Admin, User 1 (Alice), User 2 (Bob), User 3 (Charlie)
  console.log('Phase 0: Provisioning Test Accounts...');
  const hashedPassword = await hashPassword('TestUser123!');

  const userAlice = {
    id: 'user-alice-test',
    email: 'alice.test@example.com',
    name: 'Alice Cooper',
    role: 'user',
    permissions: ['leads.create', 'leads.edit', 'leads.delete', 'campaigns.create', 'campaigns.edit'],
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    passwordHash: hashedPassword
  };

  const userBob = {
    id: 'user-bob-test',
    email: 'bob.test@example.com',
    name: 'Bob Marley',
    role: 'user',
    permissions: ['leads.create', 'leads.edit', 'leads.delete', 'campaigns.create', 'campaigns.edit'],
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    passwordHash: hashedPassword
  };

  const userCharlie = {
    id: 'user-charlie-test',
    email: 'charlie.test@example.com',
    name: 'Charlie Chaplin',
    role: 'user',
    permissions: ['leads.create'],
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    passwordHash: hashedPassword
  };

  await usersCol.updateOne({ id: userAlice.id }, { $set: userAlice }, { upsert: true });
  await usersCol.updateOne({ id: userBob.id }, { $set: userBob }, { upsert: true });
  await usersCol.updateOne({ id: userCharlie.id }, { $set: userCharlie }, { upsert: true });

  const adminCookie = await loginUser('admin@example.com', 'AdminPassword123!');
  const aliceCookie = await loginUser(userAlice.email);
  const bobCookie = await loginUser(userBob.email);
  const charlieCookie = await loginUser(userCharlie.email);

  console.log('Test accounts logged in successfully.\n');

  // ===========================================================================
  // TEST 1: Lead Ownership & Cross-Owner Duplicate Check
  // ===========================================================================
  console.log('Test 1: Lead Ownership & Cross-Owner Duplicate Email Check...');
  const leadAlphaEmail = `alpha-${Date.now()}@acme-corp.com`;
  const leadAlphaId = `LEAD-ALICE-${Date.now()}`;

  // Alice creates lead
  const createLeadRes = await request('/api/leads/create', 'POST', {
    leadId: leadAlphaId,
    name: 'Alpha Prospect',
    email: leadAlphaEmail,
    company: 'Acme Global Holdings',
    status: 'Active',
    currentStage: 1
  }, aliceCookie);

  assert(createLeadRes.status === 200 && createLeadRes.data.success, 'Alice successfully created lead Alpha');
  const storedLead = await leadsCol.findOne({ leadId: leadAlphaId }) as any;
  assert(storedLead && storedLead.ownerId === userAlice.id, `Lead Alpha has ownerId: ${storedLead?.ownerId}`);
  assert(storedLead && storedLead.ownerName === userAlice.name, `Lead Alpha has ownerName: ${storedLead?.ownerName}`);
  assert(storedLead && storedLead.lastModifiedBy === userAlice.name, `Lead Alpha has lastModifiedBy: ${storedLead?.lastModifiedBy}`);

  // Bob attempts duplicate creation: must return 409 with exact generic message
  const bobDupRes = await request('/api/leads/create', 'POST', {
    leadId: `LEAD-BOB-DUP-${Date.now()}`,
    name: 'Duplicate Alpha',
    email: leadAlphaEmail,
    company: 'Acme Global Holdings'
  }, bobCookie);

  assert(bobDupRes.status === 409, `Bob duplicate creation rejected with status 409 (got ${bobDupRes.status})`);
  assert(
    bobDupRes.data.error === 'This contact already exists in the system',
    `Bob sees generic message without leaking owner info: "${bobDupRes.data.error}"`
  );

  // Admin attempts duplicate creation: must return 409 with owner info revealed
  const adminDupRes = await request('/api/leads/create', 'POST', {
    leadId: `LEAD-ADMIN-DUP-${Date.now()}`,
    name: 'Admin Duplicate Alpha',
    email: leadAlphaEmail,
    company: 'Acme Global Holdings'
  }, adminCookie);

  assert(adminDupRes.status === 409, `Admin duplicate creation returns status 409`);
  assert(
    adminDupRes.data.error && adminDupRes.data.error.includes(userAlice.name),
    `Admin duplicate error reveals existing owner name: "${adminDupRes.data.error}"`
  );

  console.log('');

  // ===========================================================================
  // TEST 2: Server-Side Scoping on Lead List
  // ===========================================================================
  console.log('Test 2: Server-Side Scoping on Lead List...');
  const leadBobId = `LEAD-BOB-${Date.now()}`;
  const leadBobEmail = `boblead-${Date.now()}@omega-systems.com`;
  await request('/api/leads/create', 'POST', {
    leadId: leadBobId,
    name: 'Bob Prospect',
    email: leadBobEmail,
    company: 'Omega Systems',
    status: 'Active',
    currentStage: 1
  }, bobCookie);

  const aliceList = await request('/api/leads', 'GET', undefined, aliceCookie);
  const bobList = await request('/api/leads', 'GET', undefined, bobCookie);
  const adminList = await request('/api/leads', 'GET', undefined, adminCookie);

  const aliceHasAliceLead = aliceList.data.leads.some((l: any) => l.leadId === leadAlphaId);
  const aliceHasBobLead = aliceList.data.leads.some((l: any) => l.leadId === leadBobId);
  const bobHasBobLead = bobList.data.leads.some((l: any) => l.leadId === leadBobId);
  const bobHasAliceLead = bobList.data.leads.some((l: any) => l.leadId === leadAlphaId);
  const adminHasBoth = adminList.data.leads.some((l: any) => l.leadId === leadAlphaId) &&
                       adminList.data.leads.some((l: any) => l.leadId === leadBobId);

  assert(aliceHasAliceLead && !aliceHasBobLead, 'Alice sees only her own leads and NOT Bob leads');
  assert(bobHasBobLead && !bobHasAliceLead, 'Bob sees only his own leads and NOT Alice leads');
  assert(adminHasBoth, 'Admin sees leads across all owners');

  console.log('');

  // ===========================================================================
  // TEST 3: Single-Record 404 Enforcement & Graph Protection
  // ===========================================================================
  console.log('Test 3: Single-Record 404 Enforcement & Graph Protection...');
  // Bob tries to update Alice's lead -> 404
  const bobUpdateRes = await request('/api/leads/update', 'POST', {
    lead: { leadId: leadAlphaId, name: 'Hacked Alpha' }
  }, bobCookie);
  assert(bobUpdateRes.status === 404, `Bob updating Alice lead returns 404 (got ${bobUpdateRes.status})`);

  // Bob tries to delete Alice's lead -> 404
  const bobDeleteRes = await request('/api/leads/delete', 'POST', {
    leadId: leadAlphaId
  }, bobCookie);
  assert(bobDeleteRes.status === 404, `Bob deleting Alice lead returns 404 (got ${bobDeleteRes.status})`);

  // Bob tries to get conversation thread for Alice's lead -> 404 before Graph call
  const bobThreadRes = await request(`/api/email/thread?leadId=${leadAlphaId}`, 'GET', undefined, bobCookie);
  assert(bobThreadRes.status === 404, `Bob accessing Alice lead email thread returns 404 (got ${bobThreadRes.status})`);

  // Bob tries to check reply for Alice's lead -> 404 before Graph call
  const bobCheckReplyRes = await request('/api/email/check-reply', 'POST', {
    leadId: leadAlphaId
  }, bobCookie);
  assert(bobCheckReplyRes.status === 404, `Bob checking reply for Alice lead returns 404 (got ${bobCheckReplyRes.status})`);

  // Bob tries to send stage email for Alice's lead -> 404 before Graph call
  const bobSendStageRes = await request('/api/email/send-stage', 'POST', {
    lead: { leadId: leadAlphaId, email: leadAlphaEmail },
    stageNum: 1
  }, bobCookie);
  assert(bobSendStageRes.status === 404, `Bob sending stage email for Alice lead returns 404 (got ${bobSendStageRes.status})`);

  // Bob tries to mark unread reply read on Alice's lead -> 404
  const bobMarkReadRes = await request('/api/leads/mark-reply-read', 'POST', {
    leadId: leadAlphaId,
    email: leadAlphaEmail
  }, bobCookie);
  assert(bobMarkReadRes.status === 404, `Bob marking reply read on Alice lead returns 404 (got ${bobMarkReadRes.status})`);

  console.log('');

  // ===========================================================================
  // TEST 4: Campaign Ownership, Versioning & Deletion Safeguard
  // ===========================================================================
  console.log('Test 4: Campaign Ownership, Version History & Enrolled Lead Delete Guard...');
  const campId = `camp-alice-${Date.now()}`;
  const saveCampRes = await request('/api/campaigns/save', 'POST', {
    campaign: {
      id: campId,
      name: 'Alice Growth Campaign',
      workflow_graph: { nodes: [{ id: '1', type: 'email' }], edges: [] }
    }
  }, aliceCookie);

  assert(saveCampRes.status === 200 && saveCampRes.data.success, 'Alice saved initial campaign');
  let campDoc = await campaignsCol.findOne({ id: campId }) as any;
  assert(campDoc && campDoc.ownerId === userAlice.id, `Campaign ownerId is Alice: ${campDoc?.ownerId}`);
  assert(campDoc && campDoc.version === 1, `Campaign initial version is 1: ${campDoc?.version}`);

  // Alice edits campaign to version 2
  await request('/api/campaigns/save', 'POST', {
    campaign: {
      id: campId,
      name: 'Alice Growth Campaign v2',
      workflow_graph: { nodes: [{ id: '1', type: 'email' }, { id: '2', type: 'wait' }], edges: [] }
    }
  }, aliceCookie);

  campDoc = await campaignsCol.findOne({ id: campId }) as any;
  assert(campDoc && campDoc.version === 2, `Campaign version bumped to 2: ${campDoc?.version}`);
  assert(campDoc && campDoc.versions?.length === 1, `Versions array contains 1 prior snapshot`);
  assert(campDoc?.versions[0]?.version === 1, `Snapshot in versions is version 1`);

  // Restore version 1
  const restoreRes = await request(`/api/campaigns/${campId}/restore`, 'POST', { version: 1 }, aliceCookie);
  assert(restoreRes.status === 200 && restoreRes.data.success, 'Restore version 1 succeeded');
  campDoc = await campaignsCol.findOne({ id: campId }) as any;
  assert(campDoc && campDoc.name === 'Alice Growth Campaign', `Campaign name restored to v1: "${campDoc?.name}"`);

  // Enroll active lead into campaign and verify deletion is BLOCKED (400)
  await leadsCol.updateOne({ leadId: leadAlphaId }, { $set: { campaignId: campId, status: 'Active' } });
  const deleteCampBlocked = await request('/api/campaigns/delete', 'POST', { campaignId: campId }, aliceCookie);
  assert(deleteCampBlocked.status === 400, `Deleting campaign with active enrolled leads blocked with 400 (got ${deleteCampBlocked.status})`);
  assert(
    deleteCampBlocked.data.error?.includes('Cannot delete campaign with active enrolled leads'),
    `Error message explains enrolled leads: "${deleteCampBlocked.data.error}"`
  );

  // Bob duplicates Alice's campaign -> Bob owns copy
  const dupRes = await request(`/api/campaigns/${campId}/duplicate`, 'POST', {}, bobCookie);
  assert(dupRes.status === 200 && dupRes.data.success, 'Bob duplicated Alice campaign');
  const bobCopy = dupRes.data.campaign;
  assert(bobCopy && bobCopy.ownerId === userBob.id, `Duplicated campaign belongs to Bob: ${bobCopy?.ownerId}`);

  // Colleague impact endpoint check
  const impactRes = await request(`/api/campaigns/${campId}/impact`, 'GET', undefined, bobCookie);
  assert(impactRes.status === 200 && impactRes.data.colleagueLeadsCount === 1, `Impact returns 1 active colleague lead (got ${impactRes.data.colleagueLeadsCount})`);

  console.log('');

  // ===========================================================================
  // TEST 5: Lead Reassignment & User Deletion
  // ===========================================================================
  console.log('Test 5: Lead Reassignment & Deleting User With Reassignment...');
  // Admin reassigns Alice's lead Alpha to Bob
  const reassignRes = await request(`/api/leads/${leadAlphaId}/reassign`, 'POST', {
    targetUserId: userBob.id
  }, adminCookie);

  assert(reassignRes.status === 200 && reassignRes.data.success, 'Admin reassigned lead Alpha to Bob');
  const reassignedLead = await leadsCol.findOne({ leadId: leadAlphaId }) as any;
  assert(reassignedLead && reassignedLead.ownerId === userBob.id, `Lead ownerId changed to Bob: ${reassignedLead?.ownerId}`);
  assert(
    reassignedLead && reassignedLead.notes?.includes(`[Reassigned from ${userAlice.name}`),
    `Audit trail appended to lead notes: "${reassignedLead?.notes}"`
  );

  // Reassign to invalid user returns 400
  const invalidReassign = await request(`/api/leads/${leadAlphaId}/reassign`, 'POST', {
    targetUserId: 'non-existent-user-id'
  }, adminCookie);
  assert(invalidReassign.status === 400, `Reassigning to non-existent user returns 400 (got ${invalidReassign.status})`);

  // Charlie creates a lead to test user deletion requirement
  const charlieLeadId = `LEAD-CHARLIE-${Date.now()}`;
  await request('/api/leads/create', 'POST', {
    leadId: charlieLeadId,
    name: 'Charlie Prospect',
    email: `charlielead-${Date.now()}@beta.com`,
    company: 'Beta Corp'
  }, charlieCookie);

  // Deleting Charlie WITHOUT replacement user -> 400
  const deleteNoReplacement = await request(`/api/users/${userCharlie.id}`, 'DELETE', undefined, adminCookie);
  assert(deleteNoReplacement.status === 400, `Deleting user without replacement user returns 400 (got ${deleteNoReplacement.status})`);

  // Deleting Charlie WITH replacement user (Bob) -> 200 & reassigns Charlie's leads
  const deleteWithReplacement = await request(
    `/api/users/${userCharlie.id}?reassignToUserId=${userBob.id}`,
    'DELETE',
    undefined,
    adminCookie
  );
  assert(deleteWithReplacement.status === 200 && deleteWithReplacement.data.success, 'Deleting user with replacement succeeds');
  const charlieStoredLead = await leadsCol.findOne({ leadId: charlieLeadId }) as any;
  assert(charlieStoredLead && charlieStoredLead.ownerId === userBob.id, `Charlie lead reassigned to Bob: ${charlieStoredLead?.ownerId}`);

  console.log('');

  // ===========================================================================
  // TEST 6: Per-Browser Data in MongoDB (Workspace Notes & Alerts)
  // ===========================================================================
  console.log('Test 6: Per-Browser Notes and Alerts Persisted in MongoDB...');
  // Alice saves workspace notes
  await request('/api/user-state/notes', 'POST', {
    notes: 'Alice private strategic scratchpad'
  }, aliceCookie);

  // Bob saves workspace notes
  await request('/api/user-state/notes', 'POST', {
    notes: 'Bob private tactical scratchpad'
  }, bobCookie);

  // Verify Alice gets only Alice notes and Bob gets only Bob notes
  const aliceNotesRes = await request('/api/user-state/notes', 'GET', undefined, aliceCookie);
  const bobNotesRes = await request('/api/user-state/notes', 'GET', undefined, bobCookie);
  assert(aliceNotesRes.data.notes === 'Alice private strategic scratchpad', 'Alice retrieves her private notes');
  assert(bobNotesRes.data.notes === 'Bob private tactical scratchpad', 'Bob retrieves his private notes');

  // Verify Alert dismissed states
  await request('/api/user-state/alerts', 'POST', {
    dismissedIds: ['alert-task-1', 'alert-reply-2']
  }, aliceCookie);

  const aliceAlertsRes = await request('/api/user-state/alerts', 'GET', undefined, aliceCookie);
  const bobAlertsRes = await request('/api/user-state/alerts', 'GET', undefined, bobCookie);
  assert(
    aliceAlertsRes.data.dismissedAlertIds?.includes('alert-task-1'),
    'Alice retrieves her dismissed alert state'
  );
  assert(
    bobAlertsRes.data.dismissedAlertIds?.length === 0,
    'Bob does not see Alice dismissed alerts'
  );

  console.log('');

  // ===========================================================================
  // TEST 7: Company Pause / Resume Across Owners (Count-Only for Non-Admin)
  // ===========================================================================
  console.log('Test 7: Company Pause / Resume (Requirement 1)...');
  const compLead1Id = `LEAD-COMP-ALICE-${Date.now()}`;
  const compLead2Id = `LEAD-COMP-BOB-${Date.now()}`;
  const companyTarget = `TargetCo-${Date.now()}`;
  const companyDomain = `targetco-${Date.now()}.com`;

  // Alice creates lead at company
  await request('/api/leads/create', 'POST', {
    leadId: compLead1Id,
    name: 'Alice Contact at TargetCo',
    email: `alice-c-${Date.now()}@${companyDomain}`,
    company: companyTarget,
    status: 'Active'
  }, aliceCookie);

  // Bob creates lead at same company
  await request('/api/leads/create', 'POST', {
    leadId: compLead2Id,
    name: 'Bob Contact at TargetCo',
    email: `bob-c-${Date.now()}@${companyDomain}`,
    company: companyTarget,
    status: 'Active'
  }, bobCookie);

  // Alice confirms company pause: authorized because Alice owns lead 1 at TargetCo
  const pauseRes = await request('/api/leads/confirm-company-pause', 'POST', {
    leadId: compLead1Id,
    company: companyTarget,
    candidateLeadIds: [compLead1Id, compLead2Id]
  }, aliceCookie);

  assert(pauseRes.status === 200 && pauseRes.data.success, 'Alice successfully triggered company pause');
  assert(pauseRes.data.count === 2, `Company pause affected 2 leads: ${pauseRes.data.count}`);
  assert(!pauseRes.data.colleagues && !pauseRes.data.leads, 'Non-admin receives count only without colleague names or leads');

  const compLead1Doc = await leadsCol.findOne({ leadId: compLead1Id }) as any;
  const compLead2Doc = await leadsCol.findOne({ leadId: compLead2Id }) as any;
  assert(compLead1Doc.status === 'Paused' && compLead2Doc.status === 'Paused', 'Both Alice and Bob leads are now Paused');

  // Alice resumes company
  const resumeRes = await request('/api/leads/resume-company', 'POST', {
    company: companyTarget,
    leadId: compLead1Id
  }, aliceCookie);

  assert(resumeRes.status === 200 && resumeRes.data.success, 'Alice successfully triggered resume company');
  assert(resumeRes.data.count === 2, `Company resume affected 2 leads: ${resumeRes.data.count}`);
  assert(!resumeRes.data.colleagues && !resumeRes.data.leads, 'Non-admin resume returns count only');

  console.log('');

  // ===========================================================================
  // TEST 8: Safeguards & Deny-by-Default (Requirements 2, 3, 5, 6)
  // ===========================================================================
  console.log('Test 8: Test Send, Track Event, Reply Rules Preview & Deny-by-Default...');
  // 8a. /api/email/test-send is admin-only
  const userTestSend = await request('/api/email/test-send', 'POST', { to: 'test@example.com' }, aliceCookie);
  assert(userTestSend.status === 403, `/api/email/test-send returns 403 for normal user (got ${userTestSend.status})`);

  // 8b. /api/track/event is admin-only
  const userTrackEvent = await request('/api/track/event', 'POST', { type: 'test' }, aliceCookie);
  assert(userTrackEvent.status === 403, `/api/track/event returns 403 for normal user (got ${userTrackEvent.status})`);

  // 8c. /api/reply-rules/preview-recent is admin-only
  const userPreviewRules = await request('/api/reply-rules/preview-recent', 'GET', undefined, aliceCookie);
  assert(userPreviewRules.status === 403, `/api/reply-rules/preview-recent returns 403 for normal user (got ${userPreviewRules.status})`);

  // 8d. Deny-by-default for unlisted / unknown /api route:
  // Normal user calling unknown route -> 403 Forbidden
  const unknownRouteUser = await request('/api/some-unregistered-service/do-something', 'GET', undefined, aliceCookie);
  assert(unknownRouteUser.status === 403, `Unregistered route returns 403 for normal user (got ${unknownRouteUser.status})`);

  // Admin calling unknown route -> 404 (because admin passed requireAdmin gate, but route does not exist)
  const unknownRouteAdmin = await request('/api/some-unregistered-service/do-something', 'GET', undefined, adminCookie);
  assert(unknownRouteAdmin.status === 404, `Unregistered route returns 404 for admin (got ${unknownRouteAdmin.status})`);

  // Cleanup test users, leads, and campaigns
  await usersCol.deleteMany({ id: { $in: [userAlice.id, userBob.id, userCharlie.id] } });
  await leadsCol.deleteMany({ leadId: { $in: [leadAlphaId, leadBobId, charlieLeadId, compLead1Id, compLead2Id] } });
  if (campId) await campaignsCol.deleteMany({ id: { $in: [campId, bobCopy?.id].filter(Boolean) } });

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
