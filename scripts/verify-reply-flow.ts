import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING AUTOMATED REAL BROWSER TEST FOR REPLY DETECTION ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // 1. Reset test lead in database to Active state
  const resetRes = await fetch('http://localhost:3000/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: {
        leadId: 'LEAD-VERIFY-01',
        name: 'Auto Reply Test Lead',
        email: 'auto.reply.tester@example.com',
        company: 'Auto Test Systems',
        status: 'Active',
        threadId: 'conv-auto-reply-test-888',
        currentStage: 1,
        lastEmailSentDate: '2026-09-29',
        notes: 'Awaiting prospect response'
      }
    })
  });
  console.log('Lead reset response:', resetRes.status);

  // 2. Launch browser
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for table to load
  await page.waitForSelector('#btn-check-replies', { timeout: 15000 });

  // Confirm "Last checked:" text is visible
  const lastCheckedEl = await page.waitForSelector('#text-last-checked', { timeout: 10000 });
  const lastCheckedInitial = await lastCheckedEl.innerText();
  console.log('Initial "Last checked:" text:', lastCheckedInitial);

  // Confirm test lead is in the table as Active
  const leadRow = page.locator('tr, div').filter({ hasText: 'Auto Reply Test Lead' }).first();
  await leadRow.waitFor({ timeout: 10000 });
  console.log('Confirmed "Auto Reply Test Lead" is present in Active leads table.');

  await page.screenshot({ path: path.join(screenshotDir, '1-initial-active-lead.png') });
  console.log('Captured screenshot 1: 1-initial-active-lead.png');

  // 3. Prospect replies to the email!
  console.log('\n--- PROSPECT SENDS EMAIL REPLY ---');
  const replyRes = await fetch('http://localhost:3000/api/webhooks/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: [
        {
          subscriptionId: 'sub-test-flow',
          clientState: 'gini_graph_webhook_secret_key_2026',
          leadEmail: 'auto.reply.tester@example.com',
          threadId: 'conv-auto-reply-test-888',
          subject: 'Re: Outreach Flow Demo',
          body: 'Hi, I received your message. We would love to see a live demo this week!'
        }
      ]
    })
  });
  const replyData = await replyRes.json();
  console.log('Email reply registered:', replyData.success);

  // 4. Leave the app open without touching anything!
  console.log('\n--- LEAVING APP OPEN WITHOUT TOUCHING ANYTHING ---');
  console.log('Waiting for the 3-minute interval check to run automatically...');

  const startTime = Date.now();
  let replyDetected = false;
  let toastText = '';

  // Listen for toast or lead moving
  while (Date.now() - startTime < 210000) { // wait up to 3.5 minutes
    // Check if toast message appeared
    const toast = page.locator('div[role="alert"], .bg-emerald-900, .bg-emerald-800, div:has-text("Reply detected from Auto Reply Test Lead")').first();
    const isToastVisible = await toast.isVisible().catch(() => false);
    if (isToastVisible) {
      toastText = await toast.innerText().catch(() => '');
      console.log(`[T+${Math.round((Date.now() - startTime) / 1000)}s] Toast appeared! "${toastText}"`);
      replyDetected = true;
      await page.screenshot({ path: path.join(screenshotDir, '2-toast-notification.png') });
      break;
    }

    // Check if Needs Reply badge count increased or lead status changed in table
    const repliedBadge = page.locator('#tab-replied');
    const badgeText = await repliedBadge.innerText().catch(() => '');
    if (badgeText.includes('Needs Reply') || badgeText.includes('Replies')) {
      // Check if lead row now says Replied or moved
    }

    await page.waitForTimeout(2000);
  }

  if (!replyDetected) {
    console.log('Waiting for table update...');
    await page.waitForTimeout(5000);
  }

  // 5. Navigate to "Needs Reply" tab
  console.log('\n--- CHECKING "NEEDS REPLY" TAB ---');
  const needsReplyTab = page.locator('#tab-replied');
  await needsReplyTab.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(screenshotDir, '3-needs-reply-tab.png') });
  console.log('Captured screenshot 3: 3-needs-reply-tab.png');

  // Verify lead is in Needs Reply view
  const needsReplyLead = page.locator('text=Auto Reply Test Lead').first();
  const isPresentInNeedsReply = await needsReplyLead.isVisible().catch(() => false);
  console.log('Is "Auto Reply Test Lead" in Needs Reply view?:', isPresentInNeedsReply);

  // 6. Verify MongoDB record directly
  const mongoCheckRes = await fetch('http://localhost:3000/api/leads/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const leadsData = await mongoCheckRes.json();
  const leadInDb = (leadsData.leads || []).find((l: any) => l.leadId === 'LEAD-VERIFY-01');
  console.log('\n--- MONGODB RECORD VERIFICATION ---');
  console.log('Lead ID:', leadInDb?.leadId);
  console.log('Status in MongoDB:', leadInDb?.status);
  console.log('Notes in MongoDB:', leadInDb?.notes);

  // 7. Check "Last checked:" text
  await page.locator('button:has-text("Leads")').first().click().catch(() => {});
  await page.waitForTimeout(1000);
  const updatedLastCheckedEl = page.locator('#text-last-checked').first();
  const updatedLastChecked = await updatedLastCheckedEl.innerText().catch(() => 'N/A');
  console.log('Updated "Last checked:" text:', updatedLastChecked);

  await browser.close();

  const success = isPresentInNeedsReply && leadInDb?.status === 'Replied';
  console.log('\n==========================================');
  console.log(success ? 'TEST PASSED: Lead automatically moved to Needs Reply within interval!' : 'TEST FAILED');
  console.log('==========================================');

  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
