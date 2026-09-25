import React, { useState, useEffect, useCallback } from 'react';
import { Lead, StageTemplate, AppSettings, SendLogEntry, CampaignWorkflow, ConnectedSender, LeadManualTask, TrackingEvent } from './types';
import { 
  getOutlookProfile, 
  checkThreadForLeadReply, 
  sendStageEmail 
} from './services/outlookService';
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

// Components
import { Header } from './components/Header';
import { LeadsTable } from './components/LeadsTable';
import { NeedsManualReplyView } from './components/NeedsManualReplyView';
import { TemplateAdmin } from './components/TemplateAdmin';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { LeadDetailModal } from './components/LeadDetailModal';
import { CampaignSchedulerModal } from './components/CampaignSchedulerModal';
import { AddLeadModal } from './components/AddLeadModal';
import { ImportLeadsModal } from './components/ImportLeadsModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { WorkflowCanvas } from './components/workflow/WorkflowCanvas';
import { ManualTasksDashboard } from './components/ManualTasksDashboard';

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

export default function App() {
  // Service account mailbox state
  const [userEmail, setUserEmail] = useState<string>('');

  // App core state
  const [leads, setLeads] = useState<Lead[]>(INITIAL_FALLBACK_LEADS);
  const [templates, setTemplates] = useState<StageTemplate[]>(loadSavedTemplates());
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [spreadsheetName, setSpreadsheetName] = useState<string>('MongoDB Leads Database');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);

  // Navigation & Modals
  const [currentTab, setCurrentTab] = useState<'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'settings'>('leads');
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
      showToast(`Created workflow "${newW.name}"`, 'success');
    } catch (err: any) {
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

  const handleToggleManualTask = (taskId: string) => {
    setManualTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            isCompleted: !t.isCompleted,
            completedAt: !t.isCompleted ? new Date().toISOString() : undefined
          };
        }
        return t;
      });
      saveManualTasks(updated);
      return updated;
    });
  };

  const handleTasksCreated = (newTasks: LeadManualTask[]) => {
    setManualTasks(prev => {
      const updated = [...newTasks, ...prev];
      saveManualTasks(updated);
      return updated;
    });
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
  const syncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const rawBackendLeads = await fetchLeadsFromBackend();
      const backendLeads = deduplicateLeads(rawBackendLeads || []);
      if (backendLeads && backendLeads.length > 0) {
        // Merge with current tracking metrics so server-logged open/clicks are not wiped out
        try {
          const stats = await fetchTrackingStats();
          if (stats) {
            if (stats.events) setTrackingEvents(stats.events);
            if (stats.statsByLead) {
              const merged = deduplicateLeads(mergeTrackingWithLeads(backendLeads, stats.statsByLead));
              setLeads(merged);
              setSelectedLead(prev => {
                if (!prev) return null;
                const match = merged.find(l => l.leadId === prev.leadId || (l.email && l.email.toLowerCase() === prev.email.toLowerCase()));
                return match || prev;
              });
              showToast(`Synced ${backendLeads.length} leads from MongoDB!`, 'success');
              return;
            }
          }
        } catch (trackingErr) {
          console.warn('Could not fetch tracking during sync:', trackingErr);
        }

        setLeads(backendLeads);
        showToast(`Synced ${backendLeads.length} leads from MongoDB!`, 'success');
      } else {
        showToast('MongoDB connected. No leads found.', 'info');
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

    showToast(`Lead ${lead.name} is now ${newStatus}.`, 'info');
  };

  // Update notes / pain point ensuring data consistency before UI updates
  const handleUpdateLead = async (updated: Lead) => {
    try {
      const savedLead = await updateLead(updated, undefined, spreadsheetId || undefined);
      setLeads(prev => prev.map(l => l.leadId === savedLead.leadId ? savedLead : l));
      if (selectedLead && selectedLead.leadId === savedLead.leadId) {
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
      showToast(`Successfully imported and committed ${savedLeads.length} leads!`, 'success');
    } catch (err: any) {
      console.error('Failed to batch append to sheet:', err);
      showToast(`Import error: ${err.message || 'Failed to save leads'}`, 'error');
      throw err;
    }
  };

  // Check single lead for replies
  const handleCheckSingleReply = async (lead: Lead) => {
    if (!lead.threadId) {
      showToast('No email thread initialized yet for this lead.', 'info');
      return;
    }

    try {
      const res = await checkThreadForLeadReply(
        undefined,
        lead.threadId,
        lead.email,
        userEmail,
        lead.lastEmailSentDate
      );

      if (res.hasReplied) {
        const updated: Lead = {
          ...lead,
          status: 'Replied',
          notes: lead.notes ? `${lead.notes} | [Reply detected]` : 'Reply detected'
        };
        handleUpdateLead(updated);
        showToast(`Reply detected from ${lead.name}! Sequence stopped.`, 'success');
      } else {
        showToast(`No new reply from ${lead.name} yet.`, 'info');
      }
    } catch (err: any) {
      showToast(`Reply check failed: ${err.message}`, 'error');
    }
  };

  // Bulk check replies on all active leads
  const handleCheckAllReplies = async () => {
    const leadsWithThreads = leads.filter(l => l.threadId && (l.status === 'Active' || l.status === 'Paused'));
    if (leadsWithThreads.length === 0) {
      showToast('No active leads with active email threads to check.', 'info');
      return;
    }

    setIsCheckingReplies(true);
    let repliesFound = 0;
    const today = getTodayDateString();

    try {
      const updatedList = [...leads];
      for (const targetLead of leadsWithThreads) {
        const replyCheck = await checkThreadForLeadReply(
          undefined,
          targetLead.threadId,
          targetLead.email,
          userEmail,
          targetLead.lastEmailSentDate
        );

        if (replyCheck.hasReplied) {
          repliesFound++;
          const updated: Lead = {
            ...targetLead,
            status: 'Replied',
            notes: targetLead.notes ? `${targetLead.notes} | [Reply on ${today}]` : `Reply on ${today}`
          };

          const idx = updatedList.findIndex(l => l.leadId === targetLead.leadId);
          if (idx !== -1) updatedList[idx] = updated;
          await handleUpdateLead(updated);
        }
      }

      setLeads(updatedList);
      if (repliesFound > 0) {
        showToast(`Detected ${repliesFound} new replies! Leads moved to "Needs Manual Reply".`, 'success');
      } else {
        showToast('All active threads checked. No new prospect replies found.', 'info');
      }
    } catch (err: any) {
      showToast(`Error checking replies: ${err.message}`, 'error');
    } finally {
      setIsCheckingReplies(false);
    }
  };

  // Send single stage email (with confirmation dialog)
  const handleInitiateSendNextStage = (lead: Lead) => {
    const nextStageNum = lead.currentStage + 1;
    if (nextStageNum > 7) {
      showToast('Lead has already completed all 7 stages.', 'info');
      return;
    }

    const template = templates.find(t => t.stage === nextStageNum) || templates[0];
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
        `Pain Point: "${lead.painPoint || 'Default'}"`,
        `Subject: ${template.subject}`,
        `Next Send Date: +${settings.stageGapDays[nextStageNum] || 3} business days`
      ],
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await executeSendStageEmail(lead, template, nextStageNum);
      }
    });
  };

  const executeSendStageEmail = async (lead: Lead, template: StageTemplate, stageNum: number) => {
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
        settings.senderName
      );

      const today = getTodayDateString();
      const gapDays = settings.stageGapDays[stageNum] || template.defaultGapDays || 3;
      const nextDate = stageNum < 7 ? addBusinessDays(today, gapDays) : '';

      const updatedLead: Lead = {
        ...lead,
        currentStage: stageNum,
        threadId: result.threadId,
        lastEmailSentDate: today,
        nextSendDate: nextDate,
        status: 'Active'
      };

      await handleUpdateLead(updatedLead);
      showToast(`Stage ${stageNum} sent to ${lead.name} via Outlook!`, 'success');

    } catch (err: any) {
      console.error('Send failed:', err);
      showToast(`Send failed: ${err.message || 'Outlook error'}`, 'error');
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
        onTabChange={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'leads' && (
          <LeadsTable
            leads={leads}
            templates={templates}
            initialCampaignFilter={leadsCampaignFilter}
            onSelectLead={(lead) => {
              setSelectedLead(lead);
              setIsLeadDetailOpen(true);
            }}
            onTogglePause={handleTogglePause}
            onSendNextStage={handleInitiateSendNextStage}
            onDeleteLead={handleDeleteLead}
            onOpenAddLead={() => setIsAddLeadOpen(true)}
            onOpenImportLeads={() => setIsImportLeadsOpen(true)}
            onCheckReplies={handleCheckAllReplies}
            isCheckingReplies={isCheckingReplies}
            onOpenScheduler={() => setIsSchedulerOpen(true)}
            dueCount={dueCount}
          />
        )}

        {currentTab === 'replied' && (
          <NeedsManualReplyView
            leads={leads}
            onSelectLead={(lead) => {
              setSelectedLead(lead);
              setIsLeadDetailOpen(true);
            }}
            onUpdateStatus={handleUpdateLeadStatus}
          />
        )}

        {currentTab === 'workflows' && (
          <WorkflowCanvas
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
        )}

        {currentTab === 'tasks' && (
          <ManualTasksDashboard
            tasks={manualTasks}
            onToggleTask={handleToggleManualTask}
            onSelectLead={(lead) => {
              setSelectedLead(lead);
              setIsLeadDetailOpen(true);
            }}
            leads={leads}
          />
        )}

        {currentTab === 'templates' && (
          <TemplateAdmin
            templates={templates}
            onSaveTemplates={handleSaveTemplates}
            leads={leads}
            senderName={settings.senderName}
            senders={senders}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboard
            leads={leads}
            templates={templates}
            trackingEvents={trackingEvents}
            onRefresh={syncTrackingMetrics}
            onNavigateToLeads={(campaignName) => {
              if (campaignName) {
                setLeadsCampaignFilter(campaignName);
              }
              setCurrentTab('leads');
            }}
          />
        )}
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
      />

      {/* Campaign Sequencing Runner Modal */}
      <CampaignSchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        leads={leads}
        templates={templates}
        settings={settings}
        workflows={workflows}
        senders={senders}
        token={null}
        userEmail={userEmail}
        spreadsheetId={spreadsheetId}
        onRunCompleted={handleSchedulerCompleted}
        onTasksCreated={handleTasksCreated}
      />

      {/* Add Single Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onAddLead={handleAddLead}
        existingLeads={leads}
        existingLeadsCount={leads.length}
        existingCount={leads.length}
      />

      {/* CSV / Excel Lead Import Modal */}
      {isImportLeadsOpen && (
        <ImportLeadsModal
          isOpen={isImportLeadsOpen}
          onClose={() => setIsImportLeadsOpen(false)}
          existingLeads={leads || []}
          onCommitImport={handleCommitImport}
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
    </div>
  );
}
