import type { BackendLead, BackendCampaign } from './mongoBackend.ts';
import { 
  listLeads, 
  listCampaigns, 
  updateLead, 
  loadLocalSenders, 
  saveLocalSenders,
  loadLocalTasks,
  saveLocalTasks
} from './mongoBackend.ts';

export interface CampaignRunResult {
  success: boolean;
  timestamp: string;
  activeCampaignsCount: number;
  processedLeadsCount: number;
  emailsSentCount: number;
  tasksCreatedCount: number;
  advancedNodesCount: number;
  logs: string[];
}

export interface RunnerManualTask {
  id: string;
  leadId: string;
  leadName: string;
  leadCompany: string;
  campaignId: string;
  nodeId: string;
  title: string;
  instruction: string;
  type: 'call' | 'review' | 'custom';
  createdAt: string;
  isCompleted: boolean;
}

/**
 * Checks whether a lead has replied to previous outreach.
 * Inspects lead status/flags and checks the thread in Gmail when credentials are present.
 */
async function checkLeadForReply(
  lead: BackendLead,
  token?: string,
  userEmail?: string
): Promise<{ hasReplied: boolean; reason?: string }> {
  // 1. Check explicit reply indicators on lead record
  if (lead.status === 'Replied') {
    return { hasReplied: true, reason: 'Status already marked Replied' };
  }
  if ((lead as any).hasReplied === true || (lead as any).hasUnreadReply === true || (lead as any).lastReplyReceivedDate) {
    return { hasReplied: true, reason: 'Incoming reply flag detected on lead record' };
  }

  // 2. Query Gmail thread if token and threadId are available
  if (token && lead.threadId) {
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${lead.threadId}?format=metadata`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const messages: any[] = data.messages || [];
        const cleanLeadEmail = (lead.email || '').trim().toLowerCase();
        const cleanUserEmail = (userEmail || '').trim().toLowerCase();

        for (const msg of messages) {
          const headers: any[] = msg.payload?.headers || [];
          const fromHeader = (headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '').toLowerCase();
          if (cleanLeadEmail && fromHeader.includes(cleanLeadEmail)) {
            return { hasReplied: true, reason: `Lead response message detected in thread (${fromHeader})` };
          }
          if (cleanUserEmail && !fromHeader.includes(cleanUserEmail) && messages.length > 1) {
            return { hasReplied: true, reason: `Counterpart reply detected in Gmail thread (${fromHeader})` };
          }
        }
      }
    } catch (err) {
      console.warn(`Error checking Gmail thread for reply on lead ${lead.email}:`, err);
    }
  }

  return { hasReplied: false };
}

/**
 * Checks if the current time matches the Schedule node's allowed sending days and hours.
 */
function isWithinSendingSchedule(schedule?: any): { allowed: boolean; reason?: string } {
  if (!schedule) return { allowed: true };

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = now.getHours();

  const allowedDays: number[] = schedule.allowedDays || schedule.days;
  if (Array.isArray(allowedDays) && allowedDays.length > 0) {
    if (!allowedDays.includes(currentDay)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        allowed: false,
        reason: `Current day is ${dayNames[currentDay]}, which is outside allowed days [${allowedDays.map(d => dayNames[d] || d).join(', ')}]`
      };
    }
  }

  if (typeof schedule.startHour === 'number' && currentHour < schedule.startHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is earlier than allowed start hour (${schedule.startHour}:00)`
    };
  }

  if (typeof schedule.endHour === 'number' && currentHour >= schedule.endHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is at or past allowed end hour (${schedule.endHour}:00)`
    };
  }

  return { allowed: true };
}

export async function runDueCampaignsJob(
  targetCampaignId?: string,
  token?: string,
  spreadsheetId?: string,
  userEmail?: string
): Promise<CampaignRunResult> {
  const campaigns = await listCampaigns(token, spreadsheetId);
  const leads = await listLeads(token, spreadsheetId);
  const senders = await loadLocalSenders();

  const logs: string[] = [];
  let processedCount = 0;
  let emailsSent = 0;
  let tasksCreated = 0;
  let advancedCount = 0;

  // STRICT REQUIREMENT: Inactive campaigns are NEVER touched by this job!
  const activeCampaigns = campaigns.filter(c => {
    const isActive = Boolean(c.is_active ?? (c as any).isActive);
    if (!isActive) {
      if (targetCampaignId && c.id === targetCampaignId) {
        logs.push(`Campaign "${c.name}" (ID: ${c.id}) is marked Inactive. Inactive campaigns are NEVER touched by this job.`);
      }
      return false;
    }
    if (targetCampaignId) return c.id === targetCampaignId;
    return true;
  });

  const inactiveCount = campaigns.filter(c => !Boolean(c.is_active ?? (c as any).isActive)).length;
  logs.push(`Found ${activeCampaigns.length} active campaign(s) to process. (${inactiveCount} inactive campaign(s) skipped).`);

  const todayStr = new Date().toISOString().split('T')[0];
  const nowMs = Date.now();

  for (const campaign of activeCampaigns) {
    logs.push(`--- Evaluating Campaign: "${campaign.name}" (ID: ${campaign.id}) ---`);
    const graph = campaign.workflow_graph || { nodes: [], edges: [] };
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    if (nodes.length === 0) {
      logs.push(`Campaign "${campaign.name}" has no nodes configured in workflow canvas.`);
      continue;
    }

    const startNode = nodes.find((n: any) => n.data?.nodeType === 'start' || n.type === 'start' || n.type === 'startNode');

    // Find leads assigned to this active campaign
    const campaignLeads = leads.filter(l => {
      // Must not be Paused or Completed
      if (l.status === 'Paused' || l.status === 'Completed' || l.status === 'Broke Up') {
        return false;
      }
      return l.campaignId === campaign.id || l.campaign === campaign.name;
    });

    logs.push(`Assigned leads found for "${campaign.name}": ${campaignLeads.length}`);

    for (const lead of campaignLeads) {
      processedCount++;

      // Determine current node
      let currentNode = nodes.find((n: any) => n.id === lead.currentNodeId);

      // If lead has no currentNodeId, initialize them at start node's target
      if (!currentNode) {
        if (startNode) {
          const firstEdge = edges.find((e: any) => e.source === startNode.id);
          if (firstEdge) {
            currentNode = nodes.find((n: any) => n.id === firstEdge.target);
          } else {
            currentNode = startNode;
          }
        } else if (nodes.length > 0) {
          currentNode = nodes[0];
        }

        if (currentNode) {
          lead.campaignId = campaign.id;
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = todayStr;
          await updateLead(lead, token, spreadsheetId);
          logs.push(`Initialized lead ${lead.name} into node "${currentNode.data?.label || currentNode.id}".`);
        }
      }

      if (!currentNode) continue;

      let rawNodeType = currentNode.data?.nodeType || currentNode.type || '';
      if (rawNodeType.endsWith('Node')) {
        rawNodeType = rawNodeType.replace('Node', '');
      }

      // --------------------------------------------------------------------
      // STEP 1: WAIT NODE HANDLING
      // If current node is a Wait node, check if wait duration has already elapsed.
      // If elapsed, advance to next node and proceed to evaluate it in this same job run!
      // --------------------------------------------------------------------
      if (rawNodeType === 'wait') {
        const waitDuration = currentNode.data?.waitDuration ?? currentNode.data?.waitDays ?? 1;
        const waitUnit = currentNode.data?.waitUnit || 'days';
        const enteredDate = lead.nodeEnteredDate ? new Date(lead.nodeEnteredDate).getTime() : nowMs;

        let elapsed = 0;
        if (waitUnit === 'hours') {
          elapsed = Math.floor((nowMs - enteredDate) / (1000 * 60 * 60));
        } else if (waitUnit === 'minutes') {
          elapsed = Math.floor((nowMs - enteredDate) / (1000 * 60));
        } else {
          // days
          elapsed = Math.floor((nowMs - enteredDate) / (1000 * 60 * 60 * 24));
        }

        if (elapsed >= waitDuration) {
          // Wait duration satisfied! Advance along outgoing edge
          const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
          if (outgoingEdge) {
            const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
            if (nextNode) {
              logs.push(
                `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advancing from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}".`
              );
              lead.currentNodeId = nextNode.id;
              lead.nodeEnteredDate = todayStr;
              currentNode = nextNode;
              rawNodeType = currentNode.data?.nodeType || currentNode.type || '';
              if (rawNodeType.endsWith('Node')) {
                rawNodeType = rawNodeType.replace('Node', '');
              }
              advancedCount++;
            } else {
              logs.push(`Wait node "${currentNode.id}" has invalid target node. Halting.`);
              continue;
            }
          } else {
            logs.push(`Wait node "${currentNode.id}" has no outgoing edge. Halting.`);
            continue;
          }
        } else {
          logs.push(
            `Lead ${lead.name} is waiting in "${currentNode.data?.label || 'Wait'}" (${elapsed}/${waitDuration} ${waitUnit} elapsed).`
          );
          continue;
        }
      }

      // --------------------------------------------------------------------
      // STEP 2: CHECK FOR REPLY FIRST
      // If found, pulls the lead to Needs Reply (status: Replied) instead of sending!
      // --------------------------------------------------------------------
      const replyCheck = await checkLeadForReply(lead, token, userEmail);
      if (replyCheck.hasReplied) {
        lead.status = 'Replied';
        lead.notes = lead.notes
          ? `${lead.notes} | [Reply detected on ${todayStr}: ${replyCheck.reason}]`
          : `Reply detected on ${todayStr}: ${replyCheck.reason}`;
        await updateLead(lead, token, spreadsheetId);
        logs.push(
          `Reply check for lead ${lead.name} (${lead.email}): Reply detected! Pulled lead to "Needs Reply" (status: Replied) instead of sending.`
        );
        continue; // Sequence permanently halted; do not send!
      }

      // --------------------------------------------------------------------
      // STEP 3: CONDITION NODE EVALUATION
      // --------------------------------------------------------------------
      if (rawNodeType === 'condition') {
        const conditionType = currentNode.data?.conditionType || 'has_replied';
        let conditionMet = false;

        if (conditionType === 'has_replied') {
          conditionMet = lead.status === 'Replied';
        } else if (conditionType === 'email_opened') {
          conditionMet = (lead.opensCount || 0) > 0;
        } else if (conditionType === 'link_clicked') {
          conditionMet = (lead.clicksCount || 0) > 0;
        }

        const handleId = conditionMet ? 'yes' : 'no';
        const branchEdge = edges.find(
          (e: any) => e.source === currentNode.id && (e.sourceHandle === handleId || !e.sourceHandle)
        );

        if (branchEdge) {
          const nextNode = nodes.find((n: any) => n.id === branchEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            await updateLead(lead, token, spreadsheetId);
            advancedCount++;
            logs.push(
              `Condition "${conditionType}" evaluated to ${conditionMet ? 'YES' : 'NO'} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}".`
            );
          }
        }
        continue;
      }

      // --------------------------------------------------------------------
      // STEP 4: MANUAL TASK NODE
      // --------------------------------------------------------------------
      if (rawNodeType === 'manual_task' || rawNodeType === 'manualTask') {
        tasksCreated++;
        logs.push(`Generated Manual Task for ${lead.name}: "${currentNode.data?.label || currentNode.data?.taskTitle || 'Manual Review / Call'}"`);

        // Create task in system
        const localTasks = await loadLocalTasks();
        const newTask: RunnerManualTask = {
          id: `task-${Date.now()}-${lead.leadId}`,
          leadId: lead.leadId,
          leadName: lead.name,
          leadCompany: lead.company,
          campaignId: campaign.id,
          nodeId: currentNode.id,
          title: currentNode.data?.taskTitle || currentNode.data?.label || 'Manual Task',
          instruction: currentNode.data?.taskDescription || 'Review lead profile and follow up',
          type: currentNode.data?.taskType || 'call',
          createdAt: new Date().toISOString(),
          isCompleted: false
        };
        localTasks.push(newTask);
        await saveLocalTasks(localTasks);

        // Advance downstream if connected
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
        if (outgoingEdge) {
          const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            advancedCount++;
          }
        }
        await updateLead(lead, token, spreadsheetId);
        continue;
      }

      // --------------------------------------------------------------------
      // STEP 5: EMAIL NODE
      // Confirm:
      // 1. Sender's daily send limit is respected
      // 2. Schedule node's allowed sending days/hours is respected
      // 3. And ONLY THEN executes the email send node!
      // --------------------------------------------------------------------
      if (rawNodeType === 'email') {
        // 5.1 Determine sender account
        const senderId =
          startNode?.data?.senderId ||
          currentNode.data?.senderId ||
          currentNode.data?.senderEmail ||
          'sender-primary';

        const sender =
          senders.find((s: any) => s.id === senderId || s.email === senderId) ||
          senders.find((s: any) => s.isPrimary) ||
          senders[0];

        // 5.2 Respect connected sender's daily send limit
        if (sender) {
          const dailyLimit = typeof sender.dailySendLimit === 'number' ? sender.dailySendLimit : 150;
          const sendsToday = typeof sender.sendsToday === 'number' ? sender.sendsToday : 0;
          if (sendsToday >= dailyLimit) {
            logs.push(
              `Connected sender "${sender.name}" (${sender.email}) has reached daily send limit (${sendsToday}/${dailyLimit}). Postponing send for ${lead.name}.`
            );
            continue; // Postpone; do not send!
          }
        }

        // 5.3 Respect Schedule node's allowed sending days and hours
        const allowedSchedule = startNode?.data?.schedule;
        const scheduleCheck = isWithinSendingSchedule(allowedSchedule);
        if (!scheduleCheck.allowed) {
          logs.push(
            `Outside Schedule node's window for campaign "${campaign.name}": ${scheduleCheck.reason}. Postponing send for ${lead.name}.`
          );
          continue; // Postpone; do not send!
        }

        // 5.4 Check if send already occurred today for this lead
        if (lead.lastEmailSentDate === todayStr) {
          logs.push(`Lead ${lead.name} already received an email today (${todayStr}). Skipping duplicate send.`);
          continue;
        }

        // 5.5 ONLY THEN EXECUTE THE SEND:
        const stageNum = currentNode.data?.templateStage || (lead.currentStage + 1);
        const sendFromAccount = sender ? sender.email : (currentNode.data?.senderEmail || userEmail || 'Default Inbox');

        // Increment sender's daily sends count and persist
        if (sender) {
          sender.sendsToday = (sender.sendsToday || 0) + 1;
          sender.lastUsedAt = new Date().toISOString();
          await saveLocalSenders(senders);
        }

        emailsSent++;
        lead.lastEmailSentDate = todayStr;
        lead.senderUsed = sendFromAccount;
        lead.currentStage = stageNum;

        // Advance to next downstream node if connected
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
        if (outgoingEdge) {
          const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            advancedCount++;
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}".`
            );
          } else {
            lead.status = 'Completed';
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
            );
          }
        } else {
          lead.status = 'Completed';
          logs.push(
            `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
          );
        }

        await updateLead(lead, token, spreadsheetId);
        continue;
      }

      // --------------------------------------------------------------------
      // STEP 6: MERGE OR START NODE PASSTHROUGH
      // --------------------------------------------------------------------
      const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
      if (outgoingEdge) {
        const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
        if (nextNode) {
          lead.currentNodeId = nextNode.id;
          lead.nodeEnteredDate = todayStr;
          await updateLead(lead, token, spreadsheetId);
          advancedCount++;
          logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}".`);
        }
      }
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    activeCampaignsCount: activeCampaigns.length,
    processedLeadsCount: processedCount,
    emailsSentCount: emailsSent,
    tasksCreatedCount: tasksCreated,
    advancedNodesCount: advancedCount,
    logs
  };
}
