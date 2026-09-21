import React, { useState, useMemo } from 'react';
import { Lead, StageTemplate, AppSettings, SendLogEntry, CampaignWorkflow, ConnectedSender, LeadManualTask } from '../types';
import { isLeadDueForNextSend, addBusinessDays, getTodayDateString, formatDisplayDate } from '../utils/dateUtils';
import { checkThreadForLeadReply, sendStageEmail } from '../services/gmailService';
import { updateLeadRow } from '../services/sheetsService';
import { isWithinSchedule, evaluateCondition, findNextNode, getLeadCurrentNodeId } from '../services/workflowService';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Mail, 
  Clock, 
  RefreshCw, 
  ChevronRight,
  ShieldCheck,
  Check,
  StopCircle,
  GitBranch,
  Phone
} from 'lucide-react';

interface CampaignSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  templates: StageTemplate[];
  settings: AppSettings;
  workflows?: CampaignWorkflow[];
  senders?: ConnectedSender[];
  token: string | null;
  userEmail: string;
  spreadsheetId: string;
  onRunCompleted: (updatedLeads: Lead[], logs: SendLogEntry[]) => void;
  onTasksCreated?: (newTasks: LeadManualTask[]) => void;
}

export const CampaignSchedulerModal: React.FC<CampaignSchedulerModalProps> = ({
  isOpen,
  onClose,
  leads,
  templates,
  settings,
  workflows = [],
  senders = [],
  token,
  userEmail,
  spreadsheetId,
  onRunCompleted,
  onTasksCreated
}) => {
  if (!isOpen) return null;

  const [isRunning, setIsRunning] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<SendLogEntry[]>([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('all');
  const [includeUnassigned, setIncludeUnassigned] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter leads that are active and due for their next stage send (excluding inactive campaigns)
  const allDueLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== 'Active') return false;
      const assignedWf = workflows.find(w => 
        w.id === l.campaignId || 
        (w.name && l.campaign && w.name.toLowerCase() === l.campaign.toLowerCase())
      );
      if (assignedWf && assignedWf.isActive === false) return false;
      return isLeadDueForNextSend(l.nextSendDate);
    });
  }, [leads, workflows]);

  // Selected workflow object
  const selectedWorkflow = useMemo(() => {
    if (selectedWorkflowId === 'all') return null;
    return workflows.find(w => w.id === selectedWorkflowId) || null;
  }, [selectedWorkflowId, workflows]);

  // Compute due counts per workflow
  const dueCountsByWorkflow = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workflows) {
      counts[w.id] = allDueLeads.filter(l => 
        l.campaignId === w.id || 
        (l.campaign && w.name && l.campaign.toLowerCase() === w.name.toLowerCase()) ||
        (w.isDefault && (!l.campaign || l.campaign === 'Default'))
      ).length;
    }
    return counts;
  }, [workflows, allDueLeads]);

  // Filtered due leads based on chosen workflow
  const dueLeads = useMemo(() => {
    if (selectedWorkflowId === 'all') {
      return allDueLeads;
    }
    const targetWf = selectedWorkflow;
    if (!targetWf) return allDueLeads;

    return allDueLeads.filter(l => {
      const matchesId = l.campaignId === targetWf.id;
      const matchesName = Boolean(l.campaign && targetWf.name && l.campaign.toLowerCase() === targetWf.name.toLowerCase());
      const isUnassigned = !l.campaignId && (!l.campaign || l.campaign === 'Default');

      if (matchesId || matchesName) return true;
      if (includeUnassigned && isUnassigned) return true;
      if (targetWf.isDefault && isUnassigned) return true;

      return false;
    });
  }, [allDueLeads, selectedWorkflowId, selectedWorkflow, includeUnassigned]);

  const handleStartCampaignRun = async () => {
    if (!token) {
      setValidationError('Please sign in with Google first to perform automated sends and reply checks.');
      return;
    }
    if (!spreadsheetId) {
      setValidationError('Please connect or create a Google Sheet first.');
      return;
    }

    setValidationError(null);
    setIsRunning(true);
    setExecutionLogs([]);
    setProgressIndex(0);

    const updatedLeadsList: Lead[] = [...leads];
    const newLogs: SendLogEntry[] = [];
    const today = getTodayDateString();

    for (let i = 0; i < dueLeads.length; i++) {
      const targetLead = dueLeads[i];
      setProgressIndex(i + 1);

      try {
        // Step 1: Check if lead has replied to existing thread
        if (targetLead.threadId) {
          const replyCheck = await checkThreadForLeadReply(
            token,
            targetLead.threadId,
            targetLead.email,
            userEmail,
            targetLead.lastEmailSentDate
          );

          if (replyCheck.hasReplied) {
            // Stop sequence permanently!
            const updatedLead: Lead = {
              ...targetLead,
              status: 'Replied',
              notes: targetLead.notes 
                ? `${targetLead.notes} | [Reply detected on ${today}]`
                : `Reply detected on ${today}`
            };

            // Update in Google Sheet
            await updateLeadRow(token, spreadsheetId, updatedLead);

            // Update local copy
            const idx = updatedLeadsList.findIndex(l => l.leadId === targetLead.leadId);
            if (idx !== -1) updatedLeadsList[idx] = updatedLead;

            newLogs.push({
              id: `${Date.now()}-${i}`,
              timestamp: new Date().toLocaleTimeString(),
              leadId: targetLead.leadId,
              leadName: targetLead.name,
              leadEmail: targetLead.email,
              stage: targetLead.currentStage,
              status: 'reply_detected',
              details: `Reply received! Sequence stopped permanently. Moved to "Needs Manual Reply".`
            });
            setExecutionLogs([...newLogs]);
            continue; // Do NOT send next stage email
          }
        }

        // Step 2: Determine Campaign Workflow & Sender Schedule
        const assignedWorkflow = selectedWorkflow || workflows.find(w => 
          w.id === targetLead.campaignId || 
          (w.name && targetLead.campaign && w.name.toLowerCase() === targetLead.campaign.toLowerCase()) ||
          w.isDefault
        ) || workflows[0];

        // Step 2.0: Check if campaign is marked Inactive (Inactive campaigns are NEVER touched)
        if (assignedWorkflow && assignedWorkflow.isActive === false) {
          newLogs.push({
            id: `${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            leadId: targetLead.leadId,
            leadName: targetLead.name,
            leadEmail: targetLead.email,
            stage: targetLead.currentStage,
            status: 'skipped',
            details: `Skipped: Campaign "${assignedWorkflow.name}" is marked Inactive. Inactive campaigns are never touched.`
          });
          setExecutionLogs([...newLogs]);
          continue;
        }

        // Step 2.05: Check if current node is a Wait node
        if (assignedWorkflow && targetLead.currentNodeId) {
          const currentNode = assignedWorkflow.nodes.find(n => n.id === targetLead.currentNodeId);
          const isWait = currentNode && (currentNode.type === 'waitNode' || currentNode.data?.nodeType === 'wait');
          if (isWait) {
            const waitDuration = currentNode.data?.waitDuration ?? currentNode.data?.waitDays ?? 1;
            const waitUnit = currentNode.data?.waitUnit || 'days';
            const enteredDate = targetLead.nodeEnteredDate ? new Date(targetLead.nodeEnteredDate).getTime() : Date.now();
            let elapsed = 0;
            if (waitUnit === 'hours') {
              elapsed = Math.floor((Date.now() - enteredDate) / (1000 * 60 * 60));
            } else if (waitUnit === 'minutes') {
              elapsed = Math.floor((Date.now() - enteredDate) / (1000 * 60));
            } else {
              elapsed = Math.floor((Date.now() - enteredDate) / (1000 * 60 * 60 * 24));
            }

            if (elapsed >= waitDuration) {
              // Wait duration satisfied! Advance along outgoing edge
              const outgoingEdge = assignedWorkflow.edges.find(e => e.source === currentNode.id);
              if (outgoingEdge) {
                const nextNode = assignedWorkflow.nodes.find(n => n.id === outgoingEdge.target);
                if (nextNode) {
                  targetLead.currentNodeId = nextNode.id;
                  targetLead.nodeEnteredDate = today;
                  newLogs.push({
                    id: `${Date.now()}-${i}-wait`,
                    timestamp: new Date().toLocaleTimeString(),
                    leadId: targetLead.leadId,
                    leadName: targetLead.name,
                    leadEmail: targetLead.email,
                    stage: targetLead.currentStage,
                    status: 'skipped',
                    details: `Wait satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed). Advanced to "${nextNode.data?.label || nextNode.id}".`
                  });
                }
              }
            } else {
              // Still waiting
              newLogs.push({
                id: `${Date.now()}-${i}`,
                timestamp: new Date().toLocaleTimeString(),
                leadId: targetLead.leadId,
                leadName: targetLead.name,
                leadEmail: targetLead.email,
                stage: targetLead.currentStage,
                status: 'skipped',
                details: `Waiting in "${currentNode.data?.label || 'Wait'}" (${elapsed}/${waitDuration} ${waitUnit} elapsed). Postponed.`
              });
              setExecutionLogs([...newLogs]);
              continue;
            }
          }
        }

        // Step 2.1: Check if lead completed all stages in this workflow
        const workflowEmailNodes = assignedWorkflow?.nodes.filter(n => n.type === 'emailNode') || [];
        const maxWorkflowStages = workflowEmailNodes.length > 0 ? workflowEmailNodes.length : 7;

        if (targetLead.currentStage >= maxWorkflowStages) {
          const updatedLead: Lead = {
            ...targetLead,
            status: 'Broke Up',
            notes: targetLead.notes ? `${targetLead.notes} | [Completed sequence - Broke Up]` : 'Completed sequence - Broke Up'
          };
          await updateLeadRow(token, spreadsheetId, updatedLead);
          const idx = updatedLeadsList.findIndex(l => l.leadId === targetLead.leadId);
          if (idx !== -1) updatedLeadsList[idx] = updatedLead;

          newLogs.push({
            id: `${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            leadId: targetLead.leadId,
            leadName: targetLead.name,
            leadEmail: targetLead.email,
            stage: targetLead.currentStage,
            status: 'skipped',
            details: `Completed all ${maxWorkflowStages} stages with no reply. Marked status as "Broke Up".`
          });
          setExecutionLogs([...newLogs]);
          continue;
        }

        const startNode = assignedWorkflow?.nodes.find(n => n.type === 'startNode');
        const allowedSchedule = startNode?.data?.schedule;
        
        // Validate schedule window (allowed days and hours)
        if (allowedSchedule && !isWithinSchedule(allowedSchedule)) {
          newLogs.push({
            id: `${Date.now()}-${i}`,
            timestamp: new Date().toLocaleTimeString(),
            leadId: targetLead.leadId,
            leadName: targetLead.name,
            leadEmail: targetLead.email,
            stage: targetLead.currentStage,
            status: 'skipped',
            details: `Postponed: Outside scheduled window for flow "${assignedWorkflow.name}" (${allowedSchedule.allowedDays?.length || 5} days/wk, ${allowedSchedule.startHour}:00 - ${allowedSchedule.endHour}:00).`
          });
          setExecutionLogs([...newLogs]);
          continue;
        }

        // Determine Sender Account from Start Node
        const senderId = startNode?.data?.senderId || 'sender-primary';
        const senderObj = senders.find(s => s.id === senderId) || senders.find(s => s.isPrimary) || senders[0];
        const effectiveSenderName = senderObj?.name || settings.senderName;

        // Validate connected sender's daily send limit
        if (senderObj) {
          const dailyLimit = senderObj.dailySendLimit || 150;
          const sendsToday = senderObj.sendsToday || 0;
          if (sendsToday >= dailyLimit) {
            newLogs.push({
              id: `${Date.now()}-${i}`,
              timestamp: new Date().toLocaleTimeString(),
              leadId: targetLead.leadId,
              leadName: targetLead.name,
              leadEmail: targetLead.email,
              stage: targetLead.currentStage,
              status: 'skipped',
              details: `Postponed: Connected sender "${senderObj.name}" (${senderObj.email}) reached daily send limit (${sendsToday}/${dailyLimit}).`
            });
            setExecutionLogs([...newLogs]);
            continue;
          }
        }

        // Step 3: Send next stage email
        const nextStageNum = targetLead.currentStage + 1;
        const stageTemplate = templates.find(t => t.stage === nextStageNum) || templates[0];
        const gapDays = settings.stageGapDays[nextStageNum] || stageTemplate.defaultGapDays || 3;

        const sendResult = await sendStageEmail(
          token,
          targetLead,
          stageTemplate,
          userEmail,
          effectiveSenderName
        );

        // Increment sender sends count
        if (senderObj) {
          senderObj.sendsToday = (senderObj.sendsToday || 0) + 1;
        }

        const newNextSendDate = nextStageNum < maxWorkflowStages ? addBusinessDays(today, gapDays) : '';
        const nextNodeId = assignedWorkflow ? `node-email-${nextStageNum}` : undefined;

        const updatedLead: Lead = {
          ...targetLead,
          currentStage: nextStageNum,
          currentNodeId: nextNodeId,
          campaignId: assignedWorkflow?.id,
          campaign: assignedWorkflow?.name || targetLead.campaign,
          senderUsed: senderObj?.email || userEmail,
          nodeEnteredDate: today,
          threadId: sendResult.threadId,
          lastEmailSentDate: today,
          nextSendDate: newNextSendDate,
          status: 'Active'
        };

        // Check if there is an immediate manual task node downstream
        if (assignedWorkflow && onTasksCreated) {
          const nextDownstream = findNextNode(nextNodeId || '', assignedWorkflow);
          if (nextDownstream && nextDownstream.data.nodeType === 'manual_task') {
            const newTask: LeadManualTask = {
              id: `task-${Date.now()}-${i}`,
              leadId: targetLead.leadId,
              leadName: targetLead.name,
              leadEmail: targetLead.email,
              company: targetLead.company,
              campaignId: assignedWorkflow.id,
              campaignName: assignedWorkflow.name,
              nodeId: nextDownstream.id,
              title: (nextDownstream.data.taskTitle || 'Call prospect').replace('{{first_name}}', targetLead.firstName || targetLead.name),
              description: (nextDownstream.data.taskDescription || 'Follow up task').replace('{{pain_point}}', targetLead.painPoint || ''),
              dueDate: addBusinessDays(today, nextDownstream.data.taskDueDateOffsetDays || 1),
              priority: nextDownstream.data.taskPriority || 'medium',
              isCompleted: false,
              createdAt: new Date().toISOString()
            };
            onTasksCreated([newTask]);
          }
        }

        // Update in Google Sheet
        await updateLeadRow(token, spreadsheetId, updatedLead);

        // Update local copy
        const idx = updatedLeadsList.findIndex(l => l.leadId === targetLead.leadId);
        if (idx !== -1) updatedLeadsList[idx] = updatedLead;

        newLogs.push({
          id: `${Date.now()}-${i}`,
          timestamp: new Date().toLocaleTimeString(),
          leadId: targetLead.leadId,
          leadName: targetLead.name,
          leadEmail: targetLead.email,
          stage: nextStageNum,
          status: 'sent',
          details: `[${assignedWorkflow.name}] Dispatched Stage ${nextStageNum}: "${stageTemplate.name}" via ${senderObj?.name || 'Gmail'}. Next send: ${newNextSendDate || 'Completed'}.`
        });
        setExecutionLogs([...newLogs]);

      } catch (err: any) {
        console.error(`Error processing lead ${targetLead.name}:`, err);
        newLogs.push({
          id: `${Date.now()}-${i}`,
          timestamp: new Date().toLocaleTimeString(),
          leadId: targetLead.leadId,
          leadName: targetLead.name,
          leadEmail: targetLead.email,
          stage: targetLead.currentStage + 1,
          status: 'failed',
          details: `Error: ${err.message || 'Send failed'}`
        });
        setExecutionLogs([...newLogs]);
      }
    }

    setIsRunning(false);
    onRunCompleted(updatedLeadsList, newLogs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        id="scheduler-modal-dialog"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-red-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Campaign Sequencing Runner</h2>
              <p className="text-xs text-slate-500">
                Automated reply polling and due email sequence dispatch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{validationError}</span>
              </div>
              <button 
                onClick={() => setValidationError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {/* Workflow Selector */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label htmlFor="scheduler-workflow-select" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <span>Choose Workflow to Run:</span>
              </label>

              {selectedWorkflow && (
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedWorkflow.nodes?.filter(n => n.type === 'emailNode').length || 0} stages &bull; {selectedWorkflow.nodes?.length || 0} nodes
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  id="scheduler-workflow-select"
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  disabled={isRunning}
                  className="w-full text-xs font-bold text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">
                    All Workflows ({allDueLeads.length} leads due total)
                  </option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} {wf.isDefault ? '• (Default)' : ''} — ({dueCountsByWorkflow[wf.id] || 0} due)
                    </option>
                  ))}
                </select>
              </div>

              {selectedWorkflowId !== 'all' && (
                <div className="flex items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeUnassigned}
                      onChange={(e) => setIncludeUnassigned(e.target.checked)}
                      disabled={isRunning}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Include unassigned leads</span>
                  </label>
                </div>
              )}
            </div>

            {selectedWorkflow && (
              <p className="text-[11px] text-slate-500">
                Running leads assigned to <strong>"{selectedWorkflow.name}"</strong>
                {includeUnassigned ? ' and active leads without a specific campaign tag.' : '.'}
              </p>
            )}
          </div>

          {/* Due Leads Summary Box */}
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-red-900 uppercase tracking-wider">
                {selectedWorkflowId === 'all' ? 'All Leads Due Today' : `Leads Due for "${selectedWorkflow?.name || 'Selected Flow'}"`}
              </span>
              <p className="text-2xl font-bold text-red-950 mt-0.5">
                {dueLeads.length} <span className="text-sm font-normal text-red-700">leads ready for next stage</span>
              </p>
            </div>

            <div className="text-right text-xs text-red-700 space-y-0.5">
              <p>Criteria: <strong className="text-red-900">Status = Active</strong></p>
              <p>Next Send Date: <strong className="text-red-900">&le; Today ({getTodayDateString()})</strong></p>
            </div>
          </div>

          {/* Logic Steps Checklist */}
          <div className="space-y-2 text-xs text-slate-600 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Automated Execution Safeguards:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li><strong>Polls Gmail Thread:</strong> Before each send, verifies if the lead sent a reply.</li>
              <li><strong>Reply Safety Brake:</strong> If reply is detected, status instantly becomes <em>Replied</em> and all future stages halt permanently.</li>
              <li><strong>Threaded Send:</strong> Sends stage email inside the existing conversation thread (with <em>In-Reply-To</em> headers).</li>
              <li><strong>Calculates Next Schedule:</strong> Advances stage (+1) and computes next date (+3 business days, skipping weekends).</li>
              <li><strong>Direct Sheet Sync:</strong> Writes the updated row directly back to Google Sheets.</li>
            </ol>
          </div>

          {/* Due Leads Table Preview */}
          {!isRunning && executionLogs.length === 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Queued Due Leads:</h4>
              {dueLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                  No active leads are currently due for sending today. Check back tomorrow or adjust next send dates in the leads table.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {dueLeads.map((lead) => (
                    <div key={lead.leadId} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <strong className="text-slate-900">{lead.name}</strong>
                        <span className="text-slate-500 ml-1">({lead.company})</span>
                        <div className="text-[11px] text-slate-400">{lead.email}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-red-600 font-semibold">
                          Stage {lead.currentStage} &rarr; {lead.currentStage + 1}
                        </span>
                        <div className="text-[11px] text-slate-400">Due: {formatDisplayDate(lead.nextSendDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Progress Bar */}
          {isRunning && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-red-700 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing due leads ({progressIndex} of {dueLeads.length})...
                </span>
                <span className="text-slate-600">
                  {Math.round((progressIndex / Math.max(dueLeads.length, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progressIndex / Math.max(dueLeads.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Execution Logs */}
          {executionLogs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Execution Log:</h4>
              <div className="bg-slate-950 text-slate-100 font-mono text-xs p-3 rounded-xl max-h-48 overflow-y-auto space-y-1.5">
                {executionLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    {log.status === 'sent' && <span className="text-emerald-400">[SENT]</span>}
                    {log.status === 'reply_detected' && <span className="text-amber-400">[REPLIED]</span>}
                    {log.status === 'skipped' && <span className="text-blue-400">[SKIP]</span>}
                    {log.status === 'failed' && <span className="text-red-400">[ERROR]</span>}
                    <span className="text-slate-300">
                      <strong>{log.leadName}:</strong> {log.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          {!isRunning && dueLeads.length > 0 && executionLogs.length === 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-amber-900 leading-relaxed">
                  I confirm dispatching stage emails and updating Google Sheet rows for these <strong>{dueLeads.length}</strong> leads through my connected Gmail account.
                </span>
              </label>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {executionLogs.length > 0 ? 'Done' : 'Cancel'}
          </button>

          {executionLogs.length === 0 && dueLeads.length > 0 && (
            <button
              onClick={handleStartCampaignRun}
              disabled={isRunning || !isConfirmed}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-lg shadow-xs shadow-red-500/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Automated Campaign Check & Send ({dueLeads.length})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
