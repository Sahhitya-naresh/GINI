import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click Settings button
  const settingsBtn = page.locator('button').filter({ hasText: 'Settings' }).first();
  await settingsBtn.click();
  await page.waitForTimeout(1000);

  // Scroll to Reply Classifier Keywords section
  const keywordsSection = page.locator('text=Reply Classifier Keywords & Rules').first();
  await keywordsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const outPath = path.join(process.cwd(), 'test-screenshots', 'settings-reply-keywords.png');
  await page.screenshot({ path: outPath });
  console.log('Saved screenshot to:', outPath);
  await browser.close();
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
