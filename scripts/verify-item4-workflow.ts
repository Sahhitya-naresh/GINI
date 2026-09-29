import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('=== STARTING ITEM 4: WORKFLOW CANVAS SAVE/LOAD ROUND-TRIP ===');
  const screenshotDir = path.join(process.cwd(), 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Go to Workflows tab
  const workflowTab = page.locator('#tab-workflows, button:has-text("Workflow Canvas")').first();
  await workflowTab.click();
  await page.waitForTimeout(1000);

  // 2. Click "+ New Flow"
  console.log('Creating new flow...');
  await page.locator('button:has-text("+ New Flow")').click();
  await page.waitForTimeout(500);

  // 3. Rename flow
  const flowNameInput = page.locator('input[placeholder="Flow Name..."]').first();
  await flowNameInput.fill('Roundtrip Verification Flow');
  await page.waitForTimeout(300);

  // 4. Add Campaign Trigger (Start node)
  console.log('Adding Campaign Trigger (Start node)...');
  await page.locator('button:has-text("Campaign Trigger")').first().click();
  await page.waitForTimeout(500);

  // Select the start node
  const startNode = page.locator('.react-flow__node-startNode').first();
  await startNode.waitFor({ timeout: 5000 });
  await startNode.click({ force: true });
  await page.waitForTimeout(300);

  // Add Email Step
  console.log('Adding Email Step...');
  await page.locator('button:has-text("Email Step")').first().click();
  await page.waitForTimeout(500);

  // Select the email node
  const emailNode = page.locator('.react-flow__node-emailNode').first();
  await emailNode.waitFor({ timeout: 5000 });
  await emailNode.click({ force: true });
  await page.waitForTimeout(300);

  // Add Wait Delay
  console.log('Adding Wait Delay...');
  await page.locator('button:has-text("Wait Delay")').first().click();
  await page.waitForTimeout(500);

  // Check nodes count
  const linearNodes = await page.locator('.react-flow__node').all();
  const linearEdges = await page.locator('.react-flow__edge').all();
  console.log(`Canvas before save: ${linearNodes.length} nodes, ${linearEdges.length} edges.`);

  // Click Save Flow
  console.log('Clicking Save Flow...');
  await page.locator('button:has-text("Save Flow")').click();
  await page.waitForTimeout(2000);

  // Take screenshot of saved linear flow
  await page.screenshot({ path: path.join(screenshotDir, '4a-linear-flow-saved.png') });
  console.log('Captured: 4a-linear-flow-saved.png');

  // Fetch campaign from backend API to inspect saved JSON
  const campaignsListRes = await fetch('http://localhost:3000/api/campaigns/list').then(r => r.json());
  const savedLinearCampaign = campaignsListRes.campaigns.find((c: any) => c.name === 'Roundtrip Verification Flow');
  console.log('\n--- MONGODB DOCUMENT (Linear Flow) ---');
  console.log(JSON.stringify({
    id: savedLinearCampaign?.id,
    name: savedLinearCampaign?.name,
    is_active: savedLinearCampaign?.is_active,
    nodes: savedLinearCampaign?.workflow_graph?.nodes,
    edges: savedLinearCampaign?.workflow_graph?.edges
  }, null, 2));

  // FULL PAGE RELOAD
  console.log('\n--- FULL PAGE RELOAD 1 ---');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate back to Workflow Canvas
  await page.locator('#tab-workflows, button:has-text("Workflow Canvas")').first().click();
  await page.waitForTimeout(1000);

  // Ensure "Roundtrip Verification Flow" is selected in dropdown
  const selectDropdown = page.locator('#select-active-workflow');
  await selectDropdown.selectOption({ label: 'Roundtrip Verification Flow' });
  await page.waitForTimeout(1000);

  // Verify nodes and edges after reload
  const reloadedLinearNodes = await page.locator('.react-flow__node').all();
  const reloadedLinearEdges = await page.locator('.react-flow__edge').all();
  console.log(`Canvas AFTER reload: ${reloadedLinearNodes.length} nodes, ${reloadedLinearEdges.length} edges.`);

  const nodeTexts: string[] = [];
  for (const n of reloadedLinearNodes) {
    nodeTexts.push((await n.innerText()).replace(/\n+/g, ' '));
  }
  console.log('Reloaded node contents:', nodeTexts);

  await page.screenshot({ path: path.join(screenshotDir, '4a-linear-flow-reloaded.png') });
  console.log('Captured: 4a-linear-flow-reloaded.png');

  // PART 2: Add Condition node with Yes/No branches merging back through a Merge node
  console.log('\n--- PART 2: ADDING CONDITION SPLIT AND MERGE NODE ---');
  // Select the wait node
  const waitNode = page.locator('.react-flow__node-waitNode').first();
  await waitNode.click({ force: true });
  await page.waitForTimeout(300);

  // Add Condition node
  console.log('Adding Condition Split node...');
  await page.locator('button:has-text("Condition Split (Yes/No)")').first().click();
  await page.waitForTimeout(500);

  // Select Condition node
  const conditionNode = page.locator('.react-flow__node-conditionNode').first();
  await conditionNode.click({ force: true });
  await page.waitForTimeout(300);

  // Add YES Branch Email Step (auto connects from condition node's yes handle)
  console.log('Adding YES Branch Email Step...');
  await page.locator('button:has-text("Email Step")').first().click();
  await page.waitForTimeout(500);

  // Deselect by clicking pane
  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 200 }, force: true });
  await page.waitForTimeout(300);

  // Add NO Branch Wait node (unselected so it doesn't auto-connect wrong)
  console.log('Adding unattached Wait node for NO branch...');
  await page.locator('button:has-text("Wait Delay")').first().click();
  await page.waitForTimeout(500);

  // Now connect Condition "no" handle to the new Wait node
  // The new wait node is the second wait node on the canvas
  const allWaitNodes = page.locator('.react-flow__node-waitNode');
  const secondWaitNode = allWaitNodes.nth(1);
  const secondWaitTopHandle = secondWaitNode.locator('.react-flow__handle-top').first();
  const conditionNoHandle = conditionNode.locator('[data-handleid="no"]').first();

  console.log('Connecting Condition NO handle to second Wait node...');
  await conditionNoHandle.dragTo(secondWaitTopHandle, { force: true });
  await page.waitForTimeout(500);

  // Add Merge Point node
  await page.locator('.react-flow__pane').click({ position: { x: 700, y: 200 }, force: true });
  await page.waitForTimeout(300);
  console.log('Adding Merge Point node...');
  await page.locator('button:has-text("Merge Point")').first().click();
  await page.waitForTimeout(500);

  const mergeNode = page.locator('.react-flow__node-mergeNode').first();
  const mergeTopHandle = mergeNode.locator('.react-flow__handle-top').first();

  // Connect YES Email node (second email node) to Merge node
  const allEmailNodes = page.locator('.react-flow__node-emailNode');
  const secondEmailNode = allEmailNodes.nth(1);
  const secondEmailBottomHandle = secondEmailNode.locator('.react-flow__handle-bottom').first();
  console.log('Connecting YES branch email to Merge node...');
  await secondEmailBottomHandle.dragTo(mergeTopHandle, { force: true });
  await page.waitForTimeout(500);

  // Connect NO Wait node (second wait node) to Merge node
  const secondWaitBottomHandle = secondWaitNode.locator('.react-flow__handle-bottom').first();
  console.log('Connecting NO branch wait to Merge node...');
  await secondWaitBottomHandle.dragTo(mergeTopHandle, { force: true });
  await page.waitForTimeout(500);

  // Auto-arrange or Tidy Layout for clean visual
  await page.locator('button:has-text("Tidy Layout")').first().click();
  await page.waitForTimeout(500);

  // Save the branch/merge workflow
  console.log('Clicking Save Flow for branch/merge...');
  await page.locator('button:has-text("Save Flow")').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(screenshotDir, '4b-branch-merge-saved.png') });
  console.log('Captured: 4b-branch-merge-saved.png');

  // Query MongoDB document
  const campaignsRes2 = await fetch('http://localhost:3000/api/campaigns/list').then(r => r.json());
  const savedBranchCampaign = campaignsRes2.campaigns.find((c: any) => c.name === 'Roundtrip Verification Flow');
  console.log('\n--- MONGODB DOCUMENT (Branch/Merge Flow) ---');
  console.log(JSON.stringify({
    id: savedBranchCampaign?.id,
    name: savedBranchCampaign?.name,
    nodesCount: savedBranchCampaign?.workflow_graph?.nodes?.length,
    edgesCount: savedBranchCampaign?.workflow_graph?.edges?.length,
    nodes: savedBranchCampaign?.workflow_graph?.nodes?.map((n: any) => ({ id: n.id, type: n.type, label: n.data?.label })),
    edges: savedBranchCampaign?.workflow_graph?.edges?.map((e: any) => ({ id: e.id, source: e.source, target: e.target, label: e.label, sourceHandle: e.sourceHandle }))
  }, null, 2));

  // FULL PAGE RELOAD 2
  console.log('\n--- FULL PAGE RELOAD 2 ---');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.locator('#tab-workflows, button:has-text("Workflow Canvas")').first().click();
  await page.waitForTimeout(1000);

  await page.locator('#select-active-workflow').selectOption({ label: 'Roundtrip Verification Flow' });
  await page.waitForTimeout(1500);

  const reloadedBranchNodes = await page.locator('.react-flow__node').all();
  const reloadedBranchEdges = await page.locator('.react-flow__edge').all();
  console.log(`Canvas AFTER 2nd reload: ${reloadedBranchNodes.length} nodes, ${reloadedBranchEdges.length} edges.`);

  const finalNodeTexts: string[] = [];
  for (const n of reloadedBranchNodes) {
    finalNodeTexts.push((await n.innerText()).replace(/\n+/g, ' '));
  }
  console.log('Final reloaded node contents:', finalNodeTexts);

  await page.screenshot({ path: path.join(screenshotDir, '4b-branch-merge-reloaded.png') });
  console.log('Captured: 4b-branch-merge-reloaded.png');

  await browser.close();
  console.log('=== ITEM 4 COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Item 4 test failed:', err);
  process.exit(1);
});
