import { chromium } from 'playwright';

async function main() {
  console.log('Launching system chrome...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait 2 seconds for initial sync
  await page.waitForTimeout(2000);

  // Capture main page with Activity Hub closed
  await page.screenshot({ path: 'artifacts/screenshot_activity_hub_closed.png' });
  console.log('Captured screenshot_activity_hub_closed.png');

  // Check the bell button text and badge
  const hubButton = page.locator('#btn-notification-hub');
  const hubButtonText = await hubButton.innerText();
  console.log('Activity Hub button text:', hubButtonText);

  // Click the activity hub button
  console.log('Clicking Activity Hub button...');
  await hubButton.click();
  await page.waitForTimeout(1000);

  // Capture open drawer
  await page.screenshot({ path: 'artifacts/screenshot_activity_hub_open.png' });
  console.log('Captured screenshot_activity_hub_open.png');

  // Inspect alerts tab contents
  const panel = page.locator('#notification-hub-panel');
  const panelVisible = await panel.isVisible();
  console.log('Is Notification Hub panel visible?', panelVisible);

  const alertsTabText = await page.locator('#hub-tab-alerts').innerText();
  console.log('Alerts tab label:', alertsTabText);

  const panelText = await panel.innerText();
  console.log('Panel inner text preview:\n', panelText.slice(0, 500));

  await browser.close();
  console.log('Browser closed successfully.');
}

main().catch(err => {
  console.error('Playwright script error:', err);
  process.exit(1);
});
