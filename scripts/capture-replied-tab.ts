import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.locator('#tab-replied').first().click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-screenshots/1c-needs-reply-tab.png' });
  await browser.close();
  console.log('Captured clean 1c-needs-reply-tab.png');
}

main();
