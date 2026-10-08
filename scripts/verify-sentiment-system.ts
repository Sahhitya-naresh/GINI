import { classifyReply, cleanReplyText } from '../server/replyRules.ts';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('======================================================================');
  console.log('RULE-BASED SENTIMENT CLASSIFICATION & ACTIONS VERIFICATION SUITE');
  console.log('======================================================================\n');

  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const settingsCol = db.collection(COLLECTIONS.SETTINGS);

  // -------------------------------------------------------------------------
  // (a) RUN AT LEAST 20 SAMPLE REPLY TEXTS THROUGH classifyReply IN A TABLE
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------------');
  console.log('(a) 20+ SAMPLE REPLY TEXTS CLASSIFICATION EVALUATION TABLE');
  console.log('----------------------------------------------------------------------\n');

  interface TestCase {
    name: string;
    subject: string;
    body: string;
    expected: 'positive' | 'negative' | 'neutral';
  }

  const testCases: TestCase[] = [
    {
      name: 'Clear Yes',
      subject: 'Re: Outreach demo',
      body: 'Yes, I would love to connect this week.',
      expected: 'positive'
    },
    {
      name: 'Clear No',
      subject: 'Re: Quick inquiry',
      body: 'No, stop emailing me.',
      expected: 'negative'
    },
    {
      name: 'Not interested',
      subject: 'Re: Partnership',
      body: 'Thank you for reaching out, but I am not interested.',
      expected: 'negative'
    },
    {
      name: 'Interested, send pricing',
      subject: 'Re: Software pricing',
      body: 'Sounds good, interested, send pricing please.',
      expected: 'positive'
    },
    {
      name: 'Not interested in waiting, call me (tricky)',
      subject: 'Re: Demo schedule',
      body: "I'm not interested in waiting, call me as soon as you get this.",
      expected: 'positive'
    },
    {
      name: 'Not now, maybe next quarter',
      subject: 'Re: Follow up',
      body: 'Not now, maybe next quarter when our budget frees up.',
      expected: 'neutral'
    },
    {
      name: 'Out-of-office autoreply',
      subject: 'Automatic reply: Out of office',
      body: 'I am currently out of the office on annual leave until next Monday with no email access.',
      expected: 'neutral'
    },
    {
      name: 'Delivery failure notice',
      subject: 'Delivery Status Notification (Failure)',
      body: 'The following message was undeliverable to the recipient. Mailbox is full or inactive.',
      expected: 'neutral'
    },
    {
      name: 'Please remove me',
      subject: 'Re: Outreach',
      body: 'Please remove me from your mailing list immediately.',
      expected: 'negative'
    },
    {
      name: 'Plain question',
      subject: 'Re: Integration capabilities',
      body: 'What kind of CRM integrations does your platform currently support?',
      expected: 'neutral'
    },
    {
      name: 'Polite decline',
      subject: 'Re: Follow up',
      body: 'No thank you, we already have an internal solution handling this.',
      expected: 'negative'
    },
    {
      name: 'Forward to colleague',
      subject: 'Re: Introduction',
      body: 'I am looping in Sarah from procurement to review this.',
      expected: 'neutral'
    },
    {
      name: 'Reply with long quoted history',
      subject: 'Re: Our discussion',
      body: `Sounds great, let's chat tomorrow morning.\n\nOn Mon, Oct 5, 2026 at 10:15 AM Outreach <sales@giniiris.ai> wrote:\n> Stop emailing if you are not interested.\n> Unsubscribe immediately to avoid penalties.`,
      expected: 'positive'
    },
    {
      name: 'Schedule a demo',
      subject: 'Re: Product overview',
      body: "Let's schedule a demo next Wednesday afternoon.",
      expected: 'positive'
    },
    {
      name: 'Tell me more',
      subject: 'Re: Cold outreach',
      body: 'Looks very interesting, tell me more about your enterprise tier.',
      expected: 'positive'
    },
    {
      name: 'Do not contact / spam',
      subject: 'Re: Unwanted email',
      body: 'Do not contact me again, this is spam and I am reporting it.',
      expected: 'negative'
    },
    {
      name: 'Deferral: bad timing',
      subject: 'Re: Introduction',
      body: 'Bad timing right now as we are closing our fiscal year. Circle back in Q1.',
      expected: 'neutral'
    },
    {
      name: 'Negation guard on positive words',
      subject: 'Re: Quick chat',
      body: 'I will never connect with your team and I am not interested.',
      expected: 'negative'
    },
    {
      name: 'Book a meeting',
      subject: 'Re: Demo',
      body: 'Sounds good, please book a meeting on my calendar.',
      expected: 'positive'
    },
    {
      name: 'Left the company',
      subject: 'Automated Response',
      body: 'The recipient is no longer with the company. Please direct all inquiries to HR.',
      expected: 'neutral'
    },
    {
      name: 'Opt out phrase',
      subject: 'Re: Newsletter / outreach',
      body: 'Opt out. Take me off this campaign.',
      expected: 'negative'
    },
    {
      name: 'Available next week',
      subject: 'Re: Chat',
      body: 'I am happy to talk. Available next Thursday at 3pm.',
      expected: 'positive'
    }
  ];

  let matchesCount = 0;
  console.log('| # | Test Case Description | Expected | Actual | Match? | Matched Phrases | Reason |');
  console.log('|---|-----------------------|----------|--------|--------|-----------------|--------|');

  testCases.forEach((tc, idx) => {
    const res = classifyReply(tc.subject, tc.body);
    const pass = res.sentiment === tc.expected;
    if (pass) matchesCount++;
    const passStr = pass ? 'PASS' : 'FAIL';
    const phrases = res.matchedPhrases.length > 0 ? res.matchedPhrases.slice(0, 3).join(', ') : '(none)';
    console.log(`| ${idx + 1} | ${tc.name} | ${tc.expected} | ${res.sentiment} | ${passStr} | ${phrases} | ${res.reason} |`);
  });

  console.log(`\n(a) Summary: ${matchesCount}/${testCases.length} tests passed matching expected sentiment.\n`);

  // -------------------------------------------------------------------------
  // (b) 3 TEST LEADS AT ONE COMPANY PLUS 1 AT ANOTHER: POSITIVE REPLY PAUSES
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------------');
  console.log('(b) POSITIVE REPLY: PAUSE OTHER LEADS AT SAME COMPANY ONLY');
  console.log('----------------------------------------------------------------------\n');

  // Clean any previous test leads
  await leadsCol.deleteMany({ leadId: { $regex: '^LEAD-TEST-' } });

  // Ensure settings is set to automatic pause
  await settingsCol.updateOne(
    { id: 'app_settings' },
    { $set: { positiveReplyAction: 'pause_automatically' } },
    { upsert: true }
  );

  const leadA = {
    leadId: 'LEAD-TEST-ACME-1',
    name: 'Alice Smith',
    email: 'alice@acmeworks.com',
    company: 'Acme Corp, LLC',
    status: 'Active',
    threadId: 'thread-acme-1',
    currentStage: 1,
    notes: 'Initial outreach sent'
  };
  const leadB = {
    leadId: 'LEAD-TEST-ACME-2',
    name: 'Bob Jones',
    email: 'bob@acmeworks.com',
    company: 'Acme Corp Inc.',
    status: 'Active',
    threadId: 'thread-acme-2',
    currentStage: 1,
    notes: 'Stage 1 active'
  };
  const leadC = {
    leadId: 'LEAD-TEST-ACME-3',
    name: 'Charlie Brown',
    email: 'charlie@acmeworks.com',
    company: 'Acme Corp',
    status: 'Active',
    threadId: 'thread-acme-3',
    currentStage: 2,
    notes: 'Stage 2 active'
  };
  const leadD = {
    leadId: 'LEAD-TEST-BETA-1',
    name: 'Diana Prince',
    email: 'diana@betasystems.io',
    company: 'Beta Systems Inc.',
    status: 'Active',
    threadId: 'thread-beta-1',
    currentStage: 1,
    notes: 'Beta company active'
  };

  await leadsCol.insertMany([leadA, leadB, leadC, leadD]);

  console.log('MongoDB Documents BEFORE Alice replies positive:');
  const docsBefore = await leadsCol.find({ leadId: { $in: ['LEAD-TEST-ACME-1', 'LEAD-TEST-ACME-2', 'LEAD-TEST-ACME-3', 'LEAD-TEST-BETA-1'] } }).toArray();
  docsBefore.forEach(d => {
    console.log(`- [${d.leadId}] ${d.name} (${d.company}): status="${d.status}", stoppedReason="${d.stoppedReason || ''}"`);
  });

  // Alice sends positive reply via Graph webhook path
  console.log('\nSimulating Alice sending positive reply: "Sounds great, let\'s connect and schedule a demo!"');
  const aliceReplyRes = await fetch(`${BASE_URL}/api/webhooks/graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: 'sub-test-positive',
          clientState: 'gini_graph_webhook_secret_key_2026',
          leadEmail: 'alice@acmeworks.com',
          threadId: 'thread-acme-1',
          subject: 'Re: Outreach',
          body: "Sounds great, let's connect and schedule a demo!"
        }
      ]
    })
  });
  const aliceReplyJson = await aliceReplyRes.json();
  console.log('Webhook response:', aliceReplyJson);

  console.log('\nMongoDB Documents AFTER Alice replies positive:');
  const docsAfter = await leadsCol.find({ leadId: { $in: ['LEAD-TEST-ACME-1', 'LEAD-TEST-ACME-2', 'LEAD-TEST-ACME-3', 'LEAD-TEST-BETA-1'] } }).toArray();
  docsAfter.forEach(d => {
    console.log(`- [${d.leadId}] ${d.name} (${d.company}): status="${d.status}", replySentiment="${d.replySentiment || ''}", stoppedReason="${d.stoppedReason || ''}", stoppedByLeadId="${d.stoppedByLeadId || ''}"`);
  });

  // -------------------------------------------------------------------------
  // (c) NEGATIVE REPLY: STOPS ONLY THAT LEAD & REFUSES TO SEND EMAIL
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(c) NEGATIVE REPLY: STOPS ONLY THAT LEAD & REFUSES TO SEND');
  console.log('----------------------------------------------------------------------\n');

  const leadE = {
    leadId: 'LEAD-TEST-NEG-1',
    name: 'Edward Nygma',
    email: 'edward@enigma.com',
    company: 'Enigma Enterprises',
    status: 'Active',
    threadId: 'thread-neg-1',
    currentStage: 1,
    notes: 'Stage 1 sent'
  };
  await leadsCol.insertOne(leadE);

  console.log('Simulating Edward sending negative reply: "Please unsubscribe me and do not contact me again."');
  const negReplyRes = await fetch(`${BASE_URL}/api/webhooks/graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: 'sub-test-neg',
          clientState: 'gini_graph_webhook_secret_key_2026',
          leadEmail: 'edward@enigma.com',
          threadId: 'thread-neg-1',
          subject: 'Re: Inquiry',
          body: 'Please unsubscribe me and do not contact me again.'
        }
      ]
    })
  });
  await negReplyRes.json();

  const edwardDoc = await leadsCol.findOne({ leadId: 'LEAD-TEST-NEG-1' });
  console.log(`Edward document after reply: status="${edwardDoc?.status}", replySentiment="${edwardDoc?.replySentiment}", replyReason="${edwardDoc?.replyReason}"`);

  console.log('\nTesting Hard Safety Send Refusal on Edward (Negative Reply):');
  const sendRes = await fetch(`${BASE_URL}/api/email/send-stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: edwardDoc,
      template: { stage: 2, subject: 'Follow up', bodyHtml: '<p>Are you free?</p>' },
      userEmail: 'care@giniiris.ai'
    })
  });
  const sendJson = await sendRes.json();
  console.log(`Send Attempt HTTP Status: ${sendRes.status}`);
  console.log(`Send Attempt Error Details: "${sendJson.error}"`);

  // -------------------------------------------------------------------------
  // (d) RESUME COMPANY LEADS AND MANUAL OVERRIDE (WITH UNDO)
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(d) RESUME COMPANY LEADS & MANUAL SENTIMENT OVERRIDE (WITH UNDO)');
  console.log('----------------------------------------------------------------------\n');

  console.log('1. Manual override Alice from Positive -> Neutral (Undo side-effects):');
  const overrideRes = await fetch(`${BASE_URL}/api/leads/override-sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: 'LEAD-TEST-ACME-1',
      sentiment: 'neutral'
    })
  });
  const overrideJson = await overrideRes.json();
  console.log('Override result:', overrideJson);

  console.log('\nAcme leads after Alice marked Neutral (Bob and Charlie should be restored to Active):');
  const acmeAfterNeutral = await leadsCol.find({ leadId: { $in: ['LEAD-TEST-ACME-1', 'LEAD-TEST-ACME-2', 'LEAD-TEST-ACME-3'] } }).toArray();
  acmeAfterNeutral.forEach(d => {
    console.log(`- [${d.leadId}] ${d.name}: status="${d.status}", replySentiment="${d.replySentiment || ''}", notes="${d.notes || ''}"`);
  });

  console.log('\n2. Manual override Alice back to Positive (Pauses colleagues again):');
  await fetch(`${BASE_URL}/api/leads/override-sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: 'LEAD-TEST-ACME-1',
      sentiment: 'positive'
    })
  });
  const acmeAfterPositive = await leadsCol.find({ leadId: { $in: ['LEAD-TEST-ACME-2', 'LEAD-TEST-ACME-3'] } }).toArray();
  acmeAfterPositive.forEach(d => {
    console.log(`- [${d.leadId}] ${d.name}: status="${d.status}", stoppedReason="${d.stoppedReason}"`);
  });

  console.log('\n3. Click "Resume company leads" action on Alice:');
  const resumeRes = await fetch(`${BASE_URL}/api/leads/resume-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replyingLeadId: 'LEAD-TEST-ACME-1'
    })
  });
  const resumeJson = await resumeRes.json();
  console.log('Resume company leads response:', resumeJson);

  const acmeAfterResume = await leadsCol.find({ leadId: { $in: ['LEAD-TEST-ACME-2', 'LEAD-TEST-ACME-3'] } }).toArray();
  acmeAfterResume.forEach(d => {
    console.log(`- [${d.leadId}] ${d.name}: status="${d.status}", stoppedReason="${d.stoppedReason || ''}", notes="${d.notes}"`);
  });

  // -------------------------------------------------------------------------
  // (e) "ASK ME FIRST" MODE CREATES CONFIRMATION INSTEAD OF AUTO-PAUSING
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(e) "ASK ME FIRST" SETTING: PENDING CONFIRMATION & CONFIRM PAUSE');
  console.log('----------------------------------------------------------------------\n');

  // Change settings to 'ask_first'
  await settingsCol.updateOne(
    { id: 'app_settings' },
    { $set: { positiveReplyAction: 'ask_first' } }
  );

  const leadF = {
    leadId: 'LEAD-TEST-GAMMA-1',
    name: 'Frank Castle',
    email: 'frank@gammacorp.com',
    company: 'Gamma Corp',
    status: 'Active',
    threadId: 'thread-gamma-1',
    currentStage: 1,
    notes: 'Outreach active'
  };
  const leadG = {
    leadId: 'LEAD-TEST-GAMMA-2',
    name: 'Grace Hopper',
    email: 'grace@gammacorp.com',
    company: 'Gamma Corp',
    status: 'Active',
    threadId: 'thread-gamma-2',
    currentStage: 1,
    notes: 'Outreach active'
  };

  await leadsCol.insertMany([leadF, leadG]);

  console.log('Simulating Frank sending positive reply under "ask_first" mode:');
  await fetch(`${BASE_URL}/api/webhooks/graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: 'sub-test-gamma',
          clientState: 'gini_graph_webhook_secret_key_2026',
          leadEmail: 'frank@gammacorp.com',
          threadId: 'thread-gamma-1',
          subject: 'Re: Gamma outreach',
          body: 'Yes, interested, send pricing please!'
        }
      ]
    })
  });

  const frankDoc = await leadsCol.findOne({ leadId: 'LEAD-TEST-GAMMA-1' });
  const graceDoc = await leadsCol.findOne({ leadId: 'LEAD-TEST-GAMMA-2' });
  console.log(`Frank: status="${frankDoc?.status}", pendingCompanyPause=${JSON.stringify(frankDoc?.pendingCompanyPause)}`);
  console.log(`Grace: status="${graceDoc?.status}" (Remains Active while awaiting confirmation!)`);

  console.log('\nUser clicks "Confirm" on pending pause:');
  const confirmRes = await fetch(`${BASE_URL}/api/leads/confirm-company-pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replyingLeadId: 'LEAD-TEST-GAMMA-1',
      confirm: true
    })
  });
  const confirmJson = await confirmRes.json();
  console.log('Confirm pause response:', confirmJson);

  const graceDocAfterConfirm = await leadsCol.findOne({ leadId: 'LEAD-TEST-GAMMA-2' });
  const frankDocAfterConfirm = await leadsCol.findOne({ leadId: 'LEAD-TEST-GAMMA-1' });
  console.log(`Grace after confirmation: status="${graceDocAfterConfirm?.status}", stoppedReason="${graceDocAfterConfirm?.stoppedReason}"`);
  console.log(`Frank pendingCompanyPause cleared: ${frankDocAfterConfirm?.pendingCompanyPause === undefined}`);

  // Restore settings to default 'pause_automatically'
  await settingsCol.updateOne(
    { id: 'app_settings' },
    { $set: { positiveReplyAction: 'pause_automatically' } }
  );

  // Clean up test leads
  await leadsCol.deleteMany({ leadId: { $regex: '^LEAD-TEST-' } });
  console.log('\nCleaned up all LEAD-TEST-* leads from database.');

  console.log('\n======================================================================');
  console.log('ALL VERIFICATION PHASES (a) through (e) EXECUTED WITH FULL EVIDENCE!');
  console.log('======================================================================');

  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
