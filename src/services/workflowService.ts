import { 
  CampaignWorkflow, 
  WorkflowNodeItem, 
  WorkflowEdgeItem, 
  ConnectedSender, 
  LeadManualTask, 
  Lead, 
  StageTemplate 
} from '../types';

export const WORKFLOWS_STORAGE_KEY = 'outreach_flow_campaign_workflows';
export const SENDERS_STORAGE_KEY = 'outreach_flow_connected_senders';
export const TASKS_STORAGE_KEY = 'outreach_flow_manual_tasks';

// --------------------------------------------------------------------------
// DEFAULT SENDERS
// --------------------------------------------------------------------------
export const DEFAULT_SENDERS: ConnectedSender[] = [
  {
    id: 'sender-primary',
    name: 'Primary Workspace Account',
    email: 'user@example.com',
    avatarUrl: '',
    status: 'connected',
    isPrimary: true,
    dailySendLimit: 150,
    sendsToday: 0,
    lastUsedAt: new Date().toISOString()
  },
  {
    id: 'sender-sales',
    name: 'Sales Outreach Team',
    email: 'sales.outreach@gini-growth.com',
    avatarUrl: '',
    status: 'connected',
    isPrimary: false,
    dailySendLimit: 200,
    sendsToday: 0,
    lastUsedAt: new Date().toISOString()
  },
  {
    id: 'sender-partnerships',
    name: 'Elena Rostova (Partnerships)',
    email: 'partnerships@gini-growth.com',
    avatarUrl: '',
    status: 'connected',
    isPrimary: false,
    dailySendLimit: 150,
    sendsToday: 0,
    lastUsedAt: new Date().toISOString()
  },
  {
    id: 'sender-growth',
    name: 'Growth & Inbound Inquiries',
    email: 'growth.inbox@outreach-flow.io',
    avatarUrl: '',
    status: 'connected',
    isPrimary: false,
    dailySendLimit: 100,
    sendsToday: 0,
    lastUsedAt: new Date().toISOString()
  }
];

// --------------------------------------------------------------------------
// BLANK CAMPAIGN WORKFLOW (BUILD FROM SCRATCH)
// --------------------------------------------------------------------------
/**
 * Builds a clean, fresh workflow starting from scratch.
 * Canvas loads completely empty by default — user builds every step.
 */
