import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING ITEM 2 & ITEM 3: TRACKING & VIEW-COUNT FALSE-POSITIVE CHECK ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const leadId = 'LEAD-101';
  const email = 'sarah.connor@skydefense-test.io';
  const campaign = 'Linear Outreach Sequence';

  // Check initial trackingEvents count
  const initialTrackRes = await fetch('http://localhost:3000/api/track/events').then(r => r.json());
  console.log(`Initial trackingEvents in DB: ${initialTrackRes.events?.length || 0}`);

  // -------------------------------------------------------------
  // ITEM 2: LIVE EXTERNAL TRACKING PIXEL AND LINK CLICK
  // -------------------------------------------------------------
  console.log('\n--- SIMULATING EXTERNAL EMAIL CLIENT OPENING EMAIL (Fetching Tracking Pixel) ---');
  // External client (e.g., Apple Mail / Outlook Desktop / Thunderbird)
  const pixelRes = await fetch(`http://localhost:3000/api/track/open?leadId=${encodeURIComponent(leadId)}&email=${encodeURIComponent(email)}&stage=1&campaign=${encodeURIComponent(campaign)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OutlookMobileClient/2.0',
      'Accept': 'image/gif,image/*;q=0.8'
    }
  });
  console.log('Pixel response status:', pixelRes.status, 'Content-Type:', pixelRes.headers.get('content-type'));

  console.log('\n--- SIMULATING EXTERNAL EMAIL CLIENT CLICKING TRACKED LINK ---');
  const clickRes = await fetch(`http://localhost:3000/api/track/click?url=https%3A%2F%2Fginiiris.ai%2Fdemo&leadId=${encodeURIComponent(leadId)}&email=${encodeURIComponent(email)}&stage=1&campaign=${encodeURIComponent(campaign)}`, {
    redirect: 'manual',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    }
  });
  console.log('Click response status:', clickRes.status, 'Redirect Location:', clickRes.headers.get('location'));

  // Confirm in MongoDB trackingEvents
  const afterTrackRes = await fetch('http://localhost:3000/api/track/events').then(r => r.json());
  const leadEvents = afterTrackRes.events.filter((e: any) => e.leadId === leadId || e.email === email);
  console.log('\n--- MONGODB trackingEvents DOCUMENTS RECORDED ---');
  console.log(JSON.stringify(leadEvents, null, 2));

  const hasOpen = leadEvents.some((e: any) => e.type === 'open');
  const hasClick = leadEvents.some((e: any) => e.type === 'click');
  console.log(`Confirmed: open recorded = ${hasOpen}, click recorded = ${hasClick}`);

  const openCountAfterExternal = leadEvents.filter((e: any) => e.type === 'open').length;
  console.log(`Open count before in-app checks: ${openCountAfterExternal}`);

  // -------------------------------------------------------------
  // ITEM 3: VIEW-COUNT FALSE-POSITIVE CHECK
  // Open the same lead's thread inside the app 4-5 times in a row.
  // Confirm the open count in trackingEvents does NOT increase!
  // -------------------------------------------------------------
  console.log('\n--- ITEM 3: TESTING IN-APP VIEW-COUNT FALSE-POSITIVE PROTECTION ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Find the row for Sarah Connor
  const leadRow = page.locator('tr, div').filter({ hasText: 'Sarah Connor' }).first();
  await leadRow.waitFor({ timeout: 10000 });

  for (let i = 1; i <= 5; i++) {
    console.log(`In-app view #${i}: Opening Sarah Connor thread detail modal...`);
    // Click the Details button specifically
    const detailsBtn = leadRow.locator('button:has-text("Details")').first();
    await detailsBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Take screenshot on the first and 5th view
    if (i === 1) {
      await page.screenshot({ path: path.join(screenshotDir, '3a-lead-modal-view-1.png') });
      console.log('Captured: 3a-lead-modal-view-1.png');
    }

    // Close the modal
    const closeBtn = page.locator('#lead-detail-modal-container button[title="Close modal"], button[title="Close modal"]').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  await page.screenshot({ path: path.join(screenshotDir, '3b-after-5-modal-views.png') });
  console.log('Captured: 3b-after-5-modal-views.png');

  // Query MongoDB trackingEvents again
  const finalTrackRes = await fetch('http://localhost:3000/api/track/events').then(r => r.json());
  const finalLeadEvents = finalTrackRes.events.filter((e: any) => e.leadId === leadId || e.email === email);
  const openCountAfterInApp = finalLeadEvents.filter((e: any) => e.type === 'open').length;

  console.log('\n--- ITEM 3 VERIFICATION RESULT ---');
  console.log(`Open count before in-app views: ${openCountAfterExternal}`);
  console.log(`Open count after 5 in-app views: ${openCountAfterInApp}`);
  console.log(`Did open count increase from in-app viewing? ${openCountAfterInApp > openCountAfterExternal}`);

  if (openCountAfterInApp === openCountAfterExternal) {
    console.log('PASS: Opening lead thread inside the app did NOT increase open count in trackingEvents!');
  } else {
    console.error('FAIL: In-app views caused false positive opens!');
  }

  await browser.close();
  console.log('=== ITEM 2 & ITEM 3 COMPLETED ===');
}

main().catch(err => {
  console.error('Item 2/3 test failed:', err);
  process.exit(1);
});
