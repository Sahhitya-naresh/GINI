import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING ITEM 6: ANALYTICS DASHBOARD VERIFICATION ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to Analytics tab
  console.log('Navigating to Analytics tab...');
  const analyticsTab = page.locator('#tab-analytics, button:has-text("Analytics")').first();
  await analyticsTab.click({ force: true });
  await page.waitForTimeout(1500);

  // Capture screenshot
  await page.screenshot({ path: path.join(screenshotDir, '6-analytics-dashboard.png'), fullPage: true });
  console.log('Captured: 6-analytics-dashboard.png');

  // Query DOM metrics
  const metricCards = await page.locator('div.rounded-2xl, div.rounded-xl').all();
  const cardTexts: string[] = [];
  for (const card of metricCards) {
    const text = await card.innerText().catch(() => '');
    if (text.includes('Leads') || text.includes('Open') || text.includes('Click') || text.includes('Repl') || text.includes('Funnel')) {
      cardTexts.push(text.replace(/\n+/g, ' '));
    }
  }

  console.log('\n--- EXTRACTED ANALYTICS METRICS FROM UI ---');
  for (const t of cardTexts.slice(0, 10)) {
    console.log('-', t);
  }

  // Also query API for raw stats
  const trackRes = await fetch('http://localhost:3000/api/track/events').then(r => r.json());
  const leadsRes = await fetch('http://localhost:3000/api/leads/list').then(r => r.json());

  console.log('\n--- UNDERLYING DATA CONFIRMATION ---');
  console.log('Total Leads in MongoDB:', leadsRes.count);
  console.log('Total Opens recorded:', trackRes.totalOpens);
  console.log('Total Clicks recorded:', trackRes.totalClicks);
  console.log('Active Leads:', leadsRes.leads.filter((l: any) => l.status === 'Active').length);
  console.log('Replied Leads:', leadsRes.leads.filter((l: any) => l.status === 'Replied').length);

  await browser.close();
  console.log('=== ITEM 6 COMPLETED ===');
}

main().catch(err => {
  console.error('Item 6 failed:', err);
  process.exit(1);
});
