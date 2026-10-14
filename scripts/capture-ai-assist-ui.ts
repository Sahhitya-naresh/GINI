import { chromium } from 'playwright';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { createSessionToken } from '../server/auth.ts';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Running browser UI capture and test for AI Writing Assistant...');
  const db = await getDb();

  // Create an admin user token
  const adminDoc = await db.collection(COLLECTIONS.USERS).findOne({ role: 'admin' });
  const adminUser = adminDoc || {
    id: 'test-admin-ui',
    email: 'admin@example.com',
    name: 'System Admin',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  };

  const token = createSessionToken(adminUser as any);

  // Ensure a test lead exists with latest reply
  const testLeadId = 'lead-ai-ui-test';
  await db.collection(COLLECTIONS.LEADS).deleteOne({ leadId: testLeadId });
  await db.collection(COLLECTIONS.LEADS).insertOne({
    leadId: testLeadId,
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@testcorp.com',
    company: 'Apex Solutions',
    painPoint: 'Manual email sequence tracking bottlenecks',
    ownerId: adminUser.id,
    notes: 'Thanks for reaching out. Could you share details regarding your team integration capabilities?\n\nOn Mon, Oct 12, 2026 at 9:00 AM Rep <rep@outreach.com> wrote:\n> Hello Sarah, following up on our discussion.',
    hasUnreadReply: true,
    replySentiment: 'positive',
    status: 'Replied'
  });

  const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  // Set auth cookie
  await context.addCookies([
    {
      name: 'gini_auth_token',
      value: token,
      domain: 'localhost',
      path: '/'
    }
  ]);

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('/api/email/ai-assist')) {
      console.log('AI-ASSIST RESPONSE STATUS:', res.status());
      try {
        const text = await res.text();
        console.log('AI-ASSIST RESPONSE BODY:', text);
      } catch (e) {}
    }
  });

  // Go to home page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // If login form is shown, fill it in
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.count() > 0) {
    console.log('Login form displayed, filling credentials...');
    await emailInput.fill('admin@example.com');
    await page.locator('input[type="password"]').fill('AdminPassword123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }

  // Navigate via Navigation Menu to Needs Reply
  await page.locator('#btn-nav-menu').click();
  await page.waitForTimeout(500);
  await page.locator('#menu-tab-replied').click();
  await page.waitForTimeout(1500);

  // Find the reply button with title "Write manual reply with CC"
  const replyButton = page.locator('button[title="Write manual reply with CC"]').first();
  if (await replyButton.count() > 0) {
    await replyButton.click();
  } else {
    // Alternatively click lead row on leads tab
    await page.locator('#btn-nav-menu').click();
    await page.waitForTimeout(500);
    await page.locator('#menu-tab-leads').click();
    await page.waitForTimeout(1500);
    const leadRow = page.locator('tr:has-text("Sarah Jenkins")').first();
    if (await leadRow.count() > 0) {
      await leadRow.click();
      await page.waitForTimeout(1000);
      const modalReplyBtn = page.locator('button:has-text("Reply to")').first();
      if (await modalReplyBtn.count() > 0) {
        await modalReplyBtn.click();
      }
    }
  }

  await page.waitForTimeout(1500);

  // Modal should now be open
  const modal = page.locator('#manual-reply-modal');
  if (await modal.count() === 0) {
    await page.screenshot({ path: path.join(screenshotsDir, 'debug-modal-fail.png') });
    console.error('Manual reply modal did not open. Captured debug-modal-fail.png');
    await browser.close();
    process.exit(1);
  }

  console.log('Manual reply modal is open.');
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-1-opened.png') });

  // Verify AI button in toolbar directly to the right of Link button
  const aiToolbarBtn = page.locator('#ai-assist-toolbar-button');
  const hasAiBtn = await aiToolbarBtn.count() > 0;
  console.log('Has AI button in toolbar:', hasAiBtn);

  // Click AI button to open anchored panel
  await aiToolbarBtn.click();
  await page.waitForTimeout(500);

  const aiPanel = page.locator('#ai-assist-panel');
  console.log('AI panel open:', (await aiPanel.count()) > 0);
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-2-panel-open.png') });

  // Click "Write a reply" quick chip
  await page.locator('button:has-text("Write a reply")').click();
  await page.waitForTimeout(300);

  // Click Generate
  await page.locator('#ai-generate-button').click();
  await page.waitForSelector('#ai-result-preview-box', { timeout: 15000 });
  console.log('AI preview box visible: true');
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-3-generated-preview.png') });

  // Click Insert button
  await page.locator('#ai-insert-result-button').click();
  await page.waitForTimeout(500);

  // Verify undo button appears in toolbar
  const undoBtn = page.locator('#ai-undo-button');
  console.log('Undo AI button visible:', (await undoBtn.count()) > 0);
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-4-inserted-with-undo.png') });

  // Click Undo AI change
  await undoBtn.click();
  await page.waitForTimeout(500);
  console.log('Undo clicked, undo button gone:', (await page.locator('#ai-undo-button').count()) === 0);
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-5-after-undo.png') });

  // Test bracketed placeholder warning:
  const modalTextarea = page.locator('#manual-reply-modal textarea');
  await modalTextarea.click();
  await modalTextarea.fill('Hi Sarah, please let us know if [date] at [time] works.');
  await page.waitForTimeout(500);

  // Click Send Reply to trigger placeholder warning
  await page.locator('#send-reply-modal-button').click();
  await page.waitForSelector('#pending-placeholders-banner', { timeout: 8000 });
  console.log('Placeholder banner visible: true');
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-modal-6-placeholder-warning.png') });

  await browser.close();
  console.log('All browser captures completed successfully!');
}

main().catch(err => {
  console.error('Browser capture error:', err);
  process.exit(1);
});
