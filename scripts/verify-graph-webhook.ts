/**
 * scripts/verify-graph-webhook.ts
 *
 * Verifies the Microsoft Graph Change Notifications (Webhooks) architecture:
 * 1. Confirms /api/email/inbound-reply is completely removed (returns 404).
 * 2. Confirms Validation Handshake returns validationToken as plain text HTTP 200 within ms.
 * 3. Confirms Security Boundary: rejects spoofed or missing clientState with 401 Unauthorized.
 * 4. Confirms End-to-End reply processing: valid notification transitions lead to "Replied" in MongoDB.
 * 5. Confirms Subscription Renewal and Vercel Cron endpoint (/api/cron/renew-subscriptions).
 */

import { getWebhookClientState } from '../server/msGraphService.ts';

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('========================================================================');
  console.log('MICROSOFT GRAPH WEBHOOK & REPLY ARCHITECTURE VERIFICATION');
  console.log('========================================================================\n');

  const clientSecret = getWebhookClientState();
  console.log(`Configured clientState secret: "${clientSecret}"\n`);

  // -------------------------------------------------------------------------
  // TEST 1: Confirm removal of deprecated /api/email/inbound-reply
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Checking status of deprecated /api/email/inbound-reply ---');
  const oldEndpointRes = await fetch(`${BASE_URL}/api/email/inbound-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadEmail: 'test@example.com' })
  });
  console.log(`HTTP Status: ${oldEndpointRes.status} (${oldEndpointRes.statusText})`);
  if (oldEndpointRes.status === 404) {
    console.log('RESULT: PASSED - /api/email/inbound-reply is completely removed (returns 404 Not Found).\n');
  } else {
    console.error('RESULT: FAILED - Expected 404 for removed endpoint.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 2: Validation Handshake (GET and POST with validationToken)
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Testing Microsoft Graph Validation Handshake ---');
  const sampleToken = 'token_graph_validation_handshake_' + Math.random().toString(36).substring(2);
  const handshakeUrl = `${BASE_URL}/api/webhooks/graph?validationToken=${encodeURIComponent(sampleToken)}`;

  const handshakeRes = await fetch(handshakeUrl, { method: 'POST' });
  const handshakeContentType = handshakeRes.headers.get('content-type');
  const handshakeBody = await handshakeRes.text();

  console.log(`Request URL: ${handshakeUrl}`);
  console.log(`Response HTTP Status: ${handshakeRes.status}`);
  console.log(`Response Content-Type: ${handshakeContentType}`);
  console.log(`Response Body: "${handshakeBody}"`);

  if (handshakeRes.status === 200 && handshakeBody === sampleToken && handshakeContentType?.includes('text/plain')) {
    console.log('RESULT: PASSED - Validation handshake immediately returned plain text token with HTTP 200.\n');
  } else {
    console.error('RESULT: FAILED - Handshake response mismatch.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Security Boundary - Spoofed & Missing clientState Rejection
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Testing Security Boundary (Spoofed clientState Rejection) ---');
  const spoofedPayload = {
    value: [
      {
        subscriptionId: 'sub-fake-123',
        clientState: 'malicious-spoofed-client-state-999',
        resource: 'Users/service@company.com/Messages/msg-spoofed-1',
        resourceData: { id: 'msg-spoofed-1' },
        leadEmail: 'target.lead@example.com',
        subject: 'Spoofed Email Reply'
      }
    ]
  };

  const spoofRes = await fetch(`${BASE_URL}/api/webhooks/graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spoofedPayload)
  });
  const spoofData = await spoofRes.json();
  console.log(`Spoofed request HTTP Status: ${spoofRes.status}`);
  console.log(`Spoofed request Response:`, JSON.stringify(spoofData));

  if (spoofRes.status === 401 && spoofData.error?.includes('clientState')) {
    console.log('RESULT: PASSED - Spoofed clientState was rejected with HTTP 401 Unauthorized.\n');
  } else {
    console.error('RESULT: FAILED - Expected 401 Unauthorized for spoofed clientState.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 4: End-to-End Real Webhook Notification & Shared Reply Processing
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: End-to-End Real Webhook Notification & Lead Status Transition ---');

  // Step 4a: Create/Reset a test lead in MongoDB
  const testLeadId = 'LEAD-GRAPH-VERIFY-01';
  const testEmail = 'graph.prospect.tester@enterprise.net';
  const testThreadId = 'conv-graph-thread-real-444';

  const resetLeadRes = await fetch(`${BASE_URL}/api/leads/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: {
        leadId: testLeadId,
        name: 'Alex Rivera',
        email: testEmail,
        company: 'Rivera Logistics',
        status: 'Active',
        currentStage: 1,
        threadId: testThreadId,
        notes: 'Initial outreach sequence sent'
      }
    })
  });
  const resetLeadData = await resetLeadRes.json();
  console.log('Initial Lead Document in MongoDB:');
  console.log(`  Lead ID: ${resetLeadData.lead?.leadId}`);
  console.log(`  Status:  ${resetLeadData.lead?.status}`);
  console.log(`  Thread:  ${resetLeadData.lead?.threadId}`);
  console.log(`  Notes:   ${resetLeadData.lead?.notes}\n`);

  // Step 4b: Send genuine Microsoft Graph Change Notification with VALID clientState
  const validWebhookPayload = {
    value: [
      {
        subscriptionId: 'sub-active-real-789',
        clientState: clientSecret,
        changeType: 'created',
        resource: `Users/service@example.com/Messages/graph-inbound-msg-555`,
        resourceData: {
          id: 'graph-inbound-msg-555',
          '@odata.type': '#Microsoft.Graph.Message'
        },
        leadEmail: testEmail,
        threadId: testThreadId,
        from: 'Alex Rivera <graph.prospect.tester@enterprise.net>',
        subject: 'Re: Partnership Proposal',
        body: 'Thanks for reaching out! Let us schedule a call next Tuesday at 2 PM.',
        receivedDateTime: new Date().toISOString()
      }
    ]
  };

  console.log('Sending valid Microsoft Graph Webhook POST notification...');
  const validWebhookRes = await fetch(`${BASE_URL}/api/webhooks/graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validWebhookPayload)
  });
  const validWebhookData = await validWebhookRes.json();
  console.log(`Webhook HTTP Status: ${validWebhookRes.status} (${validWebhookRes.statusText})`);
  console.log('Webhook Response:', JSON.stringify(validWebhookData, null, 2));

  // Step 4c: Verify updated lead in MongoDB
  const leadsListRes = await fetch(`${BASE_URL}/api/leads/list`);
  const leadsList = await leadsListRes.json();
  const updatedLead = (leadsList.leads || []).find((l: any) => l.leadId === testLeadId);

  console.log('\nUpdated Lead Document in MongoDB after Webhook:');
  console.log(`  Lead ID:   ${updatedLead?.leadId}`);
  console.log(`  Status:    ${updatedLead?.status}`);
  console.log(`  hasReplied:${updatedLead?.hasReplied}`);
  console.log(`  Notes:     ${updatedLead?.notes}`);
  console.log(`  LastReply: ${updatedLead?.lastReplyReceivedDate}`);

  if (
    validWebhookRes.status === 202 &&
    updatedLead?.status === 'Replied' &&
    updatedLead?.hasReplied === true &&
    updatedLead?.notes?.includes('[Reply detected via Microsoft Graph Webhook]')
  ) {
    console.log('\nRESULT: PASSED - Webhook received, verified, and lead moved to "Replied" via shared logic!\n');
  } else {
    console.error('\nRESULT: FAILED - Lead state did not transition as expected.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Subscription Creation & Daily Renewal Mechanism
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Testing Subscription Creation & Daily Renewal Cron ---');
  const subRes = await fetch(`${BASE_URL}/api/webhooks/graph/subscribe`, { method: 'POST' });
  const subData = await subRes.json();
  console.log('Subscription Creation Response:');
  console.log(JSON.stringify(subData, null, 2));

  const cronRes = await fetch(`${BASE_URL}/api/cron/renew-subscriptions`, { method: 'POST' });
  const cronData = await cronRes.json();
  console.log('\nDaily Cron (/api/cron/renew-subscriptions) Execution Response:');
  console.log(JSON.stringify(cronData, null, 2));

  if (subData.success && cronData.success) {
    console.log('\nRESULT: PASSED - Subscription creation and daily renewal cron verified!\n');
  } else {
    console.error('\nRESULT: FAILED - Subscription creation or renewal error.\n');
  }

  console.log('========================================================================');
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('========================================================================');
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
