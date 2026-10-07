import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lead, StageTemplate, AppSettings, SendLogEntry, CampaignWorkflow, ConnectedSender, LeadManualTask, TrackingEvent } from './types';
import { 
  getOutlookProfile, 
  checkThreadForLeadReply, 
  sendStageEmail 
} from './services/outlookService';
import { checkLeadForReplyAndSave } from './services/replyService';
import { fetchTrackingStats, mergeTrackingWithLeads } from './services/trackingService';
import { loadSavedTemplates, saveTemplatesToStorage } from './data/defaultTemplates';
import { loadSettings, saveSettings } from './services/settingsService';
import { 
  loadSavedWorkflows, 
  saveWorkflows, 
  loadConnectedSenders, 
  saveConnectedSenders, 
  loadManualTasks, 
  saveManualTasks,
  createBlankWorkflow,
  fetchCampaignsFromBackend,
  saveCampaignToBackend,
  deleteCampaignFromBackend,
  toggleCampaignActiveOnBackend
} from './services/workflowService';
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  batchCreateLeads,
  fetchLeadsFromBackend,
  fetchSendersFromBackend,
  saveSendersToBackend
} from './services/leadBackendService';
import { addBusinessDays, getTodayDateString, isLeadDueForNextSend } from './utils/dateUtils';

// Pages
import {
  LeadsPage,
  NeedsReplyPage,
  WorkflowsPage,
  TasksPage,
  TemplatesPage,
  AnalyticsPage
} from './pages';

// Components & Modals
import { Header } from './components/Header';
import { LeadDetailModal } from './components/LeadDetailModal';
import { CampaignSchedulerModal } from './components/CampaignSchedulerModal';
import { AddLeadModal } from './components/AddLeadModal';
import { ImportLeadsModal } from './components/ImportLeadsModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { NotificationHub, AppActionLog } from './components/NotificationHub';

// Icons
import { AlertCircle, CheckCircle2, FileSpreadsheet, PlusCircle, Sparkles, Send, AlertTriangle, X } from 'lucide-react';

const INITIAL_FALLBACK_LEADS: Lead[] = [
  {
    leadId: 'LEAD-101',
    name: 'Alex Morgan',
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@techpulse-example.com',
    company: 'TechPulse Innovations',
    jobTitle: 'VP of Sales',
    industry: 'SaaS / Technology',
    campaign: 'Q3 Enterprise Outreach',
    painPoint: 'slow manual lead qualification pipeline',
    currentStage: 0,
    status: 'Active',
    lastEmailSentDate: '',
    nextSendDate: getTodayDateString(),
    threadId: '',
    notes: 'Key decision maker, met at TechSummit',
    opensCount: 2,
    clicksCount: 1,
    lastOpenedDate: getTodayDateString(),
    lastClickedDate: getTodayDateString(),
    rowIndex: 2
  },
  {
    leadId: 'LEAD-102',
    name: 'Jordan Lee',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@growthorbit-example.com',
    company: 'GrowthOrbit',
    jobTitle: 'Head of Growth',
    industry: 'Marketing Tech',
    campaign: 'Q3 Enterprise Outreach',
    painPoint: 'fragmented outreach messaging & poor response rates',
    currentStage: 1,
    status: 'Active',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -3),
    nextSendDate: getTodayDateString(),
    threadId: '',
    notes: 'Sent Intro Stage 1 last week, ready for Stage 2 Value Prop',
    opensCount: 1,
    clicksCount: 0,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -2),
    rowIndex: 3
  },
  {
    leadId: 'LEAD-103',
    name: 'Samira Patel',
    firstName: 'Samira',
    lastName: 'Patel',
    email: 'samira@nexusflow-example.com',
    company: 'NexusFlow Solutions',
    jobTitle: 'Chief Operating Officer',
    industry: 'Enterprise Software',
    campaign: 'Inbound Product Qualified',
    painPoint: 'high churn in prospect onboarding',
    currentStage: 2,
    status: 'Replied',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -2),
    nextSendDate: '',
    threadId: '',
    notes: 'Replied: "Sounds interesting, what is your pricing model?"',
    opensCount: 4,
    clicksCount: 2,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -2),
    lastClickedDate: addBusinessDays(getTodayDateString(), -2),
    rowIndex: 4
  },
  {
    leadId: 'LEAD-104',
    name: 'Marcus Vance',
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus.vance@apexretail-example.com',
    company: 'Apex Retail Group',
    jobTitle: 'Director of Operations',
    industry: 'Retail & Supply Chain',
    campaign: 'Q3 Enterprise Outreach',
    painPoint: 'outdated inventory sync and supplier latency',
    currentStage: 3,
    status: 'Paused',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -5),
    nextSendDate: addBusinessDays(getTodayDateString(), 7),
    threadId: '',
    notes: 'Paused at client request while undergoing internal reorganization',
    opensCount: 1,
    clicksCount: 0,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -4),
    rowIndex: 5
  },
  {
    leadId: 'LEAD-105',
    name: 'Elena Rostova',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@cloudscale-example.com',
    company: 'CloudScale Global',
    jobTitle: 'VP of Infrastructure',
    industry: 'Cloud Infrastructure',
    campaign: 'Cold Tech Leaders',
    painPoint: 'database migration bottlenecks and team burnout',
    currentStage: 7,
    status: 'Broke Up',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -10),
    nextSendDate: '',
    threadId: '',
    notes: 'Completed 7 stages with no reply; sequence closed out gracefully',
    opensCount: 0,
    clicksCount: 0,
    rowIndex: 6
  },
  {
    leadId: 'LEAD-106',
    name: 'David Chen',
    firstName: 'David',
    lastName: 'Chen',
    email: 'david.chen@finovate-example.com',
    company: 'Finovate Systems',
    jobTitle: 'Founder & CEO',
    industry: 'FinTech',
    campaign: 'Fintech Founders 2026',
    painPoint: 'lengthy compliance and transaction reconciliation cycles',
    currentStage: 3,
    status: 'Replied',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -1),
    nextSendDate: '',
    threadId: '',
    notes: 'Replied to Stage 3 case study: "Let us schedule a demo next Tuesday"',
    opensCount: 3,
    clicksCount: 2,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -1),
    lastClickedDate: addBusinessDays(getTodayDateString(), -1),
    rowIndex: 7
  },
  {
    leadId: 'LEAD-107',
    name: 'Claire Beauchamp',
    firstName: 'Claire',
    lastName: 'Beauchamp',
    email: 'claire@novasolutions-example.com',
    company: 'Nova AI Solutions',
    jobTitle: 'Chief Revenue Officer',
    industry: 'Artificial Intelligence',
    campaign: 'Inbound Product Qualified',
    painPoint: 'scaling outbound without sacrificing message personalization',
    currentStage: 2,
    status: 'Active',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -2),
    nextSendDate: getTodayDateString(),
    threadId: '',
    notes: 'Opened Stage 2 twice, link clicked to case studies',
    opensCount: 2,
    clicksCount: 1,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -1),
    lastClickedDate: addBusinessDays(getTodayDateString(), -1),
    rowIndex: 8
  },
  {
    leadId: 'LEAD-108',
    name: 'Brian Thorne',
    firstName: 'Brian',
    lastName: 'Thorne',
    email: 'brian.t@zenithlogistics-example.com',
    company: 'Zenith Logistics',
    jobTitle: 'Supply Chain Director',
    industry: 'Logistics',
    campaign: 'Fintech Founders 2026',
    painPoint: 'lack of visibility into third-party carrier delays',
    currentStage: 1,
    status: 'Active',
    lastEmailSentDate: addBusinessDays(getTodayDateString(), -4),
    nextSendDate: getTodayDateString(),
    threadId: '',
    notes: 'Sent initial value hook; opened email yesterday',
    opensCount: 1,
    clicksCount: 0,
    lastOpenedDate: addBusinessDays(getTodayDateString(), -1),
    rowIndex: 9
  }
];

const loadDismissedReplyAlerts = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem('outreach_dismissed_reply_alerts');
    if (raw) return new Set(JSON.parse(raw));
  } catch (_) {}
  return new Set();
};

