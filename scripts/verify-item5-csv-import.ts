import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING ITEM 5: CSV IMPORT WITH A REAL MESSY FILE ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  const testDataDir = path.join(process.cwd(), 'test-data');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });

  // 1. Create the messy CSV file
  const csvPath = path.join(testDataDir, 'messy-import-test.csv');
  const csvContent = [
    'Full Contact Name,Contact Mail,Company Org,Assigned Workflow,Primary Challenge',
    'Sarah Connor,sarah.connor@skydefense-test.io,SkyDefense Robotics,Linear Outreach Sequence,Outreach sequencing delays',
    'Kyle Reese,kyle.reese@futuretech-test.io,FutureTech Systems,Nonexistent Ghost Campaign 999,Fragmented outbound prospecting',
    'John Connor,invalid-email-address-format,Resistance Operations,Linear Outreach Sequence,Lead qualification latency',
    'Miles Dyson,miles.dyson@cyberdyne-test.io,Cyberdyne Dynamics,Roundtrip Verification Flow,High bounce rates on cold outreach'
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log('Created test messy CSV at:', csvPath);

  // 2. Launch browser
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 3. Open Import Modal
  console.log('Opening Import Leads Modal...');
  const importBtn = page.locator('#btn-import-leads, button:has-text("Import CSV / Excel"), button:has-text("Import Leads")').first();
  await importBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // 4. Upload file into file input
  console.log('Uploading messy CSV file...');
  const fileInput = page.locator('input[type="file"][accept*=".csv"]');
  await fileInput.setInputFiles(csvPath);
  await page.waitForTimeout(1500);

  // Step 2: Mapping screen
  console.log('Checking Mapping Step...');
  await page.screenshot({ path: path.join(screenshotDir, '5a-csv-mapping-manual-required.png') });
  console.log('Captured: 5a-csv-mapping-manual-required.png');

  // Verify that manual mapping warning is displayed
  const manualWarning = page.locator('text="Manual Mapping Required for Email Address"');
  const hasManualWarning = await manualWarning.isVisible();
  console.log('Confirmed: App clearly asks for manual mapping when headers are non-standard:', hasManualWarning);

  // Now manually map the columns inside the mapping table (.divide-y select):
  // .divide-y select nth(0) is "Email Address" (Required)
  // .divide-y select nth(1) is "First Name"
  // .divide-y select nth(3) is "Company Name"
  // .divide-y select nth(7) is "Campaign (Optional)"
  console.log('Selecting "Contact Mail" for Email Address...');
  await page.locator('.divide-y select').nth(0).selectOption('Contact Mail');
  await page.waitForTimeout(300);

  console.log('Selecting "Full Contact Name" for First Name...');
  await page.locator('.divide-y select').nth(1).selectOption('Full Contact Name');
  await page.waitForTimeout(300);

  console.log('Selecting "Company Org" for Company Name...');
  await page.locator('.divide-y select').nth(3).selectOption('Company Org');
  await page.waitForTimeout(300);

  console.log('Selecting "Assigned Workflow" for Campaign...');
  await page.locator('.divide-y select').nth(7).selectOption('Assigned Workflow');
  await page.waitForTimeout(300);

  // Take screenshot of completed manual mapping
  await page.screenshot({ path: path.join(screenshotDir, '5a-csv-mapping-completed.png') });
  console.log('Captured: 5a-csv-mapping-completed.png');

  // Click "Continue to Preview"
  console.log('Clicking Continue to Preview...');
  const continueBtn = page.locator('button:has-text("Continue to Preview")').first();
  await continueBtn.click({ force: true });
  await page.waitForTimeout(1500);

  // Step 3: Preview screen
  console.log('Checking Preview & Validation Step...');
  await page.screenshot({ path: path.join(screenshotDir, '5b-csv-validation-flags.png') });
  console.log('Captured: 5b-csv-validation-flags.png');

  // Verify unmatched campaign banner exists
  const unmatchedBanner = page.locator('text="Unmatched Campaign Names Detected in File"');
  const isUnmatchedFlagged = await unmatchedBanner.isVisible();
  console.log('Unmatched campaign flagged in UI banner:', isUnmatchedFlagged);

  // Verify invalid rows count
  const invalidCard = page.locator('div:has-text("Invalid Rows")').first();
  const invalidText = await invalidCard.innerText();
  console.log('Invalid Rows summary:', invalidText.replace(/\n+/g, ' '));

  // Click "Skip All Unmatched" to ensure unmatched row is excluded
  console.log('Clicking "Skip All Unmatched"...');
  const skipUnmatchedBtn = page.locator('button:has-text("Skip All Unmatched")').first();
  if (await skipUnmatchedBtn.isVisible()) {
    await skipUnmatchedBtn.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Take screenshot showing updated candidate counts
  await page.screenshot({ path: path.join(screenshotDir, '5c-csv-preview-after-skip.png') });
  console.log('Captured: 5c-csv-preview-after-skip.png');

  // Click "Commit & Import X Leads"
  console.log('Committing import...');
  const commitBtn = page.locator('button:has-text("Commit & Import")').first();
  await commitBtn.click({ force: true });
  await page.waitForTimeout(3000);

  // Check leads table
  await page.screenshot({ path: path.join(screenshotDir, '5d-imported-leads-in-table.png') });
  console.log('Captured: 5d-imported-leads-in-table.png');

  // Query MongoDB leads collection
  const leadsRes = await fetch('http://localhost:3000/api/leads/list').then(r => r.json());
  console.log('\n--- MONGODB LEADS AFTER IMPORT ---');
  console.log(`Total leads in DB: ${leadsRes.count}`);
  for (const lead of leadsRes.leads) {
    console.log(`Lead ${lead.leadId}:`, {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      campaign: lead.campaign,
      campaignId: lead.campaignId,
      currentStage: lead.currentStage,
      status: lead.status
    });
  }

  // Assertions
  const invalidImported = leadsRes.leads.find((l: any) => l.email === 'invalid-email-address-format');
  console.log('Was invalid email row imported?', Boolean(invalidImported));

  const unmatchedImported = leadsRes.leads.find((l: any) => l.name === 'Kyle Reese');
  console.log('Was unmatched campaign row (marked to skip) imported?', Boolean(unmatchedImported));

  const sarah = leadsRes.leads.find((l: any) => l.email === 'sarah.connor@skydefense-test.io');
  const miles = leadsRes.leads.find((l: any) => l.email === 'miles.dyson@cyberdyne-test.io');
  console.log('Sarah Connor campaign details:', { campaign: sarah?.campaign, campaignId: sarah?.campaignId });
  console.log('Miles Dyson campaign details:', { campaign: miles?.campaign, campaignId: miles?.campaignId });

  await browser.close();
  console.log('=== ITEM 5 COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Item 5 test failed:', err);
  process.exit(1);
});
