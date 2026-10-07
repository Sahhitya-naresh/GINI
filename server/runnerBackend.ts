import type { BackendLead, BackendCampaign, BackendSender } from './mongoBackend.ts';
import { 
  listLeads, 
  listCampaigns, 
  updateLead, 
  loadLocalSenders, 
  saveLocalSenders,
  loadLocalTasks,
  saveLocalTasks
} from './mongoBackend.ts';
import { checkAppThreadForReply, sendAppEmail } from './msGraphService.ts';
import { getPublicBaseUrl } from './urlHelper.ts';
import { DEFAULT_STAGE_TEMPLATES } from '../src/data/defaultTemplates.ts';

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
  leadEmail?: string;
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
 * Uses the server-side app-only Microsoft Graph service account to check the fixed mailbox.
 */
async function checkLeadForReply(
  lead: BackendLead,
  _token?: string,
  _userEmail?: string,
  _sender?: BackendSender
): Promise<{ hasReplied: boolean; reason?: string }> {
  // 1. Check explicit reply indicators on lead record
  if (lead.status === 'Replied') {
    return { hasReplied: true, reason: 'Status already marked Replied' };
  }
  if ((lead as any).hasReplied === true || (lead as any).hasUnreadReply === true || (lead as any).lastReplyReceivedDate) {
    return { hasReplied: true, reason: 'Incoming reply flag detected on lead record' };
  }

  // 2. Query fixed service account mailbox via Microsoft Graph
  try {
    const res = await checkAppThreadForReply({
      leadEmail: lead.email,
      threadId: lead.threadId,
      lastSentDate: lead.lastEmailSentDate
    });

    if (res.hasReplied) {
      const fromInfo = res.replyMessage?.from ? ` (${res.replyMessage.from})` : '';
      return {
        hasReplied: true,
        reason: `Lead reply detected in Microsoft Graph service account mailbox${fromInfo}`
      };
    }
  } catch (err) {
    console.warn(`Error checking thread for reply on lead ${lead.email} via Graph:`, err);
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

/**
 * Computes delay duration in milliseconds from a node's configured timer.
 * Returns 0 if value is not set or <= 0 (immediate transition fallback).
 */
export function getStepDelayMs(value?: number, unit?: string): number {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) return 0;
  switch (unit) {
    case 'seconds':
      return value * 1000;
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 1000;
  }
}

/**
 * Safely parses nodeEnteredDate, supporting both full ISO 8601 timestamps and legacy YYYY-MM-DD date strings.
 */
export function parseNodeEnteredTime(dateStr?: string, fallbackMs = Date.now()): number {
  if (!dateStr) return fallbackMs;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? fallbackMs : parsed;
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
      // Must not be Paused, Completed, Broke Up, or Replied
      if (l.status === 'Paused' || l.status === 'Completed' || l.status === 'Broke Up' || l.status === 'Replied') {
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
          lead.campaign = campaign.name;
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = new Date().toISOString();
          const initDelayMs = getStepDelayMs(currentNode.data?.stepDelayValue, currentNode.data?.stepDelayUnit);
          if (initDelayMs > 0) {
            lead.nextSendDate = new Date(nowMs + initDelayMs).toISOString().split('T')[0];
          } else {
            lead.nextSendDate = todayStr;
          }
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
      // STEP 1: CHECK FOR REPLY FIRST
      // If found, pulls the lead to Needs Reply (status: Replied) instead of sending!
      // Look up sender record for this lead to use correct provider instance
      // --------------------------------------------------------------------
      const leadSender = 
        senders.find((s: any) => s.email === lead.senderUsed || s.id === lead.senderUsed) ||
        senders.find((s: any) => s.isPrimary) ||
        senders[0];

      const replyCheck = await checkLeadForReply(lead, token, userEmail, leadSender);
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
      // STEP 2: CUSTOM STEP DELAY TIMER (WAIT TIME AFTER PREVIOUS NODE)
      // Check if current node has a custom delay configured before executing.
      // If elapsed time since nodeEnteredDate < delay, postpone execution!
      // --------------------------------------------------------------------
      const stepDelayMs = getStepDelayMs(currentNode.data?.stepDelayValue, currentNode.data?.stepDelayUnit);
      if (stepDelayMs > 0) {
        const enteredMs = parseNodeEnteredTime(lead.nodeEnteredDate, nowMs);
        const elapsedMs = nowMs - enteredMs;
        if (elapsedMs < stepDelayMs) {
          const remainingSec = Math.ceil((stepDelayMs - elapsedMs) / 1000);
          const unit = currentNode.data?.stepDelayUnit || 'minutes';
          const val = currentNode.data?.stepDelayValue;
          logs.push(
            `Step delay active on node "${currentNode.data?.label || currentNode.id}" for ${lead.name} (${val} ${unit}). Elapsed: ${Math.max(0, Math.floor(elapsedMs / 1000))}s / Required: ${Math.floor(stepDelayMs / 1000)}s (${remainingSec}s remaining). Postponing execution.`
          );
          continue; // Custom step delay has not elapsed yet; postpone execution of this node
        }
      }

      // --------------------------------------------------------------------
      // STEP 3: WAIT NODE HANDLING
      // If current node is a Wait node, check if wait duration has already elapsed.
      // If elapsed, advance to next node!
      // --------------------------------------------------------------------
      if (rawNodeType === 'wait') {
        const waitDuration = currentNode.data?.waitDuration ?? currentNode.data?.waitDays ?? 1;
        const waitUnit = currentNode.data?.waitUnit || 'days';
        const enteredDate = parseNodeEnteredTime(lead.nodeEnteredDate, nowMs);

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
              lead.currentNodeId = nextNode.id;
              lead.nodeEnteredDate = new Date().toISOString();
              const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
              if (nextDelayMs > 0) {
                lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split('T')[0];
                logs.push(
                  `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advanced from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`
                );
                await updateLead(lead, token, spreadsheetId);
                advancedCount++;
                continue;
              } else {
                lead.nextSendDate = todayStr;
                logs.push(
                  `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advancing from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}".`
                );
                await updateLead(lead, token, spreadsheetId);
                currentNode = nextNode;
                rawNodeType = currentNode.data?.nodeType || currentNode.type || '';
                if (rawNodeType.endsWith('Node')) {
                  rawNodeType = rawNodeType.replace('Node', '');
                }
                advancedCount++;
              }
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
      // STEP 4: CONDITION NODE EVALUATION
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
        } else if (conditionType === 'has_linkedin_url') {
          conditionMet = Boolean(lead.linkedinUrl && String(lead.linkedinUrl).trim().length > 0);
        }

        const handleId = conditionMet ? 'yes' : 'no';
        const branchEdge = edges.find(
          (e: any) => e.source === currentNode.id && (e.sourceHandle === handleId || !e.sourceHandle)
        );

        if (branchEdge) {
          const nextNode = nodes.find((n: any) => n.id === branchEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = new Date().toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split('T')[0];
              logs.push(
                `Condition "${conditionType}" evaluated to ${conditionMet ? 'YES' : 'NO'} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`
              );
            } else {
              lead.nextSendDate = todayStr;
              logs.push(
                `Condition "${conditionType}" evaluated to ${conditionMet ? 'YES' : 'NO'} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}".`
              );
            }
            await updateLead(lead, token, spreadsheetId);
            advancedCount++;
          }
        }
        continue;
      }

      // --------------------------------------------------------------------
      // STEP 5: MANUAL TASK NODE
      // --------------------------------------------------------------------
      if (rawNodeType === 'manual_task' || rawNodeType === 'manualTask') {
        const localTasks = await loadLocalTasks();
        const existingTask = localTasks.find((t: any) =>
          t.nodeId === currentNode.id &&
          (t.leadId === lead.leadId || (!t.leadId && t.leadEmail && lead.email && t.leadEmail.toLowerCase() === lead.email.toLowerCase()))
        );

        if (!existingTask) {
          tasksCreated++;
          const firstName = lead.firstName || lead.name?.split(' ')[0] || lead.name || 'prospect';
          const rawTitle = currentNode.data?.taskTitle || currentNode.data?.label || 'Call {{first_name}}';
          const rawDesc = currentNode.data?.taskDescription || 'Direct outreach call regarding {{pain_point}}';
          const title = rawTitle
            .replace(/\{\{first_name\}\}/gi, firstName)
            .replace(/\{\{name\}\}/gi, lead.name || '')
            .replace(/\{\{company\}\}/gi, lead.company || '')
            .replace(/\{\{pain_point\}\}/gi, lead.painPoint || '');
          const instruction = rawDesc
            .replace(/\{\{first_name\}\}/gi, firstName)
            .replace(/\{\{name\}\}/gi, lead.name || '')
            .replace(/\{\{company\}\}/gi, lead.company || '')
            .replace(/\{\{pain_point\}\}/gi, lead.painPoint || '');

          const newTask: RunnerManualTask = {
            id: `task-${Date.now()}-${lead.leadId}`,
            leadId: lead.leadId,
            leadName: lead.name,
            leadEmail: lead.email,
            leadCompany: lead.company,
            campaignId: campaign.id,
            nodeId: currentNode.id,
            title,
            instruction,
            type: currentNode.data?.taskType || 'call',
            createdAt: new Date().toISOString(),
            isCompleted: false
          };
          localTasks.push(newTask);
          await saveLocalTasks(localTasks);

          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = new Date().toISOString();
          await updateLead(lead, token, spreadsheetId);

          logs.push(`Generated Manual Task for ${lead.name}: "${title}". Sequence paused until completed in Tasks tab.`);
          continue; // HALT: Do not send email
        }

        if (!existingTask.isCompleted) {
          logs.push(`Waiting for manual task completion: "${existingTask.title}" for ${lead.name}. Sequence paused.`);
          continue; // HALT: Do not send email
        }

        // If task is completed: advance downstream!
        const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
        if (outgoingEdge) {
          const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = new Date().toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split('T')[0];
              logs.push(`Manual Task "${existingTask.title}" completed. Advanced ${lead.name} to "${nextNode.data?.label || nextNode.id}" with ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit} delay.`);
              await updateLead(lead, token, spreadsheetId);
              advancedCount++;
              continue;
            } else {
              lead.nextSendDate = todayStr;
              logs.push(`Manual Task "${existingTask.title}" completed. Advanced ${lead.name} to "${nextNode.data?.label || nextNode.id}".`);
              await updateLead(lead, token, spreadsheetId);
              currentNode = nextNode;
              rawNodeType = currentNode.data?.nodeType || currentNode.type || '';
              if (rawNodeType.endsWith('Node')) {
                rawNodeType = rawNodeType.replace('Node', '');
              }
              advancedCount++;
            }
          }
        }
      }

      // --------------------------------------------------------------------
      // STEP 6: EMAIL NODE
      // Confirm:
      // 1. Sender's daily send limit is respected
      // 2. Schedule node's allowed sending days/hours is respected
      // 3. And ONLY THEN executes the email send node!
      // --------------------------------------------------------------------
      if (rawNodeType === 'email') {
        // 6.1 Determine sender account
        const senderId =
          startNode?.data?.senderId ||
          currentNode.data?.senderId ||
          currentNode.data?.senderEmail ||
          'sender-primary';

        const sender =
          senders.find((s: any) => s.id === senderId || s.email === senderId) ||
          senders.find((s: any) => s.isPrimary) ||
          senders[0];

        // 6.2 Respect connected sender's daily send limit
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

        // 6.3 Respect Schedule node's allowed sending days and hours
        const allowedSchedule = startNode?.data?.schedule;
        const scheduleCheck = isWithinSendingSchedule(allowedSchedule);
        if (!scheduleCheck.allowed) {
          logs.push(
            `Outside Schedule node's window for campaign "${campaign.name}": ${scheduleCheck.reason}. Postponing send for ${lead.name}.`
          );
          continue; // Postpone; do not send!
        }

        // 6.4 Check if send already occurred today for this lead
        if (lead.lastEmailSentDate === todayStr) {
          logs.push(`Lead ${lead.name} already received an email today (${todayStr}). Skipping duplicate send.`);
          continue;
        }

        // 6.5 ONLY THEN EXECUTE THE SEND:
        const stageNum = currentNode.data?.templateStage || (lead.currentStage + 1);
        const sendFromAccount = sender ? sender.email : (currentNode.data?.senderEmail || userEmail || 'Default Inbox');
        let template = DEFAULT_STAGE_TEMPLATES.find(t => t.stage === stageNum) || DEFAULT_STAGE_TEMPLATES[0];

        // Respect custom subject & body configured on the Email node
        if (currentNode.data?.useCustomTemplate && currentNode.data?.customSubject) {
          template = {
            ...template,
            stage: stageNum,
            subject: String(currentNode.data.customSubject),
            bodyHtml: (String(currentNode.data.customBody || '')).replace(/\n/g, '<br/>')
          };
        }

        const baseUrl = getPublicBaseUrl();
        try {
          const sendResult = await sendAppEmail({
            lead: lead as any,
            template,
            stageNum,
            senderDisplayName: sender?.name,
            baseUrl
          });
          lead.threadId = sendResult.threadId;
        } catch (sendErr: any) {
          logs.push(`Email dispatch to ${lead.name} failed via Graph: ${sendErr.message}. Skipping advance.`);
          continue;
        }

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
            lead.nodeEnteredDate = new Date().toISOString();
            const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
            if (nextDelayMs > 0) {
              lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split('T')[0];
              logs.push(
                `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}" (due after ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit}).`
              );
            } else {
              lead.nextSendDate = todayStr;
              logs.push(
                `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}".`
              );
            }
            advancedCount++;
          } else {
            lead.status = 'Completed';
            lead.nextSendDate = '';
            lead.currentNodeId = undefined;
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
            );
          }
        } else {
          lead.status = 'Completed';
          lead.nextSendDate = '';
          lead.currentNodeId = undefined;
          logs.push(
            `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
          );
        }

        await updateLead(lead, token, spreadsheetId);
        continue;
      }

      // --------------------------------------------------------------------
      // STEP 7: MERGE OR START NODE PASSTHROUGH
      // --------------------------------------------------------------------
      const outgoingEdge = edges.find((e: any) => e.source === currentNode.id);
      if (outgoingEdge) {
        const nextNode = nodes.find((n: any) => n.id === outgoingEdge.target);
        if (nextNode) {
          lead.currentNodeId = nextNode.id;
          lead.nodeEnteredDate = new Date().toISOString();
          const nextDelayMs = getStepDelayMs(nextNode.data?.stepDelayValue, nextNode.data?.stepDelayUnit);
          if (nextDelayMs > 0) {
            lead.nextSendDate = new Date(nowMs + nextDelayMs).toISOString().split('T')[0];
            logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}" (due after ${nextNode.data?.stepDelayValue} ${nextNode.data?.stepDelayUnit}).`);
          } else {
            lead.nextSendDate = todayStr;
            logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}".`);
          }
          await updateLead(lead, token, spreadsheetId);
          advancedCount++;
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