const saveDismissedReplyAlerts = (keys: Set<string>) => {
  try {
    sessionStorage.setItem('outreach_dismissed_reply_alerts', JSON.stringify([...keys]));
  } catch (_) {}
};

export default function App() {
  // Service account mailbox state
  const [userEmail, setUserEmail] = useState<string>('');

  // App core state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<StageTemplate[]>(loadSavedTemplates());
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [spreadsheetName, setSpreadsheetName] = useState<string>('MongoDB Leads Database');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<Date | null>(null);
  const isBackgroundCheckingRef = useRef(false);
  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // Navigation & Routing
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo<'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'settings'>(() => {
    const segment = location.pathname.replace(/^\//, '').split('/')[0];
    switch (segment) {
      case 'replied': return 'replied';
      case 'workflows': return 'workflows';
      case 'tasks': return 'tasks';
      case 'templates': return 'templates';
      case 'analytics': return 'analytics';
      case 'settings': return 'settings';
      case 'leads':
      default:
        return 'leads';
    }
  }, [location.pathname]);

  const handleTabChange = useCallback((tab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'settings') => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      navigate(`/${tab}`);
    }
  }, [navigate]);

  const [leadsCampaignFilter, setLeadsCampaignFilter] = useState<string>('ALL');
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isConnectSheetOpen, setIsConnectSheetOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [replyAlertLeads, setReplyAlertLeads] = useState<Lead[]>([]);
  const dismissedReplyAlertsRef = useRef<Set<string>>(loadDismissedReplyAlerts());

  // Activity Log State for Notification Hub
  const [actionLogs, setActionLogs] = useState<AppActionLog[]>(() => {
    try {
      const saved = localStorage.getItem('gini_action_logs');
      return saved ? JSON.parse(saved) : [
        {
          id: 'init-1',
          type: 'general',
          title: 'Workspace Active',
          description: 'Giniiris Outreach engine initialized and connected to MongoDB',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    } catch {
      return [];
    }
  });

  const logAppAction = useCallback((type: AppActionLog['type'], title: string, description: string) => {
    const item: AppActionLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActionLogs(prev => {
      const updated = [item, ...prev].slice(0, 50);
      try {
        localStorage.setItem('gini_action_logs', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save action log:', e);
      }
      return updated;
    });
  }, []);

  const handleDismissReplyAlerts = useCallback((leadsToDismiss: Lead[]) => {
    if (leadsToDismiss.length === 0) return;

    for (const l of leadsToDismiss) {
      if (l.leadId) dismissedReplyAlertsRef.current.add(l.leadId);
      if (l.email) dismissedReplyAlertsRef.current.add(l.email.toLowerCase());
    }
    saveDismissedReplyAlerts(dismissedReplyAlertsRef.current);

    const dismissIds = new Set(leadsToDismiss.map(l => l.leadId || l.email?.toLowerCase()));
    setLeads(prev => prev.map(l =>
      (dismissIds.has(l.leadId) || (l.email && dismissIds.has(l.email.toLowerCase())))
        ? { ...l, hasUnreadReply: false }
        : l
    ));

    for (const l of leadsToDismiss) {
      fetch('/api/leads/mark-reply-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: l.leadId, email: l.email })
      }).catch(() => {});
    }

    setReplyAlertLeads([]);
  }, []);

  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailOpen(true);
    if ((lead as any).hasUnreadReply) {
      handleDismissReplyAlerts([lead]);
    }
  }, [handleDismissReplyAlerts]);

  // Workflow Builder & Senders State
  const [workflows, setWorkflows] = useState<CampaignWorkflow[]>(() => {
    const loaded = loadSavedWorkflows();
    if (loaded && loaded.length > 0) return loaded;
    const initial = [createBlankWorkflow('My Outreach Flow')];
    saveWorkflows(initial);
    return initial;
  });
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>(() => {
    try {
      const savedActiveId = localStorage.getItem('outreach_flow_active_workflow_id');
      if (savedActiveId && workflows.some(w => w.id === savedActiveId)) {
        return savedActiveId;
      }
    } catch (_) {}
    return workflows[0]?.id || '';
  });
  const [senders, setSenders] = useState<ConnectedSender[]>(() => loadConnectedSenders());
  const [manualTasks, setManualTasks] = useState<LeadManualTask[]>(() => loadManualTasks());
  const [leadNeedingCampaignSend, setLeadNeedingCampaignSend] = useState<Lead | null>(null);
  const [selectedCampaignForSend, setSelectedCampaignForSend] = useState<string>('');

  // Automatically load connected senders from backend on startup
  useEffect(() => {
    let isCancelled = false;
    async function loadSenders() {
      try {
        const backendSenders = await fetchSendersFromBackend();
        if (!isCancelled && Array.isArray(backendSenders) && backendSenders.length > 0) {
          setSenders(backendSenders);
          saveConnectedSenders(backendSenders);
        }
      } catch (err) {
        console.warn('Backend senders fetch error:', err);
      }
    }
    loadSenders();
    return () => { isCancelled = true; };
  }, []);

  // Automatically load manual tasks from backend on startup to keep localStorage in sync
  useEffect(() => {
    let isCancelled = false;
    async function loadTasks() {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.tasks)) {
            setManualTasks(data.tasks);
            saveManualTasks(data.tasks);
          }
        }
      } catch (err) {
        console.warn('Backend tasks fetch error:', err);
      }
    }
    loadTasks();
    return () => { isCancelled = true; };
  }, []);

  // Sync authenticated user email with primary sender without deleting other accounts
  useEffect(() => {
    if (!userEmail) return;
    setSenders(prev => {
      const idx = prev.findIndex(s => s.isPrimary || s.id === 'sender-primary');
      if (idx !== -1 && prev[idx].email !== userEmail) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          email: userEmail,
          name: updated[idx].name || 'Primary Workspace Account'
        };
        saveConnectedSenders(updated);
        saveSendersToBackend(updated).catch(() => {});
        return updated;
      }
      return prev;
    });
  }, [userEmail]);

  // Track selected campaign across sessions/reloads
  useEffect(() => {
    if (activeWorkflowId) {
      try {
        localStorage.setItem('outreach_flow_active_workflow_id', activeWorkflowId);
      } catch (_) {}
    }
  }, [activeWorkflowId]);

  // Automatically load campaigns from backend
  useEffect(() => {
    let isCancelled = false;
    async function loadCampaigns() {
      try {
        const backendWorkflows = await fetchCampaignsFromBackend(undefined, spreadsheetId || undefined);
        if (!isCancelled && backendWorkflows && backendWorkflows.length > 0) {
          setWorkflows(backendWorkflows);
          const savedActiveId = localStorage.getItem('outreach_flow_active_workflow_id');
          if (savedActiveId && backendWorkflows.some(w => w.id === savedActiveId)) {
            setActiveWorkflowId(savedActiveId);
          } else if (!backendWorkflows.some(w => w.id === activeWorkflowId)) {
            setActiveWorkflowId(backendWorkflows[0].id);
          }
        }
      } catch (err) {
        console.warn('Backend campaigns fetch error:', err);
      }
    }
    loadCampaigns();
    return () => { isCancelled = true; };
  }, [spreadsheetId]);

  // Workflow Handlers
  const handleSaveWorkflow = async (updated: CampaignWorkflow) => {
    setWorkflows(prev => {
      const idx = prev.findIndex(w => w.id === updated.id);
      let nextList: CampaignWorkflow[];
      if (idx !== -1) {
        nextList = [...prev];
        nextList[idx] = updated;
      } else {
        nextList = [...prev, updated];
      }
      saveWorkflows(nextList);
      return nextList;
    });

    try {
      await saveCampaignToBackend(updated, undefined, spreadsheetId || undefined);
      showToast(`Campaign "${updated.name}" saved!`, 'success');
    } catch (err: any) {
      console.warn('Saved locally, backend sync warning:', err);
      showToast(`Campaign "${updated.name}" saved locally`, 'info');
    }
  };

  const handleCreateWorkflow = async (newW: CampaignWorkflow) => {
    setWorkflows(prev => {
      const nextList = [...prev, newW];
      saveWorkflows(nextList);
      return nextList;
    });
    setActiveWorkflowId(newW.id);

    try {
      await saveCampaignToBackend(newW, undefined, spreadsheetId || undefined);
      logAppAction('workflow', 'New Workflow Created', `Created campaign sequence "${newW.name}".`);
      showToast(`Created workflow "${newW.name}"`, 'success');
    } catch (err: any) {
      logAppAction('workflow', 'Workflow Created (Local)', `Created campaign sequence "${newW.name}".`);
      showToast(`Created workflow "${newW.name}" locally`, 'info');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    setWorkflows(prev => {
      const nextList = prev.filter(w => w.id !== workflowId);
      saveWorkflows(nextList);
      if (activeWorkflowId === workflowId) {
        setActiveWorkflowId(nextList[0]?.id || '');
      }
      return nextList;
    });

    try {
      await deleteCampaignFromBackend(workflowId, undefined, spreadsheetId || undefined);
      showToast('Workflow deleted', 'info');
    } catch (err: any) {
      showToast('Workflow removed locally', 'info');
    }
  };

  const handleToggleWorkflowActive = async (workflowId: string, isActive: boolean) => {
    setWorkflows(prev => {
      const nextList = prev.map(w => w.id === workflowId ? { ...w, isActive, is_active: isActive } : w);
      saveWorkflows(nextList);
      return nextList;
    });

    try {
      await toggleCampaignActiveOnBackend(workflowId, isActive, undefined, spreadsheetId || undefined);
      logAppAction('workflow', `Workflow ${isActive ? 'Activated' : 'Paused'}`, `Workflow status updated to ${isActive ? 'Active' : 'Paused'}.`);
    } catch (err: any) {
      console.warn('Backend campaign toggle active warning:', err);
    }
  };

  const handleResetWorkflows = () => {
    const fresh = [createBlankWorkflow('My Outreach Flow')];
    setWorkflows(fresh);
    saveWorkflows(fresh);
    setActiveWorkflowId(fresh[0].id);
    showToast('Reset to a fresh workflow from scratch', 'success');
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const target = workflows.find(w => w.id === workflowId);
    if (!target) return;
    const duplicated: CampaignWorkflow = {
      ...target,
      id: `workflow-${Date.now()}`,
      name: `${target.name} (Copy)`,
      isDefault: false,
      updatedAt: new Date().toISOString()
    };
    handleCreateWorkflow(duplicated);
  };

  const handleSaveSenders = (updatedSenders: ConnectedSender[]) => {
    setSenders(updatedSenders);
    saveConnectedSenders(updatedSenders);
    saveSendersToBackend(updatedSenders).catch(() => {});
    showToast('Sender accounts configuration updated!', 'success');
  };

  const handleToggleManualTask = async (taskId: string) => {
    const targetTask = manualTasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const willBeCompleted = !targetTask.isCompleted;

    // 1. Update task in local state and localStorage
    const updatedTasks = manualTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: willBeCompleted,
          completedAt: willBeCompleted ? new Date().toISOString() : undefined
        };
      }
      return t;
    });
    setManualTasks(updatedTasks);
    saveManualTasks(updatedTasks);

    // 2. Persist task status to backend MongoDB
    try {
      await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          updates: {
            isCompleted: willBeCompleted,
            completedAt: willBeCompleted ? new Date().toISOString() : undefined
          }
        })
      });
    } catch (err) {
      console.warn('Backend task update warning:', err);
    }

    // 3. When completing the task, advance the lead to the next downstream node in the workflow!
    if (willBeCompleted) {
      const targetLead = leads.find(l =>
        (targetTask.leadId && l.leadId === targetTask.leadId) ||
        (targetTask.leadEmail && l.email && l.email.toLowerCase() === targetTask.leadEmail.toLowerCase())
      );

      const assignedWorkflow = workflows.find(w =>
        w.id === targetTask.campaignId ||
        (targetLead && (w.id === targetLead.campaignId || (w.name && targetLead.campaign && w.name.toLowerCase() === targetLead.campaign.toLowerCase())))
      );

      if (targetLead && assignedWorkflow) {
        const outgoingEdge = assignedWorkflow.edges?.find(e => e.source === targetTask.nodeId);
        if (outgoingEdge) {
          const nextNode = assignedWorkflow.nodes?.find(n => n.id === outgoingEdge.target);
          if (nextNode) {
            const today = getTodayDateString();
            const nodeType = (nextNode.data?.nodeType || nextNode.type || '').replace('Node', '');

            // CASE 1: Wait Node (e.g. Task -> Wait -> Email)
            if (nodeType === 'wait') {
              const waitDuration = nextNode.data?.waitDuration ?? nextNode.data?.waitDays ?? 1;
              const scheduledDate = addBusinessDays(today, waitDuration);
              const updatedLead: Lead = {
                ...targetLead,
                currentNodeId: nextNode.id,
                nodeEnteredDate: today,
                nextSendDate: scheduledDate,
                status: 'Active'
              };
              await handleUpdateLead(updatedLead);
              showToast(`Task completed! Lead "${targetLead.name}" moved to "${nextNode.data?.label || 'Wait'}" (scheduled for ${scheduledDate}).`, 'success');
              return;
            }

            // CASE 2: Another Manual Task Node (e.g. Task 1 -> Task 2)
            if (nodeType === 'manual_task' || nodeType === 'manualTask') {
              const updatedLead: Lead = {
                ...targetLead,
                currentNodeId: nextNode.id,
                nodeEnteredDate: today,
                nextSendDate: today,
                status: 'Active'
              };
              await handleUpdateLead(updatedLead);
              showToast(`Task completed! Lead "${targetLead.name}" moved to next task "${nextNode.data?.label || nextNode.id}".`, 'success');
              return;
            }

            // CASE 3: Direct Email Node (e.g. Task -> Email)
            if (nodeType === 'email') {
              const val = nextNode.data?.stepDelayValue;
              const unit = nextNode.data?.stepDelayUnit || 'minutes';
              let delayMs = 0;
              if (val && val > 0) {
                if (unit === 'seconds') delayMs = val * 1000;
                else if (unit === 'hours') delayMs = val * 3600 * 1000;
                else if (unit === 'days') delayMs = val * 86400 * 1000;
                else delayMs = val * 60 * 1000;
              }

              // Resolve sender account (email node specific sender first, fallback to start node)
              const startNode = assignedWorkflow.nodes?.find(n => n.type === 'startNode' || n.data?.nodeType === 'start');
              const nodeSenderId = nextNode.data?.senderId;
              const nodeSenderEmail = nextNode.data?.senderEmail;
              const startSenderId = startNode?.data?.senderId;
              const startSenderEmail = startNode?.data?.senderEmail;
              const effectiveSenderId = nodeSenderId || startSenderId || 'sender-primary';
              const effectiveSenderEmail = nodeSenderEmail || startSenderEmail;

              const senderObj = senders.find(s => 
                (effectiveSenderEmail && s.email.toLowerCase() === effectiveSenderEmail.toLowerCase()) ||
                (effectiveSenderId && s.id === effectiveSenderId)
              ) || senders.find(s => s.isPrimary) || senders[0];
              const effectiveSenderName = senderObj?.name || settings.senderName;

              // Resolve stage template & custom body/subject if configured
              const nextStageNum = nextNode.data?.templateStage || (targetLead.currentStage ? targetLead.currentStage + 1 : 1);
              let stageTemplate = templates.find(t => t.stage === nextStageNum) || templates[0];
              if (nextNode.data?.useCustomTemplate && nextNode.data?.customSubject) {
                stageTemplate = {
                  stage: nextStageNum,
                  name: nextNode.data.label || `Stage ${nextStageNum}`,
                  purpose: 'Campaign workflow step',
                  defaultGapDays: 3,
                  subject: nextNode.data.customSubject,
                  bodyHtml: (nextNode.data.customBody || '').replace(/\n/g, '<br/>')
                };
              }

              // Check downstream from this email node to schedule future stage or completion
              const emailOutgoingEdge = assignedWorkflow.edges?.find(e => e.source === nextNode.id);
              const downstreamNode = emailOutgoingEdge ? assignedWorkflow.nodes?.find(n => n.id === emailOutgoingEdge.target) : null;
              
              let nextNodeId: string | undefined = undefined;
              let nextSendDate = '';

              if (downstreamNode) {
                const downstreamType = (downstreamNode.data?.nodeType || downstreamNode.type || '').replace('Node', '');
                if (downstreamType === 'wait') {
                  const waitDuration = downstreamNode.data?.waitDuration ?? downstreamNode.data?.waitDays ?? 1;
                  nextNodeId = downstreamNode.id;
                  nextSendDate = addBusinessDays(today, waitDuration);
                } else {
                  nextNodeId = downstreamNode.id;
                  const gapDays = settings.stageGapDays[nextStageNum] || stageTemplate.defaultGapDays || 3;
                  nextSendDate = addBusinessDays(today, gapDays);
                }
              } else {
                const workflowEmailNodes = assignedWorkflow.nodes?.filter(n => (n.data?.nodeType || n.type || '').includes('email')) || [];
                const maxStages = workflowEmailNodes.length > 0 ? workflowEmailNodes.length : 7;
                const gapDays = settings.stageGapDays[nextStageNum] || stageTemplate.defaultGapDays || 3;
                nextSendDate = nextStageNum < maxStages ? addBusinessDays(today, gapDays) : '';
              }

              const executeEmailSend = async () => {
                try {
                  showToast(`Dispatching Stage ${nextStageNum} email to ${targetLead.name}...`, 'info');
                  const sendResult = await sendStageEmail(
                    null,
                    targetLead,
                    stageTemplate,
                    userEmail,
                    effectiveSenderName,
                    undefined,
                    senderObj?.provider || 'outlook'
                  );

                  const isCompleted = !downstreamNode && nextStageNum >= (assignedWorkflow.nodes?.filter(n => (n.data?.nodeType || n.type || '').includes('email')).length || 1);

                  const updatedLead: Lead = {
                    ...targetLead,
                    currentStage: nextStageNum,
                    currentNodeId: nextNodeId,
                    campaignId: assignedWorkflow.id,
                    campaign: assignedWorkflow.name || targetLead.campaign,
                    senderUsed: senderObj?.email || userEmail,
                    nodeEnteredDate: new Date().toISOString(),
                    threadId: sendResult.threadId || targetLead.threadId,
                    lastEmailSentDate: new Date().toISOString(),
                    nextSendDate: nextSendDate,
                    status: isCompleted ? 'Completed' : 'Active'
                  };

                  await handleUpdateLead(updatedLead);
                  showToast(`Stage ${nextStageNum} email sent to "${targetLead.name}" (${targetLead.email})!`, 'success');
                } catch (sendErr: any) {
                  console.error('Failed to send stage email on task completion:', sendErr);
                  const fallbackLead: Lead = {
                    ...targetLead,
                    currentNodeId: nextNode.id,
                    nodeEnteredDate: new Date().toISOString(),
                    nextSendDate: today,
                    status: 'Active'
                  };
                  await handleUpdateLead(fallbackLead);
                  showToast(`Task completed, but email failed: ${sendErr?.message || sendErr}`, 'error');
                }
              };

              if (delayMs > 0) {
                const scheduledDate = new Date(Date.now() + delayMs).toISOString().split('T')[0];
                const interimLead: Lead = {
                  ...targetLead,
                  currentNodeId: nextNode.id,
                  nodeEnteredDate: new Date().toISOString(),
                  nextSendDate: scheduledDate,
                  status: 'Active'
                };
                await handleUpdateLead(interimLead);

                // For short delays (e.g. up to 10 minutes, like 30s or 1m), automatically auto-dispatch via timer in browser!
                if (delayMs <= 10 * 60 * 1000) {
                  showToast(`Task completed! Email Stage ${nextStageNum} scheduled to send automatically in ${val} ${unit}...`, 'info');
                  setTimeout(() => {
                    executeEmailSend();
                  }, delayMs);
                } else {
                  showToast(`Task completed! Lead "${targetLead.name}" moved to "${nextNode.data?.label || 'Email'}" (scheduled after ${val} ${unit}).`, 'success');
                }
                return;
              }

              // delayMs === 0: execute immediately!
              await executeEmailSend();
              return;
            }

            // DEFAULT: Advance to node
            const updatedLead: Lead = {
              ...targetLead,
              currentNodeId: nextNode.id,
              nodeEnteredDate: today,
              nextSendDate: today,
              status: 'Active'
            };

            await handleUpdateLead(updatedLead);
            showToast(`Task completed! Lead "${targetLead.name}" moved to "${nextNode.data?.label || nextNode.id}".`, 'success');
            return;
          }
        }
      }

      showToast(`Task "${targetTask.title}" marked completed!`, 'success');
    } else {
      showToast(`Task "${targetTask.title}" marked as pending.`, 'info');
    }
  };

  const handleTasksCreated = async (newTasks: LeadManualTask[]) => {
    setManualTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const fresh = newTasks.filter(t => !existingIds.has(t.id));
      const updated = [...fresh, ...prev];
      saveManualTasks(updated);
      return updated;
    });

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: newTasks })
      });
    } catch (err) {
      console.warn('Backend tasks save warning:', err);
    }
  };

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Confirmation Modal state for single send
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync tracking stats from server.ts and merge with leads
  const syncTrackingMetrics = useCallback(async () => {
    try {
      const stats = await fetchTrackingStats();
      if (stats) {
        if (stats.events) {
          setTrackingEvents(stats.events);
        }
        if (stats.statsByLead) {
          setLeads(prev => mergeTrackingWithLeads(prev, stats.statsByLead));
          setSelectedLead(prev => {
            if (!prev) return null;
            const updated = mergeTrackingWithLeads([prev], stats.statsByLead);
            return updated[0] || prev;
          });
        }
      }
    } catch (e) {
      console.warn('Could not sync tracking stats:', e);
    }
  }, []);

  useEffect(() => {
    syncTrackingMetrics();
    const interval = setInterval(syncTrackingMetrics, 30000);
    return () => clearInterval(interval);
  }, [syncTrackingMetrics]);

  // 1. Fetch Microsoft Graph Service Account Mailbox on Mount
  useEffect(() => {
    getOutlookProfile().then(profile => {
      if (profile && profile.emailAddress) {
        setUserEmail(profile.emailAddress);
      }
    });
  }, []);

