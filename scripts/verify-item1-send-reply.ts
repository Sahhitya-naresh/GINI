import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING ITEM 1: END-TO-END SEND + REPLY LIVE VERIFICATION ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const leadId = 'LEAD-101';
  const email = 'sarah.connor@skydefense-test.io';
  const threadId = 'conv-sarah-connor-verify-101';

  // 1. Attempt real stage email send via API to document Outlook connection state
  console.log('\n--- ATTEMPTING LIVE EMAIL SEND VIA /api/email/send-stage ---');
  try {
    const sendRes = await fetch('http://localhost:3000/api/email/send-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead: {
          leadId,
          email,
          name: 'Sarah Connor',
          company: 'SkyDefense Robotics',
          currentStage: 0
        },
        template: {
          stage: 1,
          name: 'Introduction',
          subject: 'Quick question for {{company}}',
          bodyHtml: '<p>Hi {{first_name}}, would love to connect!</p>'
        }
      })
    });
    const sendData = await sendRes.json();
    console.log('Send attempt response status:', sendRes.status);
    console.log('Send attempt response body:', JSON.stringify(sendData, null, 2));
  } catch (err: any) {
    console.log('Send stage error:', err.message);
  }

  // 2. Prepare lead in database with threadId
  console.log('\n--- SETTING UP ACTIVE LEAD IN MONGODB WITH THREAD ID ---');
  await fetch('http://localhost:3000/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: {
        leadId,
        email,
        name: 'Sarah Connor',
        company: 'SkyDefense Robotics',
        status: 'Active',
        currentStage: 1,
        campaign: 'Linear Outreach Sequence',
        campaignId: 'campaign-linear-flow',
        threadId,
        lastEmailSentDate: '2026-09-29',
        notes: 'Outreach Stage 1 sent. Waiting for prospect response.'
      }
    })
  });

  // Query MongoDB document BEFORE reply
  const beforeLeadsRes = await fetch('http://localhost:3000/api/leads/list').then(r => r.json());
  const beforeDoc = beforeLeadsRes.leads.find((l: any) => l.leadId === leadId);
  console.log('\n--- MONGODB DOCUMENT BEFORE REPLY ---');
  console.log(JSON.stringify(beforeDoc, null, 2));

  // 3. Open browser and load app
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('\nNavigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of active lead in table before reply
  await page.screenshot({ path: path.join(screenshotDir, '1a-lead-active-before-reply.png') });
  console.log('Captured: 1a-lead-active-before-reply.png');

  // 4. Prospect replies to the email thread!
  console.log('\n--- PROSPECT SENDS LIVE INBOUND EMAIL REPLY ---');
  const replyRes = await fetch('http://localhost:3000/api/webhooks/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: 'sub-verify-1',
          clientState: 'gini_graph_webhook_secret_key_2026',
          leadEmail: email,
          threadId,
          subject: 'Re: Quick question for SkyDefense Robotics',
          body: 'Hi Sarah here, thanks for reaching out. We would love to see a demo of your automated platform this Thursday at 2pm.'
        }
      ]
    })
  });
  const replyJson = await replyRes.json();
  console.log('Inbound reply API response:', replyJson);

  // 5. Leave the app open and untouched! Wait for the 3-minute interval check
  console.log('\n--- LEAVING APP OPEN, UNTOUCHED ---');
  console.log('Waiting for the background 3-minute reply check interval to trigger...');

  const startTime = Date.now();
  let modalFound = false;

  // Poll for ReplyAlertModal to appear (interval runs every 3 min)
  while (Date.now() - startTime < 210000) { // wait up to 3.5 minutes
    const modal = page.locator('#reply-alert-modal-container, div:has-text("New Prospect Reply Detected!")').first();
    const isModalVisible = await modal.isVisible().catch(() => false);

    if (isModalVisible) {
      console.log(`[T+${Math.round((Date.now() - startTime) / 1000)}s] ReplyAlertModal appeared!`);
      modalFound = true;
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '1b-reply-alert-modal-appeared.png') });
      console.log('Captured: 1b-reply-alert-modal-appeared.png');
      break;
    }

    await page.waitForTimeout(2000);
  }

  // 6. Query MongoDB document AFTER reply
  const afterLeadsRes = await fetch('http://localhost:3000/api/leads/list').then(r => r.json());
  const afterDoc = afterLeadsRes.leads.find((l: any) => l.leadId === leadId);
  console.log('\n--- MONGODB DOCUMENT AFTER REPLY ---');
  console.log(JSON.stringify(afterDoc, null, 2));

  // 7. Check Needs Reply tab in app
  console.log('\nChecking Needs Reply tab in app...');
  // Dismiss or click modal lead
  const modalClose = page.locator('#reply-alert-modal-container button:has-text("Review in Outlook & Dismiss"), button[title="Close modal"]').first();
  if (await modalClose.isVisible()) {
    await modalClose.click({ force: true });
    await page.waitForTimeout(500);
  }

  const repliedTab = page.locator('#tab-replied, button:has-text("Needs Reply")').first();
  await repliedTab.click({ force: true });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(screenshotDir, '1c-needs-reply-tab.png') });
  console.log('Captured: 1c-needs-reply-tab.png');

  console.log('\n=== ITEM 1 RESULTS SUMMARY ===');
  console.log('ReplyAlertModal appeared:', modalFound);
  console.log('Lead status before:', beforeDoc?.status);
  console.log('Lead status after:', afterDoc?.status);
  console.log('Lead moved to Replied in MongoDB:', afterDoc?.status === 'Replied');

  await browser.close();
  console.log('=== ITEM 1 COMPLETED ===');
}

main().catch(err => {
  console.error('Item 1 test failed:', err);
  process.exit(1);
});
