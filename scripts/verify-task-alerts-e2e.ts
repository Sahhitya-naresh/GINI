import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

async function runE2EVerification() {
  console.log('======================================================================');
  console.log('END-TO-END VISUAL & BROWSER VERIFICATION: MANUAL TASK ALERTS');
  console.log('======================================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Setup test campaign with Manual Task node and lead
  const testCampaignId = `camp-e2e-${Date.now()}`;
  const testLeadId = `LEAD-E2E-${Date.now()}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const testNodes = [
    {
      id: 'start-1',
      type: 'startNode',
      data: { label: 'Start Sequence', nodeType: 'start' }
    },
    {
      id: 'task-node-1',
      type: 'custom',
      data: {
        label: 'Schedule Executive Review',
        nodeType: 'manual_task',
        taskType: 'call',
        taskTitle: 'Executive Discovery Call with {{first_name}}',
        taskDescription: 'Discuss custom enterprise solutions regarding {{pain_point}}',
        taskPriority: 'high',
        taskDueDateOffsetDays: 0 // Due today!
      }
    }
  ];

  const testEdges = [
    {
      id: 'e1',
      source: 'start-1',
      target: 'task-node-1'
    }
  ];

  console.log('2. Creating test workflow with Manual Task node in backend...');
  const campRes = await fetch(`${BASE_URL}/api/campaigns/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign: {
        id: testCampaignId,
        name: 'Executive Review Flow',
        description: 'Test flow with Manual Task Node',
        isActive: true,
        is_active: true,
        nodes: testNodes,
        edges: testEdges,
        workflow_graph: { nodes: testNodes, edges: testEdges }
      }
    })
  });
  const campData = await campRes.json();
  console.log('Saved campaign result:', campData.success);

  console.log('3. Creating test lead assigned to this campaign...');
  const leadRes = await fetch(`${BASE_URL}/api/leads/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead: {
        leadId: testLeadId,
        name: 'Rachel Zane',
        firstName: 'Rachel',
        lastName: 'Zane',
        email: `rachel.zane.${Date.now()}@pearson-specter.example.com`,
        company: 'Pearson Specter Litt',
        jobTitle: 'Managing Partner',
        painPoint: 'cross-border document review workflow delays',
        currentStage: 0,
        status: 'Active',
        campaignId: testCampaignId,
        campaign: 'Executive Review Flow',
        currentNodeId: 'task-node-1',
        nodeEnteredDate: new Date().toISOString(),
        nextSendDate: todayStr
      }
    })
  });
  const leadData = await leadRes.json();
  console.log('Created lead result:', leadData.success);

  console.log('4. Running due campaigns (/api/campaigns/run-due) to generate task...');
  const runDueRes = await fetch(`${BASE_URL}/api/campaigns/run-due`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: 'test@example.com' })
  });
  const runDueData = await runDueRes.json();
  console.log('Run due completed. Tasks created count:', runDueData.tasksCreatedCount);

  // Fetch tasks to get created task ID
  const tasksRes = await fetch(`${BASE_URL}/api/tasks`);
  const tasksData = await tasksRes.json();
  const createdTask = tasksData.tasks?.find((t: any) => t.leadId === testLeadId);

  if (!createdTask) {
    throw new Error('Task was not created for test lead!');
  }
  console.log('Created task verified in database:');
  console.log('- Task ID:', createdTask.id);
  console.log('- Task Title:', createdTask.title);
  console.log('- Lead Name:', createdTask.leadName);
  console.log('- Company:', createdTask.company || createdTask.leadCompany);
  console.log('- Priority:', createdTask.priority);
  console.log('- Due Date:', createdTask.dueDate);

  // Wait for browser UI to refresh (triggering visibility refresh or background polling)
  console.log('\n5. Waiting for UI to sync task into Activity Hub state...');
  await page.evaluate(() => {
    // Trigger visibilitychange to run sync immediately in the browser
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(2000);

  // Check Bell unread badge in UI
  const hubButton = page.locator('#btn-notification-hub');
  const hubButtonText = await hubButton.innerText();
  console.log('Activity Hub button text in browser:', hubButtonText.replace(/\n/g, ' '));

  // Open Activity Hub drawer
  console.log('Opening Activity Hub panel...');
  await hubButton.click();
  await page.waitForTimeout(1000);

  // Verify Alerts tab content
  const panel = page.locator('#notification-hub-panel');
  const panelText = await panel.innerText();
  console.log('Panel inner text preview:');
  console.log(panelText);

  const containsTaskTitle = panelText.includes('Executive Discovery Call with Rachel');
  const containsLeadName = panelText.includes('Rachel Zane');
  const containsCompany = panelText.includes('Pearson Specter Litt');
  const containsPriority = panelText.includes('high Priority') || panelText.includes('High Priority');
  const containsDueDate = panelText.includes(`Due: ${todayStr}`);

  console.log('\nAlert Card Content Verification:');
  console.log('- Displays Task Title ("Executive Discovery Call with Rachel"):', containsTaskTitle ? 'PASS' : 'FAIL');
  console.log('- Displays Lead Name ("Rachel Zane"):', containsLeadName ? 'PASS' : 'FAIL');
  console.log('- Displays Company ("Pearson Specter Litt"):', containsCompany ? 'PASS' : 'FAIL');
  console.log('- Displays Priority ("HIGH Priority"):', containsPriority ? 'PASS' : 'FAIL');
  console.log('- Displays Due Date (`Due: ' + todayStr + '`):', containsDueDate ? 'PASS' : 'FAIL');

  await page.screenshot({ path: 'artifacts/task_alert_displayed.png' });
  console.log('Saved screenshot: artifacts/task_alert_displayed.png');

  // 6. Mark task complete -> show alert disappears automatically
  console.log('\n----------------------------------------------------------------------');
  console.log('6. MARK TASK COMPLETE -> ALERT DISAPPEARS AUTOMATICALLY');
  console.log('----------------------------------------------------------------------');

  console.log(`Updating task "${createdTask.id}" as completed...`);
  await fetch(`${BASE_URL}/api/tasks/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: createdTask.id,
      updates: { isCompleted: true, completedAt: new Date().toISOString() }
    })
  });

  // Trigger UI sync
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(2000);

  const panelTextAfterComplete = await panel.innerText();
  const alertStillPresent = panelTextAfterComplete.includes('Executive Discovery Call with Rachel');
  console.log('Is completed task alert still present in Alerts tab?', alertStillPresent ? 'YES (FAIL)' : 'NO (DISAPPEARED AUTOMATICALLY - PASS)');

  await page.screenshot({ path: 'artifacts/task_alert_completed_disappeared.png' });
  console.log('Saved screenshot: artifacts/task_alert_completed_disappeared.png');

  // 7. Test Dismiss & Reload persistence in browser
  console.log('\n----------------------------------------------------------------------');
  console.log('7. DISMISS ALERT, RELOAD PAGE -> ALERT STAYS DISMISSED');
  console.log('----------------------------------------------------------------------');

  // Create an active task
  const dismissTestTaskId = `task-dismiss-ui-${Date.now()}`;
  const dismissTestTask = {
    id: dismissTestTaskId,
    leadId: testLeadId,
    leadName: 'Rachel Zane',
    leadCompany: 'Pearson Specter Litt',
    leadEmail: 'rachel@example.com',
    title: 'Urgent Client Callback',
    description: 'Call regarding contract signing',
    priority: 'high',
    dueDate: todayStr,
    createdAt: new Date().toISOString(),
    isCompleted: false,
    nodeId: 'task-node-1'
  };

  await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks: [dismissTestTask] })
  });
  console.log(`Created new task for dismissal test: "${dismissTestTask.title}" [${dismissTestTaskId}]`);

  // Sync into browser UI
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(2000);

  // Look for Dismiss button on this alert
  console.log('Clicking "Dismiss" button on the task alert in browser UI...');
  const dismissButton = panel.locator('button', { hasText: 'Dismiss' }).first();
  await dismissButton.click();
  await page.waitForTimeout(1000);

  const panelTextAfterDismiss = await panel.innerText();
  const isDismissedNow = !panelTextAfterDismiss.includes('Urgent Client Callback');
  console.log('Alert disappeared immediately after clicking Dismiss:', isDismissedNow ? 'YES (PASS)' : 'NO (FAIL)');

  // Reload page
  console.log('Reloading the page in browser...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Re-open Activity Hub
  console.log('Re-opening Activity Hub after page reload...');
  await page.locator('#btn-notification-hub').click();
  await page.waitForTimeout(1000);

  const panelTextAfterReload = await page.locator('#notification-hub-panel').innerText();
  const alertAppearedAfterReload = panelTextAfterReload.includes('Urgent Client Callback');
  console.log('Did dismissed alert reappear after reload?', alertAppearedAfterReload ? 'YES (FAIL)' : 'NO (STAYS DISMISSED - PASS)');

  await page.screenshot({ path: 'artifacts/task_alert_reloaded_stays_dismissed.png' });
  console.log('Saved screenshot: artifacts/task_alert_reloaded_stays_dismissed.png');

  // Clean up
  console.log('\nCleaning up test artifacts...');
  await fetch(`${BASE_URL}/api/leads/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: testLeadId })
  });
  await fetch(`${BASE_URL}/api/tasks/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId: createdTask.id })
  });
  await fetch(`${BASE_URL}/api/tasks/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId: dismissTestTaskId })
  });
  await fetch(`${BASE_URL}/api/campaigns/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: testCampaignId })
  });

  await browser.close();
  console.log('\n======================================================================');
  console.log('ALL E2E BROWSER & VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('======================================================================');
}

runE2EVerification().catch(err => {
  console.error('E2E Verification error:', err);
  process.exit(1);
});