// Helper to ensure leads array is strictly de-duplicated by leadId and email
function deduplicateLeads(leadList: Lead[]): Lead[] {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const result: Lead[] = [];

  for (const item of leadList) {
    if (!item) continue;
    const cleanId = (item.leadId || '').trim();
    const cleanEmail = (item.email || '').trim().toLowerCase();

    if (!cleanId && !cleanEmail) continue;
    if (cleanId && seenIds.has(cleanId)) continue;
    if (cleanEmail && seenEmails.has(cleanEmail)) continue;

    if (cleanId) seenIds.add(cleanId);
    if (cleanEmail) seenEmails.add(cleanEmail);

    result.push(item);
  }

  return result;
}

  // 2. Sync Leads & Metrics with MongoDB Backend
  const syncData = useCallback(async (options?: { silent?: boolean; customToast?: string }) => {
    setIsSyncing(true);
    try {
      const rawBackendLeads = await fetchLeadsFromBackend();
      const backendLeads = deduplicateLeads(rawBackendLeads || []);
      if (backendLeads && backendLeads.length > 0) {
        let finalLeads = backendLeads;
        // Merge with current tracking metrics so server-logged open/clicks are not wiped out
        try {
          const stats = await fetchTrackingStats();
          if (stats) {
            if (stats.events) setTrackingEvents(stats.events);
            if (stats.statsByLead) {
              finalLeads = deduplicateLeads(mergeTrackingWithLeads(backendLeads, stats.statsByLead));
            }
          }
        } catch (trackingErr) {
          console.warn('Could not fetch tracking during sync:', trackingErr);
        }

        setLeads(finalLeads);
        setSelectedLead(prev => {
          if (!prev) return null;
          const match = finalLeads.find(l => l.leadId === prev.leadId || (l.email && l.email.toLowerCase() === prev.email.toLowerCase()));
          return match || prev;
        });

        // Trigger ReplyAlertModal popup for any leads with newly detected or unread replies that haven't been dismissed
        const newlyReplied = finalLeads.filter(b =>
          b.status === 'Replied' && (
            Boolean((b as any).hasUnreadReply) ||
            (leadsRef.current.length > 0 && !leadsRef.current.some(prev => prev.leadId === b.leadId && prev.status === 'Replied'))
          ) &&
          !dismissedReplyAlertsRef.current.has(b.leadId) &&
          (!b.email || !dismissedReplyAlertsRef.current.has(b.email.toLowerCase()))
        );
        if (newlyReplied.length > 0) {
          setReplyAlertLeads(prev => {
            const existingIds = new Set(prev.map(l => l.leadId || l.email?.toLowerCase()));
            const fresh = newlyReplied.filter(l => !existingIds.has(l.leadId || l.email?.toLowerCase()));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }

        if (!options?.silent) {
          showToast(options?.customToast || `Synced ${finalLeads.length} leads from MongoDB!`, 'success');
        }
      } else {
        setLeads([]);
        setSelectedLead(null);
        setTrackingEvents([]);
        if (!options?.silent) {
          showToast('MongoDB connected. No leads found.', 'info');
        }
      }

      // Sync manual tasks from MongoDB backend
      try {
        const taskRes = await fetch('/api/tasks');
        if (taskRes.ok) {
          const taskData = await taskRes.json();
          if (Array.isArray(taskData.tasks)) {
            setManualTasks(taskData.tasks);
            saveManualTasks(taskData.tasks);
          }
        }
      } catch (tErr) {
        console.warn('Could not sync tasks from backend:', tErr);
      }
    } catch (err: any) {
      console.error('Failed to sync leads:', err);
      showToast(`Sync error: ${err.message || 'Unable to read leads'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial load from MongoDB backend
  useEffect(() => {
    syncData();
  }, [syncData]);

  const handleRefreshAnalytics = useCallback(async () => {
    await syncData({ customToast: 'Analytics metrics and tracking data refreshed successfully!' });
  }, [syncData]);

  // Template changes
  const handleSaveTemplates = (updated: StageTemplate[]) => {
    setTemplates(updated);
    saveTemplatesToStorage(updated);
    showToast('All 7 stage templates saved successfully!', 'success');
  };

  // Settings changes
  const handleSaveSettings = (updated: AppSettings) => {
    setSettings(updated);
    saveSettings(updated);
    showToast('Campaign sequencing settings saved!', 'success');
  };

  const handleLogoChange = (url: string) => {
    const updated: AppSettings = { ...settings, customLogoUrl: url };
    setSettings(updated);
    saveSettings(updated);
    showToast(url ? 'Company logo updated and saved!' : 'Custom logo removed.', 'success');
  };

  // Manual Pause/Resume safety override
  const handleTogglePause = async (lead: Lead) => {
    const newStatus = lead.status === 'Paused' ? 'Active' : 'Paused';
    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
      notes: lead.notes 
        ? `${lead.notes} | [${newStatus === 'Paused' ? 'Paused manually' : 'Resumed manually'}]`
        : `${newStatus === 'Paused' ? 'Paused manually' : 'Resumed manually'}`
    };

    // Update local state
    setLeads(prev => prev.map(l => l.leadId === lead.leadId ? updatedLead : l));
    if (selectedLead && selectedLead.leadId === lead.leadId) {
      setSelectedLead(updatedLead);
    }

    logAppAction('pause_toggle', `${newStatus === 'Paused' ? 'Paused' : 'Resumed'} Sequence`, `${lead.name} (${lead.company || lead.email}) was ${newStatus.toLowerCase()} manually.`);
    showToast(`Lead ${lead.name} is now ${newStatus}.`, 'info');
  };

  // Update notes / pain point ensuring data consistency before UI updates
  const handleUpdateLead = async (updated: Lead) => {
    try {
      const savedLead = await updateLead(updated, undefined, spreadsheetId || undefined);
      const isTargetLead = (l: Lead) =>
        Boolean((savedLead.leadId && l.leadId === savedLead.leadId) ||
        (savedLead.email && l.email && l.email.toLowerCase() === savedLead.email.toLowerCase()));
      setLeads(prev => prev.map(l => isTargetLead(l) ? savedLead : l));
      if (selectedLead && isTargetLead(selectedLead)) {
        setSelectedLead(savedLead);
      }
      showToast('Lead details updated successfully!', 'success');
    } catch (e: any) {
      console.error('Failed to update lead:', e);
      showToast(`Failed to update lead: ${e.message}`, 'error');
    }
  };

  // Add new lead ensuring data consistency before UI updates
  const handleAddLead = async (newLead: Lead) => {
    try {
      // Purge any stale tasks from local state & storage for this lead or email
      setManualTasks(prev => {
        const cleaned = prev.filter(t =>
          (newLead.leadId ? t.leadId !== newLead.leadId : true) &&
          (!newLead.email || !t.leadEmail || t.leadEmail.toLowerCase() !== newLead.email.toLowerCase())
        );
        saveManualTasks(cleaned);
        return cleaned;
      });

      // Purge tracking events for this lead/email from local state
      setTrackingEvents(prev => prev.filter(e =>
        (newLead.leadId ? e.leadId !== newLead.leadId : true) &&
        (!newLead.email || !e.email || e.email.toLowerCase() !== newLead.email.toLowerCase())
      ));

      // Reset backend tracking for this email if applicable
      if (newLead.email) {
        fetch('/api/track/reset-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newLead.email })
        }).catch(() => {});
      }

      const saved = await createLead(newLead, undefined, spreadsheetId || undefined);
      setLeads(prev => {
        const existingIdx = prev.findIndex(
          l => l.leadId === saved.leadId || (l.email && l.email.toLowerCase() === saved.email?.toLowerCase())
        );
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = { ...copy[existingIdx], ...saved };
          return copy;
        }
        return [...prev, saved];
      });
      logAppAction('lead_add', 'New Lead Added', `${saved.name} (${saved.company || saved.email || 'Pipeline'}) added to outreach.`);
      showToast(`Lead ${saved.name} added successfully!`, 'success');
    } catch (e: any) {
      console.error('Failed to add lead:', e);
      showToast(`Failed to add lead: ${e.message}`, 'error');
    }
  };

  // Delete lead ensuring data consistency before UI updates
  const handleDeleteLead = async (lead: Lead) => {
    try {
      const success = await deleteLead(lead.leadId, undefined, spreadsheetId || undefined, lead.rowIndex);
      if (success) {
        setLeads(prev => prev.filter(l => l.leadId !== lead.leadId));
        if (selectedLead?.leadId === lead.leadId) {
          setSelectedLead(null);
          setIsLeadDetailOpen(false);
        }

        // Purge associated tasks from state & storage
        setManualTasks(prev => {
          const updated = prev.filter(t =>
            t.leadId !== lead.leadId &&
            (!lead.email || !t.leadEmail || t.leadEmail.toLowerCase() !== lead.email.toLowerCase())
          );
          saveManualTasks(updated);
          return updated;
        });

        // Purge tracking events from local state
        setTrackingEvents(prev => prev.filter(e =>
          e.leadId !== lead.leadId &&
          (!lead.email || !e.email || e.email.toLowerCase() !== lead.email.toLowerCase())
        ));

        // Purge tracking records on backend as well
        fetch('/api/track/reset-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.leadId, email: lead.email })
        }).catch(() => {});

        // Clean up from dismissed reply alerts set as well
        if (lead.leadId) dismissedReplyAlertsRef.current.delete(lead.leadId);
        if (lead.email) dismissedReplyAlertsRef.current.delete(lead.email.toLowerCase());
        saveDismissedReplyAlerts(dismissedReplyAlertsRef.current);

        logAppAction('general', 'Lead Deleted', `${lead.name} (${lead.company || lead.email}) was removed from workspace.`);
        showToast(`Lead ${lead.name} deleted successfully!`, 'success');
      }
    } catch (e: any) {
      console.error('Failed to delete lead:', e);
      showToast(`Failed to delete lead: ${e.message}`, 'error');
    }
  };

  // Commit batch imported leads from CSV / Excel ensuring data consistency before UI updates
  const handleCommitImport = async (importedLeads: Partial<Lead>[]) => {
    try {
      const savedLeads = await batchCreateLeads(importedLeads, undefined, spreadsheetId || undefined);
      setLeads(prev => {
        const copy = [...prev];
        for (const saved of savedLeads) {
          const idx = copy.findIndex(
            l => l.leadId === saved.leadId || (l.email && l.email.toLowerCase() === saved.email?.toLowerCase())
          );
          if (idx !== -1) {
            copy[idx] = { ...copy[idx], ...saved };
          } else {
            copy.push(saved);
          }
        }
        return copy;
      });
      logAppAction('lead_import', 'Batch Import Completed', `Successfully imported ${savedLeads.length} leads into MongoDB.`);
      showToast(`Successfully imported and committed ${savedLeads.length} leads!`, 'success');
    } catch (err: any) {
      console.error('Failed to batch append to sheet:', err);
      showToast(`Import error: ${err.message || 'Failed to save leads'}`, 'error');
      throw err;
    }
  };

  // Shared reply checking and processing function (reused by Check Reply button, LeadDetailModal, and background interval)
  const checkLeadReply = useCallback(async (
    targetLead: Lead,
    options?: { isManual?: boolean; silent?: boolean }
  ): Promise<{ hasReplied: boolean; updatedLead?: Lead }> => {
    if (!targetLead.threadId && !targetLead.email) {
      if (options?.isManual) {
        showToast('No email thread initialized yet for this lead.', 'info');
      }
      return { hasReplied: false };
    }

    try {
      const res = await checkLeadForReplyAndSave(
        targetLead,
        userEmail,
        spreadsheetId || undefined
      );

      if (res.hasReplied && res.updatedLead) {
        const savedLead = res.updatedLead;
        setLeads(prev => prev.map(l => l.leadId === savedLead.leadId ? savedLead : l));
        setSelectedLead(prev => prev && prev.leadId === savedLead.leadId ? savedLead : prev);

        // Trigger ReplyAlertModal popup for this newly detected reply if not dismissed
        const isDismissed =
          dismissedReplyAlertsRef.current.has(savedLead.leadId) ||
          (Boolean(savedLead.email) && dismissedReplyAlertsRef.current.has(savedLead.email.toLowerCase()));

        if (!isDismissed) {
          setReplyAlertLeads(prev => {
            const exists = prev.some(l => l.leadId === savedLead.leadId || (savedLead.email && l.email?.toLowerCase() === savedLead.email.toLowerCase()));
            return exists ? prev : [...prev, savedLead];
          });
        }

        logAppAction('reply_check', 'Inbound Reply Received', `Prospect reply detected from ${targetLead.name} (${targetLead.email})! Sequence halted.`);
        showToast(`Reply detected from ${targetLead.name}! Sequence stopped.`, 'success');
        return res;
      } else {
        if (options?.isManual && !options?.silent) {
          showToast(`No new reply from ${targetLead.name} yet.`, 'info');
        }
        return { hasReplied: false };
      }
    } catch (err: any) {
      console.error(`Reply check failed for ${targetLead.name}:`, err);
      if (options?.isManual) {
        showToast(`Reply check failed: ${err.message}`, 'error');
      }
      return { hasReplied: false };
    }
  }, [userEmail, spreadsheetId]);

  // Check single lead for replies (manual button on lead detail modal)
  const handleCheckSingleReply = async (lead: Lead) => {
    const res = await checkLeadReply(lead, { isManual: true });
    setLastCheckedTime(new Date());
    return res;
  };

  // Bulk check replies on all leads with email threads (manual button on table)
  const handleCheckAllReplies = async () => {
    const leadsWithThreads = leads.filter(l => (l.threadId || l.email) && l.status !== 'Replied');
    if (leadsWithThreads.length === 0) {
      showToast('No leads with active email threads to check.', 'info');
      setLastCheckedTime(new Date());
      return;
    }

    setIsCheckingReplies(true);
    let repliesFound = 0;

    try {
      for (const targetLead of leadsWithThreads) {
        const res = await checkLeadReply(targetLead, { isManual: false, silent: true });
        if (res.hasReplied) {
          repliesFound++;
        }
      }

      setLastCheckedTime(new Date());
      logAppAction('reply_check', 'Inbox Scan Completed', repliesFound > 0
        ? `Found ${repliesFound} new prospect replies across checked threads.`
        : `Checked active email threads; no new prospect replies found.`);
      if (repliesFound > 0) {
        showToast(`Detected ${repliesFound} new replies! Leads moved to "Needs Manual Reply".`, 'success');
      } else {
        showToast('All email threads checked. No new prospect replies found.', 'info');
      }
    } catch (err: any) {
      showToast(`Error checking replies: ${err.message}`, 'error');
    } finally {
      setIsCheckingReplies(false);
    }
  };

  // Timed background check: every 30 seconds, loop all non-replied leads with threads
  const runBackgroundReplyCheck = useCallback(async () => {
    // Skip the run if the tab is hidden or a previous run is still in progress
    if (document.hidden || isBackgroundCheckingRef.current) {
      return;
    }

    isBackgroundCheckingRef.current = true;
    try {
      const candidatesToCheck = leadsRef.current.filter(
        l => (l.threadId || l.email) && l.status !== 'Replied'
      );

      const newlyReplied: Lead[] = [];
      for (const targetLead of candidatesToCheck) {
        const res = await checkLeadReply(targetLead, { isManual: false });
        if (res.hasReplied && res.updatedLead) {
          newlyReplied.push(res.updatedLead);
        }
      }

      if (newlyReplied.length > 0) {
        const freshToAlert = newlyReplied.filter(l =>
          !dismissedReplyAlertsRef.current.has(l.leadId) &&
          (!l.email || !dismissedReplyAlertsRef.current.has(l.email.toLowerCase()))
        );
        if (freshToAlert.length > 0) {
          setReplyAlertLeads(prev => {
            const existingIds = new Set(prev.map(l => l.leadId || l.email?.toLowerCase()));
            const fresh = freshToAlert.filter(l => !existingIds.has(l.leadId || l.email?.toLowerCase()));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      }
    } catch (err) {
      console.error('Background reply check error:', err);
    } finally {
      isBackgroundCheckingRef.current = false;
      setLastCheckedTime(new Date());
    }
  }, [checkLeadReply]);

  useEffect(() => {
    // Run once on initial app load
    runBackgroundReplyCheck();

    // Run every 30 seconds for quick reply detection
    const intervalId = setInterval(runBackgroundReplyCheck, 30 * 1000);

    // Periodically run due campaigns in the background so elapsed step timers execute automatically
    const runBackgroundDueWorkflows = async () => {
      try {
        const res = await fetch('/api/campaigns/run-due', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.emailsSentCount > 0 || data.tasksCreatedCount > 0 || data.advancedNodesCount > 0) {
            await syncData({ silent: true });
          }
        }
      } catch (_) {}
    };

    const dueWorkflowIntervalId = setInterval(runBackgroundDueWorkflows, 10 * 1000);

    // Run once immediately when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runBackgroundReplyCheck();
        runBackgroundDueWorkflows();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up intervals and listener on unmount
    return () => {
      clearInterval(intervalId);
      clearInterval(dueWorkflowIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runBackgroundReplyCheck, syncData, userEmail]);

  // Send single stage email (with confirmation dialog and campaign check)
  const handleInitiateSendNextStage = (lead: Lead) => {
    const hasCampaign = Boolean(
      lead.campaignId || (lead.campaign && lead.campaign.trim() !== '' && lead.campaign.toLowerCase() !== 'default')
    );

    if (!hasCampaign) {
      setLeadNeedingCampaignSend(lead);
      setSelectedCampaignForSend(workflows[0]?.id || '');
      return;
    }

    startSendConfirmation(lead);
  };

  const handleConfirmAssignCampaignAndSend = async () => {
    if (!leadNeedingCampaignSend) return;
    const chosen = workflows.find(w => w.id === selectedCampaignForSend);
    const campaignName = chosen ? chosen.name : 'Default';
    const campaignId = chosen ? chosen.id : '';

    const updated: Lead = {
      ...leadNeedingCampaignSend,
      campaign: campaignName,
      campaignId: campaignId
    };

    await handleUpdateLead(updated);
    setLeadNeedingCampaignSend(null);
    startSendConfirmation(updated);
  };

  const startSendConfirmation = (lead: Lead) => {
    if (lead.status === 'Completed') {
      showToast(`Campaign sequence is already completed for ${lead.name}.`, 'info');
      return;
    }
    if (lead.status === 'Replied') {
      showToast(`Sequence is stopped because ${lead.name} replied.`, 'info');
      return;
    }
    if (lead.status === 'Broke Up') {
      showToast(`Sequence is closed for ${lead.name} (Broke Up).`, 'info');
      return;
    }

    // Resolve campaign template and sender
    const campaign = workflows.find(w => w.id === lead.campaignId || (lead.campaign && w.name.toLowerCase() === lead.campaign.toLowerCase()));
    const nodes = (campaign as any)?.workflow_graph?.nodes || (campaign as any)?.nodes || [];
    const emailNodes = nodes.filter((n: any) => n.data?.nodeType === 'email' || n.type === 'email' || n.type === 'emailNode');
    const maxStages = campaign && emailNodes.length > 0 ? emailNodes.length : (campaign ? 0 : 7);

    const nextStageNum = lead.currentStage + 1;
    if (nextStageNum > maxStages) {
      showToast(`Lead ${lead.name} has already completed all ${maxStages} stage${maxStages > 1 ? 's' : ''} for this campaign.`, 'info');
      return;
    }

    let template = templates.find(t => t.stage === nextStageNum) || templates[0];
    let customSenderName = settings.senderName;

    if (campaign) {
      const startNode = nodes.find((n: any) => n.data?.nodeType === 'start' || n.type === 'start' || n.type === 'startNode');
      const emailNode = emailNodes.find((n: any) => n.data?.templateStage === nextStageNum) || emailNodes[nextStageNum - 1];

      if (!emailNode && emailNodes.length > 0) {
        showToast(`Campaign "${campaign.name}" does not have Stage ${nextStageNum} configured. Sequence is complete.`, 'info');
        return;
      }

      if (emailNode?.data) {
        if (emailNode.data.useCustomTemplate && emailNode.data.customSubject) {
          template = {
            stage: emailNode.data.templateStage || nextStageNum,
            name: emailNode.data.label || `Stage ${nextStageNum}`,
            purpose: 'Campaign workflow step',
            defaultGapDays: 3,
            subject: emailNode.data.customSubject,
            bodyHtml: (emailNode.data.customBody || '').replace(/\n/g, '<br/>')
          };
        } else if (emailNode.data.templateStage) {
          const match = templates.find(t => t.stage === emailNode.data.templateStage);
          if (match) template = match;
        }

        const senderId = emailNode.data.senderId || startNode?.data?.senderId;
        if (senderId) {
          const foundSender = senders.find(s => s.id === senderId || s.email === senderId);
          if (foundSender) {
            customSenderName = foundSender.name;
          }
        }
      }
    }

    const isReply = Boolean(lead.threadId);

    setConfirmDialog({
      isOpen: true,
      title: `Send Stage ${nextStageNum}: ${template.name}?`,
      message: isReply
        ? `This will send a reply inside the existing Outlook thread to ${lead.name} (${lead.email}).`
        : `This will initialize a new Outlook thread by sending Stage 1 Introduction to ${lead.name} (${lead.email}).`,
      details: [
        `Recipient: ${lead.name} (${lead.email})`,
        `Company: ${lead.company}`,
        `Campaign: ${campaign ? campaign.name : lead.campaign || 'Default'}`,
        `Sender: ${customSenderName || 'Default Outlook Account'}`,
        `Subject: ${template.subject}`,
        `Next Send Date: +${settings.stageGapDays[nextStageNum] || 3} business days`
      ],
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await executeSendStageEmail(lead, template, nextStageNum, customSenderName);
      }
    });
  };

  const executeSendStageEmail = async (lead: Lead, template: StageTemplate, stageNum: number, customSenderName?: string) => {
    try {
      showToast(`Sending Stage ${stageNum} to ${lead.name}...`, 'info');

      // 1. Reply check safety
      if (lead.threadId) {
        const replyCheck = await checkThreadForLeadReply(
          undefined,
          lead.threadId,
          lead.email,
          userEmail,
          lead.lastEmailSentDate
        );

        if (replyCheck.hasReplied) {
          const updated: Lead = {
            ...lead,
            status: 'Replied',
            notes: lead.notes ? `${lead.notes} | [Reply detected]` : 'Reply detected'
          };
          await handleUpdateLead(updated);
          showToast(`Wait! ${lead.name} has already replied to this thread! Stopped sequence automatically.`, 'info');
          return;
        }
      }

      // 2. Dispatch email via Outlook
      const result = await sendStageEmail(
        undefined,
        lead,
        template,
        userEmail,
        customSenderName || settings.senderName
      );

      const campaign = workflows.find(w => w.id === lead.campaignId || (lead.campaign && w.name.toLowerCase() === lead.campaign.toLowerCase()));
      const nodes = (campaign as any)?.workflow_graph?.nodes || (campaign as any)?.nodes || [];
      const emailNodes = nodes.filter((n: any) => n.data?.nodeType === 'email' || n.type === 'email' || n.type === 'emailNode');
      const maxStages = campaign && emailNodes.length > 0 ? emailNodes.length : (campaign ? 0 : 7);

      const isFinished = stageNum >= maxStages;
      const today = getTodayDateString();
      const gapDays = settings.stageGapDays[stageNum] || template.defaultGapDays || 3;
      const nextDate = isFinished ? '' : addBusinessDays(today, gapDays);
      const finalStatus: Lead['status'] = isFinished ? 'Completed' : 'Active';

      const updatedLead: Lead = {
        ...lead,
        currentStage: stageNum,
        threadId: result.threadId,
        lastEmailSentDate: today,
        nextSendDate: nextDate,
        status: finalStatus,
        currentNodeId: isFinished ? undefined : lead.currentNodeId
      };

      await handleUpdateLead(updatedLead);
      logAppAction('email_send', `Stage ${stageNum} Dispatched`, `Sent Stage ${stageNum} email to ${lead.name} (${lead.email})${isFinished ? ' — Sequence Completed' : ''}.`);
      if (isFinished) {
        showToast(`Stage ${stageNum} sent to ${lead.name}! Campaign sequence is now completed.`, 'success');
      } else {
        showToast(`Stage ${stageNum} sent to ${lead.name} via Outlook!`, 'success');
      }

    } catch (err: any) {
      console.error('Send failed:', err);
      showToast(`Send failed: ${err.message || 'Outlook error'}`, 'error');
    }
  };

  // Bulk assign multiple leads to a campaign
  const handleBulkAssignCampaign = async (leadIds: string[], campaignId: string) => {
    const chosen = workflows.find(w => w.id === campaignId);
    const campaignName = chosen ? chosen.name : 'Default';
    const finalCampaignId = chosen ? chosen.id : '';

    let firstNodeId = '';
    if (chosen) {
      const nodes = (chosen as any).workflow_graph?.nodes || chosen.nodes || [];
      const edges = (chosen as any).workflow_graph?.edges || chosen.edges || [];
      const startNode = nodes.find((n: any) => n.data?.nodeType === 'start' || n.type === 'start' || n.type === 'startNode');
      if (startNode) {
        const firstEdge = edges.find((e: any) => e.source === startNode.id);
        firstNodeId = firstEdge ? firstEdge.target : startNode.id;
      } else if (nodes.length > 0) {
        firstNodeId = nodes[0].id;
      }
    }

    const today = getTodayDateString();
    const updatedLeads = leads.map(l => {
      if (leadIds.includes(l.leadId)) {
        return {
          ...l,
          campaign: campaignName,
          campaignId: finalCampaignId,
          currentNodeId: firstNodeId || l.currentNodeId,
          nodeEnteredDate: firstNodeId ? today : l.nodeEnteredDate
        };
      }
      return l;
    });

    setLeads(updatedLeads);

    try {
      const toUpdate = updatedLeads.filter(l => leadIds.includes(l.leadId));
      await fetch('/api/leads/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: toUpdate })
      });
      showToast(`Assigned ${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} to "${campaignName}"!`, 'success');
    } catch (err: any) {
      showToast(`Bulk update saved locally, backend warning: ${err.message}`, 'info');
    }
  };

  // Status update from Needs Manual Reply view
  const handleUpdateLeadStatus = (lead: Lead, newStatus: Lead['status']) => {
    const updated: Lead = {
      ...lead,
      status: newStatus,
      nextSendDate: newStatus === 'Active' ? addBusinessDays(getTodayDateString(), 3) : lead.nextSendDate
    };
    handleUpdateLead(updated);
    showToast(`Lead status set to ${newStatus}`, 'success');
  };

  // Scheduler run completed
  const handleSchedulerCompleted = (updatedLeads: Lead[], logs: SendLogEntry[]) => {
    setLeads(updatedLeads);
    const sentCount = logs.filter(l => l.status === 'sent').length;
    const repliedCount = logs.filter(l => l.status === 'reply_detected').length;
    showToast(`Campaign run finished: ${sentCount} sent, ${repliedCount} replies handled!`, 'success');
  };

  const dueCount = leads.filter(l => l.status === 'Active' && isLeadDueForNextSend(l.nextSendDate)).length;
  const repliedCount = leads.filter(l => l.status === 'Replied').length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased">
      {/* Header */}
      <Header
        userEmail={userEmail}
        spreadsheetId={spreadsheetId}
        spreadsheetName={spreadsheetName}
        dueCount={dueCount}
        repliedCount={repliedCount}
        tasksCount={manualTasks.filter(t => !t.isCompleted).length}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onSync={syncData}
        isSyncing={isSyncing}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
        onOpenConnectSheet={() => {}}
        onOpenImportLeads={() => setIsImportLeadsOpen(true)}
        customLogoUrl={settings.customLogoUrl}
        onLogoChange={handleLogoChange}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-xs sm:text-sm font-semibold ${
            toastMessage.type === 'success' 
              ? 'bg-slate-900 text-white border-slate-800' 
              : toastMessage.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-red-600 text-white border-red-700'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area (Routing Based - Widescreen Full Bleed) */}
      <main className="flex-1 w-full px-3 py-3 sm:px-5 sm:py-4">
        <Routes>
          <Route path="/" element={<Navigate to="/leads" replace />} />
          <Route 
            path="/leads" 
            element={
              <LeadsPage
                leads={leads}
                templates={templates}
                campaigns={workflows}
                onBulkAssignCampaign={handleBulkAssignCampaign}
                initialCampaignFilter={leadsCampaignFilter}
                onSelectLead={handleSelectLead}
                onTogglePause={handleTogglePause}
                onSendNextStage={handleInitiateSendNextStage}
                onDeleteLead={handleDeleteLead}
                onOpenAddLead={() => setIsAddLeadOpen(true)}
                onOpenImportLeads={() => setIsImportLeadsOpen(true)}
                onCheckReplies={handleCheckAllReplies}
                isCheckingReplies={isCheckingReplies}
                lastCheckedTime={lastCheckedTime}
                onOpenScheduler={() => setIsSchedulerOpen(true)}
                dueCount={dueCount}
              />
            } 
          />
          <Route 
            path="/replied" 
            element={
              <NeedsReplyPage
                leads={leads}
                onSelectLead={handleSelectLead}
                onUpdateStatus={handleUpdateLeadStatus}
              />
            } 
          />
          <Route 
            path="/workflows" 
            element={
              <WorkflowsPage
                workflows={workflows}
                activeWorkflowId={activeWorkflowId}
                senders={senders}
                templates={templates}
                leads={leads}
                onSaveWorkflow={handleSaveWorkflow}
                onSelectWorkflow={(id) => setActiveWorkflowId(id)}
                onCreateWorkflow={handleCreateWorkflow}
                onDuplicateWorkflow={handleDuplicateWorkflow}
                onDeleteWorkflow={handleDeleteWorkflow}
                onResetWorkflows={handleResetWorkflows}
                onToggleActive={handleToggleWorkflowActive}
              />
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <TasksPage
                tasks={manualTasks}
                onToggleTask={handleToggleManualTask}
                onSelectLead={handleSelectLead}
                leads={leads}
              />
            } 
          />
          <Route 
            path="/templates" 
            element={
              <TemplatesPage
                templates={templates}
                onSaveTemplates={handleSaveTemplates}
                leads={leads}
                senderName={settings.senderName}
                senders={senders}
              />
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <AnalyticsPage
                leads={leads}
                templates={templates}
                trackingEvents={trackingEvents}
                onRefresh={handleRefreshAnalytics}
                onNavigateToLeads={(campaignName) => {
                  if (campaignName) {
                    setLeadsCampaignFilter(campaignName);
                  }
                  navigate('/leads');
                }}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/leads" replace />} />
        </Routes>
      </main>

      {/* Lead Detail & Thread Modal */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={isLeadDetailOpen}
        onClose={() => {
          setIsLeadDetailOpen(false);
          setSelectedLead(null);
        }}
        templates={templates}
        token={null}
        userEmail={userEmail}
        onTogglePause={handleTogglePause}
        onSendNextStage={handleInitiateSendNextStage}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onCheckReply={handleCheckSingleReply}
        campaigns={workflows}
      />

      {/* Campaign Sequencing Runner Modal */}
      <CampaignSchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        leads={leads}
        tasks={manualTasks}
        templates={templates}
        settings={settings}
        workflows={workflows}
        senders={senders}
        token={null}
        userEmail={userEmail}
        spreadsheetId={spreadsheetId}
        onRunCompleted={handleSchedulerCompleted}
        onTasksCreated={handleTasksCreated}
        onToggleWorkflowActive={handleToggleWorkflowActive}
      />

      {/* Add Single Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onAddLead={handleAddLead}
        existingLeads={leads}
        existingLeadsCount={leads.length}
        existingCount={leads.length}
        campaigns={workflows}
      />

      {/* CSV / Excel Lead Import Modal */}
      {isImportLeadsOpen && (
        <ImportLeadsModal
          isOpen={isImportLeadsOpen}
          onClose={() => setIsImportLeadsOpen(false)}
          existingLeads={leads || []}
          onCommitImport={handleCommitImport}
          campaigns={workflows}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        templates={templates}
        onSaveSettings={handleSaveSettings}
        userEmail={userEmail}
        senders={senders}
        onSaveSenders={handleSaveSenders}
      />

      {/* Assign Campaign Before Sending Dialog */}
      {leadNeedingCampaignSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Choose Campaign to Send</h4>
                <p className="text-xs text-slate-500">Lead has no campaign assigned yet</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Please choose which campaign sequence to enroll <strong>{leadNeedingCampaignSend.name}</strong> ({leadNeedingCampaignSend.email}) into before dispatching this email.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Campaign:</label>
              <select
                value={selectedCampaignForSend}
                onChange={(e) => setSelectedCampaignForSend(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white font-medium cursor-pointer"
              >
                <option value="">No campaign / Default</option>
                {workflows.map(c => {
                  const isActive = Boolean(c.is_active ?? (c as any).isActive);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({isActive ? 'Active' : 'Inactive'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadNeedingCampaignSend(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignCampaignAndSend}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs shadow-red-500/20 transition-all cursor-pointer"
              >
                Assign &amp; Continue Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmText="Send Email via Outlook"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Bottom-Right Activity & Notification Hub (Alerts, Actions, Notes) */}
      <NotificationHub
        replyAlerts={replyAlertLeads}
        onDismissReplyAlert={(leadId) => {
          const target = leads.find(l => l.leadId === leadId) || replyAlertLeads.find(l => l.leadId === leadId);
          if (target) handleDismissReplyAlerts([target]);
        }}
        onClearAllReplyAlerts={() => handleDismissReplyAlerts(replyAlertLeads)}
        onOpenLead={(targetLead) => {
          setSelectedLead(targetLead);
          setIsLeadDetailOpen(true);
        }}
        onNavigateToTab={(tab) => handleTabChange(tab)}
        actionLogs={actionLogs}
        onClearActionLogs={() => {
          setActionLogs([]);
          try {
            localStorage.removeItem('gini_action_logs');
          } catch {}
        }}
      />
    </div>
  );
}
