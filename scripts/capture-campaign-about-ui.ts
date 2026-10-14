import { chromium } from 'playwright';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { createSessionToken } from '../server/auth.ts';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Capturing UI evidence for "About this campaign" and AI context panel...');
  const db = await getDb();

  const adminDoc = await db.collection(COLLECTIONS.USERS).findOne({ role: 'admin' });
  const adminUser = adminDoc || {
    id: 'test-admin-about-ui',
    email: 'admin@example.com',
    name: 'System Admin',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  };

  const token = createSessionToken(adminUser as any);

  // Ensure test campaign exists
  const testCampId = 'camp-ui-about-demo';
  const testCampName = 'Enterprise AI Sequence';
  const testCampAbout = 'Offer: 30-day pilot for Series B+ enterprise engineering teams. Goal: 20-minute architecture discovery. Never promise unverified SLAs or custom on-prem deployments.';

  await db.collection(COLLECTIONS.CAMPAIGNS).updateOne(
    { id: testCampId },
    {
      $set: {
        id: testCampId,
        name: testCampName,
        description: 'Enterprise outreach workflow',
        aboutCampaign: testCampAbout,
        version: 1,
        is_active: true,
        workflow_graph: { nodes: [], edges: [] },
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ownerId: adminUser.id,
        ownerName: adminUser.name || 'System Admin',
        lastEditedBy: adminUser.name || 'System Admin',
        lastEditedAt: new Date().toISOString(),
        versions: []
      }
    },
    { upsert: true }
  );

  // Ensure test lead exists assigned to this campaign
  const testLeadId = 'lead-ui-about-demo';
  await db.collection(COLLECTIONS.LEADS).updateOne(
    { leadId: testLeadId },
    {
      $set: {
        leadId: testLeadId,
        name: 'Jordan Bell',
        email: 'jordan.bell@acmecorp-test.com',
        company: 'Acme Corp',
        painPoint: 'Email delivery rate drops and manual follow-ups',
        campaignId: testCampId,
        campaign: testCampName,
        ownerId: adminUser.id,
        ownerName: adminUser.name || 'System Admin',
        notes: 'We are evaluating new cold email outreach systems. Can you share more about your approach?',
        hasUnreadReply: true,
        replySentiment: 'positive',
        status: 'Replied'
      }
    },
    { upsert: true }
  );

  const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addCookies([
    {
      name: 'gini_auth_token',
      value: token,
      domain: 'localhost',
      path: '/'
    }
  ]);

  const page = await context.newPage();

  // 1. Capture Workflow Canvas & About this campaign modal
  console.log('Navigating to Workflows canvas...');
  await page.goto('http://localhost:3000/workflows', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click About this campaign button
  const aboutBtn = page.locator('#about-this-campaign-button');
  if (await aboutBtn.count() > 0) {
    console.log('Found #about-this-campaign-button, clicking...');
    await aboutBtn.click();
    await page.waitForTimeout(1000);
    const canvasModalPath = path.join(screenshotsDir, 'workflows-about-campaign-modal.png');
    await page.screenshot({ path: canvasModalPath });
    console.log(`Saved canvas modal screenshot to: ${canvasModalPath}`);

    // Close modal
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await page.waitForTimeout(500);
  } else {
    console.warn('Could not find #about-this-campaign-button on workflows page');
    await page.screenshot({ path: path.join(screenshotsDir, 'workflows-page-no-btn.png') });
  }

  // 2. Capture Manual Reply AI Panel with Using: line
  console.log('Navigating to Replied page...');
  await page.goto('http://localhost:3000/replied', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click reply on Jordan Bell or first available lead
  const replyButton = page.locator('button[title="Write manual reply with CC"]').first();
  if (await replyButton.count() > 0) {
    await replyButton.click();
    await page.waitForTimeout(1500);

    // Open AI Panel
    const aiToolbarBtn = page.locator('#ai-assist-toolbar-button');
    if (await aiToolbarBtn.count() > 0) {
      await aiToolbarBtn.click();
      await page.waitForTimeout(1200);

      // Scroll AI panel context line into view
      await page.locator('#ai-view-context-btn').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      const panelScreenshotPath = path.join(screenshotsDir, 'ai-panel-using-line.png');
      await page.screenshot({ path: panelScreenshotPath });
      console.log(`Saved AI panel screenshot to: ${panelScreenshotPath}`);

      // Click "View" context link
      const viewContextBtn = page.locator('#ai-view-context-btn');
      if (await viewContextBtn.count() > 0) {
        await viewContextBtn.click();
        await page.waitForTimeout(800);
        const viewModalPath = path.join(screenshotsDir, 'ai-context-view-modal.png');
        await page.screenshot({ path: viewModalPath });
        console.log(`Saved AI context view modal screenshot to: ${viewModalPath}`);
      }
    }
  }

  await browser.close();
  console.log('Browser capture finished successfully.');
}

main().catch(err => {
  console.error('Browser capture error:', err);
  process.exit(1);
});