export function createBlankWorkflow(name: string = 'New Outreach Campaign'): CampaignWorkflow {
  const now = new Date().toISOString();
  return {
    id: `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    description: 'Custom campaign built from scratch',
    version: 1,
    isActive: false,
    is_active: false,
    createdAt: now,
    created_date: now,
    updatedAt: now,
    updated_date: now,
    nodes: [],
    edges: []
  };
}

// --------------------------------------------------------------------------
// BACKEND API CLIENT (GOOGLE SHEETS & SERVER PERSISTENCE)
// --------------------------------------------------------------------------

export async function fetchCampaignsFromBackend(token?: string, spreadsheetId?: string): Promise<CampaignWorkflow[]> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const res = await fetch('/api/campaigns/list', {
      method: 'POST',
      headers,
      body: JSON.stringify({ spreadsheetId })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.campaigns)) {
        const mapped: CampaignWorkflow[] = data.campaigns.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || c.workflow_graph?.description || '',
          version: c.version || c.workflow_graph?.version || 1,
          isActive: Boolean(c.is_active),
          is_active: Boolean(c.is_active),
          createdAt: c.created_date || c.createdAt || new Date().toISOString(),
          created_date: c.created_date || new Date().toISOString(),
          updatedAt: c.updated_date || c.updatedAt || new Date().toISOString(),
          updated_date: c.updated_date || new Date().toISOString(),
          nodes: c.workflow_graph?.nodes || [],
          edges: c.workflow_graph?.edges || []
        }));

        saveWorkflows(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch campaigns from backend, using local mirror:', err);
  }

  return loadSavedWorkflows();
}

export async function saveCampaignToBackend(
  campaign: CampaignWorkflow,
  token?: string,
  spreadsheetId?: string
): Promise<CampaignWorkflow> {
  const payload = {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || '',
    version: campaign.version || 1,
    is_active: Boolean(campaign.isActive ?? campaign.is_active ?? false),
    workflow_graph: {
      nodes: campaign.nodes || [],
      edges: campaign.edges || [],
      description: campaign.description || '',
      version: campaign.version || 1
    },
    created_date: campaign.created_date || campaign.createdAt || new Date().toISOString()
  };

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const res = await fetch('/api/campaigns/save', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaign: payload, spreadsheetId })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.campaign) {
        const saved = {
          ...campaign,
          updatedAt: data.campaign.updated_date || new Date().toISOString()
        };
        // Update local cache
        const all = loadSavedWorkflows();
        const idx = all.findIndex(w => w.id === saved.id);
        if (idx !== -1) all[idx] = saved;
        else all.push(saved);
        saveWorkflows(all);
        return saved;
      }
    }
  } catch (err) {
    console.error('Error saving campaign to backend:', err);
  }

  // Fallback to local
  const all = loadSavedWorkflows();
  const idx = all.findIndex(w => w.id === campaign.id);
  if (idx !== -1) all[idx] = campaign;
  else all.push(campaign);
  saveWorkflows(all);
  return campaign;
}

export async function deleteCampaignFromBackend(
  campaignId: string,
  token?: string,
  spreadsheetId?: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    await fetch('/api/campaigns/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaignId, spreadsheetId })
    });
  } catch (err) {
    console.error('Error deleting campaign on backend:', err);
  }

  const all = loadSavedWorkflows().filter(w => w.id !== campaignId);
  saveWorkflows(all);
  return true;
}

export async function toggleCampaignActiveOnBackend(
  campaignId: string,
  isActive: boolean,
  token?: string,
  spreadsheetId?: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

    const res = await fetch('/api/campaigns/toggle-active', {
      method: 'POST',
      headers,
      body: JSON.stringify({ campaignId, isActive, spreadsheetId })
    });
    return res.ok;
  } catch (err) {
    console.error('Error toggling campaign active state on backend:', err);
    return false;
  }
}

export async function runDueCampaignsOnBackend(
  campaignId?: string,
  token?: string,
  spreadsheetId?: string,
  userEmail?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (spreadsheetId) headers['x-spreadsheet-id'] = spreadsheetId;

  const res = await fetch('/api/campaigns/run-due', {
    method: 'POST',
    headers,
    body: JSON.stringify({ campaignId, userEmail, spreadsheetId })
  });

  if (!res.ok) {
    throw new Error('Failed to run due campaigns job');
  }

  return res.json();
}

// --------------------------------------------------------------------------
// LOCAL PERSISTENCE HELPERS
// --------------------------------------------------------------------------

export function loadSavedWorkflows(): CampaignWorkflow[] {
  try {
    const raw = localStorage.getItem(WORKFLOWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse saved workflows:', e);
  }

  // Initial starter campaign
  const initial = [createBlankWorkflow('My First Campaign')];
  saveWorkflows(initial);
  return initial;
}

export function saveWorkflows(workflows: CampaignWorkflow[]): void {
  try {
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows));
  } catch (e) {
    console.error('Failed to save workflows to localStorage:', e);
  }
}

export function loadConnectedSenders(): ConnectedSender[] {
  try {
    const raw = localStorage.getItem(SENDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If legacy localStorage only has 1 sender, merge with DEFAULT_SENDERS so user has options
        if (parsed.length === 1 && (parsed[0].id === 'sender-primary' || parsed[0].email === 'user@example.com')) {
          const merged: ConnectedSender[] = DEFAULT_SENDERS.map(ds => {
            if (ds.id === parsed[0].id || ds.isPrimary) {
              return { ...ds, ...parsed[0] };
            }
            return ds;
          });
          saveConnectedSenders(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load senders:', e);
  }
  saveConnectedSenders(DEFAULT_SENDERS);
  return DEFAULT_SENDERS;
}

export function saveConnectedSenders(senders: ConnectedSender[]): void {
  try {
    localStorage.setItem(SENDERS_STORAGE_KEY, JSON.stringify(senders));
  } catch (e) {
    console.error('Failed to save senders:', e);
  }
}

export function loadManualTasks(): LeadManualTask[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load manual tasks:', e);
  }
  return [];
}

export function saveManualTasks(tasks: LeadManualTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save manual tasks:', e);
  }
}

export function isWithinSchedule(schedule?: any, currentTime: Date = new Date()): boolean {
  if (!schedule) return true;
  const currentDay = currentTime.getDay();
  const currentHour = currentTime.getHours();

  const allowedDays = schedule.allowedDays || schedule.days;
  if (Array.isArray(allowedDays) && allowedDays.length > 0) {
    if (!allowedDays.includes(currentDay)) return false;
  }

  if (typeof schedule.startHour === 'number' && currentHour < schedule.startHour) {
    return false;
  }

  if (typeof schedule.endHour === 'number' && currentHour >= schedule.endHour) {
    return false;
  }

  return true;
}

export function evaluateCondition(
  nodeData: any,
  lead: any
): boolean {
  const condType = nodeData?.conditionType || 'has_replied';
  if (condType === 'has_replied') {
    return lead.status === 'Replied';
  }
  if (condType === 'email_opened') {
    return Number(lead.opensCount || 0) > 0;
  }
  if (condType === 'link_clicked') {
    return Number(lead.clicksCount || 0) > 0;
  }
  return false;
}

export function findNextNode(
  currentNodeId: string,
  workflow: CampaignWorkflow,
  handleId?: 'yes' | 'no' | string
): any | null {
  if (!workflow || !workflow.edges || !workflow.nodes) return null;
  const edge = workflow.edges.find(e => {
    if (e.source !== currentNodeId) return false;
    if (handleId) {
      return e.sourceHandle === handleId;
    }
    return true;
  });
  if (!edge) return null;
  return workflow.nodes.find(n => n.id === edge.target) || null;
}

export function getLeadCurrentNodeId(lead: any, workflow: CampaignWorkflow): string | null {
  if (lead.currentNodeId) return lead.currentNodeId;
  if (!workflow || !workflow.nodes || workflow.nodes.length === 0) return null;
  const startNode = workflow.nodes.find(n => n.type === 'startNode' || n.data?.nodeType === 'start');
  return startNode ? startNode.id : workflow.nodes[0].id;
}
