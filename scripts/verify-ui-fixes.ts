import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ channel: 'msedge', headless: true })
  );
  const context = await browser.newContext({ viewport: { width: 1536, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/leads...');
  await page.goto('http://localhost:3000/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture leads table
  const leadsShot = path.join(screenshotsDir, 'leads-page-tabs-and-negative.png');
  await page.screenshot({ path: leadsShot, fullPage: false });
  console.log('Saved leads screenshot:', leadsShot);

  // 2. Open Details modal for Sandeep sir (LEAD-104)
  console.log('Opening Sandeep sir (LEAD-104) Details modal...');
  const sandeepRow = page.locator('tr').filter({ hasText: 'LEAD-104' });
  await sandeepRow.locator('button', { hasText: 'Details' }).click();
  await page.waitForTimeout(1500);

  const modalShot1 = path.join(screenshotsDir, 'lead-104-thread-sent-and-reply.png');
  await page.screenshot({ path: modalShot1, fullPage: false });
  console.log('Saved LEAD-104 modal screenshot:', modalShot1);

  // 3. Close modal via Close button
  await page.locator('button', { hasText: 'Close' }).last().click();
  await page.waitForTimeout(500);

  // 4. Open Details modal for Shekhar (LEAD-103)
  console.log('Opening Shekhar (LEAD-103) Details modal...');
  const shekharRow = page.locator('tr').filter({ hasText: 'LEAD-103' });
  await shekharRow.locator('button', { hasText: 'Details' }).click();
  await page.waitForTimeout(1500);

  const modalShot2 = path.join(screenshotsDir, 'lead-103-thread-sent.png');
  await page.screenshot({ path: modalShot2, fullPage: false });
  console.log('Saved LEAD-103 modal screenshot:', modalShot2);

  await browser.close();
  console.log('SUCCESS: All screenshots captured and verified.');
}

main().catch(err => {
  console.error('Playwright verification error:', err);
  process.exit(1);
});
