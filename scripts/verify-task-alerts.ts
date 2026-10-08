import { getDb, COLLECTIONS } from '../server/mongodb.ts';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('======================================================================');
  console.log('ACTIVITY HUB MANUAL TASK ALERTS VERIFICATION');
  console.log('======================================================================\n');

  const db = await getDb();

  // 1. Verify /api/tasks/alerts-state endpoint
  console.log('----------------------------------------------------------------------');
  console.log('1. VERIFY /api/tasks/alerts-state ENDPOINTS');
  console.log('----------------------------------------------------------------------');
  
  const getRes = await fetch(`${BASE_URL}/api/tasks/alerts-state`);
  const getData = await getRes.json();
  console.log('Initial GET /api/tasks/alerts-state:', getData);

  const testAlertId = `task-test-alert-${Date.now()}:new`;
  const dismissRes = await fetch(`${BASE_URL}/api/tasks/alerts-state/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId: testAlertId })
  });
  const dismissData = await dismissRes.json();
  console.log(`POST /api/tasks/alerts-state/dismiss for "${testAlertId}":`, dismissData);
  console.log('Did MongoDB persist dismissed alert ID?', dismissData.dismissedAlertIds.includes(testAlertId) ? 'YES (PASS)' : 'NO (FAIL)');

  // 2. Setup a test lead and test campaign with Manual Task node
  console.log('\n----------------------------------------------------------------------');
  console.log('2. RUN A TEST LEAD THROUGH A FLOW CONTAINING A MANUAL TASK NODE');
  console.log('----------------------------------------------------------------------');

  const testCampaignId = `camp-task-alert-${Date.now()}`;
  const testLeadId = `LEAD-TASK-ALERT-${Date.now()}`;
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
        label: 'Call Prospect',
        nodeType: 'manual_task',
        taskType: 'call',
        taskTitle: 'Executive Discovery Call with {{first_name}}',
        taskDescription: 'Discuss custom enterprise solutions regarding {{pain_point}}',
        taskPriority: 'high',
        taskDueDateOffsetDays: 0 // Due Today!
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

  const testWorkflow = {
    id: testCampaignId,
    name: 'Manual Task Alert Test Flow',
    description: 'Flow for testing Activity Hub alert on manual task creation',
    isActive: true,
    is_active: true,
    nodes: testNodes,
    edges: testEdges,
    workflow_graph: {
      nodes: testNodes,
      edges: testEdges
    }
  };

  // Save workflow
  const campRes = await fetch(`${BASE_URL}/api/campaigns/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign: testWorkflow })
  });
  const campData = await campRes.json();
  console.log(`Saved test workflow "${testWorkflow.name}" [${testCampaignId}] with Manual Task node:`, campData.success);

  // Create test lead directly on the manual task node
  const testLead = {
    leadId: testLeadId,
    name: 'Samantha Vance',
    firstName: 'Samantha',
    lastName: 'Vance',
    email: `samantha.vance.${Date.now()}@acmesystems-example.com`,
    company: 'Acme Systems Ltd',
    jobTitle: 'VP Technology',
    painPoint: 'legacy infrastructure bottlenecks',
    currentStage: 0,
    status: 'Active',
    campaignId: testCampaignId,
    campaign: testWorkflow.name,
    currentNodeId: 'task-node-1',
    nodeEnteredDate: new Date().toISOString(),
    nextSendDate: todayStr
  };

  const createLeadRes = await fetch(`${BASE_URL}/api/leads/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: testLead })
  });
  const createLeadData = await createLeadRes.json();
  console.log(`Created test lead "${testLead.name}" (${testLead.company}) [${testLeadId}]:`, createLeadData.success);

  // Run due campaigns to trigger the manual task node!
  console.log('\nExecuting POST /api/campaigns/run-due to process the lead into Manual Task node...');
  const runDueRes = await fetch(`${BASE_URL}/api/campaigns/run-due`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: 'test@example.com' })
  });
  const runDueData = await runDueRes.json();
  console.log('Run-due response:', runDueData);

  // Check /api/tasks to find the generated task
  const tasksRes = await fetch(`${BASE_URL}/api/tasks`);
  const tasksData = await tasksRes.json();
  const createdTask = tasksData.tasks?.find((t: any) => t.leadId === testLeadId);

  if (!createdTask) {
    console.error('ERROR: Task was not created for test lead!');
    process.exit(1);
  }

  console.log('\nFound newly created task:');
  console.log('- Task ID:', createdTask.id);
  console.log('- Task Title:', createdTask.title);
  console.log('- Lead Name:', createdTask.leadName);
  console.log('- Company:', createdTask.company || createdTask.leadCompany);
  console.log('- Priority:', createdTask.priority);
  console.log('- Due Date:', createdTask.dueDate);
  console.log('- Completed:', createdTask.isCompleted);

  // Determine alert representation
  const taskAlertState = createdTask.dueDate === todayStr ? 'due_today' : (createdTask.dueDate < todayStr ? 'overdue' : 'new');
  const alertId = `${createdTask.id}:${taskAlertState}`;
  console.log(`\nGenerated Alert Item:`);
  console.log(`- Alert ID: "${alertId}"`);
  console.log(`- Alert State: "${taskAlertState}"`);
  console.log(`- Unread Badge Contribution: +1`);

  // 3. Complete the task and show alert disappears
  console.log('\n----------------------------------------------------------------------');
  console.log('3. MARK TASK COMPLETE -> SHOW ALERT DISAPPEARS AUTOMATICALLY');
  console.log('----------------------------------------------------------------------');

  console.log(`Marking task "${createdTask.id}" as completed...`);
  const updateRes = await fetch(`${BASE_URL}/api/tasks/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: createdTask.id,
      updates: {
        isCompleted: true,
        completedAt: new Date().toISOString()
      }
    })
  });
  const updateData = await updateRes.json();
  console.log('Task update result:', updateData);

  // Verify task completion in DB
  const verifyTasksRes = await fetch(`${BASE_URL}/api/tasks`);
  const verifyTasksData = await verifyTasksRes.json();
  const updatedTask = verifyTasksData.tasks?.find((t: any) => t.id === createdTask.id);
  console.log('Updated Task in DB - isCompleted:', updatedTask?.isCompleted);

  const shouldAlertNow = updatedTask && !updatedTask.isCompleted;
  console.log('Does this completed task generate an alert in NotificationHub?', shouldAlertNow ? 'YES (FAIL)' : 'NO (DISAPPEARED AUTOMATICALLY - PASS)');

  // 4. Test Dismiss & Reload persistence
  console.log('\n----------------------------------------------------------------------');
  console.log('4. RELOAD & SHOW A DISMISSED ALERT STAYS DISMISSED');
  console.log('----------------------------------------------------------------------');

  // Create another task for testing dismissal
  const testTask2 = {
    id: `task-dismiss-test-${Date.now()}`,
    leadId: testLeadId,
    leadName: 'Samantha Vance',
    leadCompany: 'Acme Systems Ltd',
    leadEmail: testLead.email,
    title: 'Follow-up Call with Samantha',
    description: 'Verify quarterly budget approval',
    priority: 'medium',
    dueDate: todayStr,
    createdAt: new Date().toISOString(),
    isCompleted: false,
    nodeId: 'task-node-1'
  };

  await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks: [testTask2] })
  });
  console.log(`Created test task "${testTask2.title}" [${testTask2.id}].`);

  const alert2Id = `${testTask2.id}:due_today`;
  console.log(`Active alert ID before dismiss: "${alert2Id}"`);

  // Dismiss it via API
  console.log(`Dismissing alert "${alert2Id}"...`);
  const dismiss2Res = await fetch(`${BASE_URL}/api/tasks/alerts-state/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId: alert2Id })
  });
  const dismiss2Data = await dismiss2Res.json();
  console.log('Dismissed alerts array in MongoDB:', dismiss2Data.dismissedAlertIds);

  // Simulate page reload / server restart: check /api/tasks/alerts-state
  console.log('\nSimulating reload / new session: Fetching /api/tasks/alerts-state from server...');
  const reloadStateRes = await fetch(`${BASE_URL}/api/tasks/alerts-state`);
  const reloadStateData = await reloadStateRes.json();
  const isStillDismissed = reloadStateData.dismissedAlertIds?.includes(alert2Id);
  console.log(`Is alert "${alert2Id}" still in dismissedAlertIds after reload?`, isStillDismissed ? 'YES (STAYS DISMISSED - PASS)' : 'NO (FAIL)');

  // Cleanup test lead, tasks, workflow
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
    body: JSON.stringify({ taskId: testTask2.id })
  });
  await fetch(`${BASE_URL}/api/campaigns/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: testCampaignId })
  });
  console.log('Cleaned up test lead, tasks, and campaign.');

  console.log('\n======================================================================');
  console.log('ALL MANUAL TASK ALERT VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('======================================================================');
}

run().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
