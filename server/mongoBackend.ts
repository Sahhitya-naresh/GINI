import { getDb, COLLECTIONS } from './mongodb.ts';

export interface BackendLead {
  leadId: string;
  name: string;
  email: string;
  company: string;
  painPoint: string;
  currentStage: number;
  status: string;
  lastEmailSentDate: string;
  nextSendDate: string;
  threadId: string;
  notes: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  industry?: string;
  campaign?: string;
  opensCount?: number;
  firstOpenedDate?: string;
  lastOpenedDate?: string;
  clicksCount?: number;
  firstClickedDate?: string;
  lastClickedDate?: string;
  currentNodeId?: string;
  campaignId?: string;
  nodeEnteredDate?: string;
  senderUsed?: string;
  rowIndex?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BackendCampaign {
  id: string;
  name: string;
  description?: string;
  version?: number;
  is_active: boolean;
  workflow_graph: {
    nodes: any[];
    edges: any[];
    description?: string;
    version?: number;
  };
  created_date: string;
  updated_date?: string;
  [key: string]: any;
}

export interface BackendSender {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: 'connected' | 'needs_reauth' | 'alias';
  isPrimary?: boolean;
  dailySendLimit: number;
  sendsToday: number;
  lastUsedAt?: string;
  provider?: 'gmail' | 'outlook' | string;
}

export interface BackendTask {
  id: string;
  leadId: string;
  leadName: string;
  leadCompany?: string;
  leadEmail?: string;
  campaignId?: string;
  campaignName?: string;
  nodeId?: string;
  title: string;
  instruction?: string;
  description?: string;
  type?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface BackendSettings {
  id: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  defaultGapDays?: number;
  stageGapDays?: Record<number, number>;
  skipWeekends?: boolean;
  senderName?: string;
  senderEmail?: string;
  customLogoUrl?: string;
  appName?: string;
  updatedAt?: string;
}

export interface TrackingEvent {
  id: string;
  type: 'open' | 'click';
  leadId: string;
  email?: string;
  stage: number;
  campaign?: string;
  timestamp: string;
  targetUrl?: string;
  ip?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// LEADS CRUD OPERATIONS (MongoDB)
// ---------------------------------------------------------------------------

export async function listLeads(token?: string, spreadsheetId?: string): Promise<BackendLead[]> {
  const db = await getDb();
  const leads = await db
    .collection<BackendLead>(COLLECTIONS.LEADS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return leads;
}

/**
 * Calculates next numeric ID by inspecting existing leads in MongoDB to prevent collision
 */
export async function getNextLeadId(): Promise<string> {
  const db = await getDb();
  const leads = await db
    .collection<BackendLead>(COLLECTIONS.LEADS)
    .find({}, { projection: { leadId: 1 } })
    .toArray();

  let maxNum = 100;
  for (const l of leads) {
    const match = String(l.leadId || '').match(/LEAD-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  return `LEAD-${maxNum + 1}`;
}

export async function createLead(leadData: Partial<BackendLead>): Promise<BackendLead> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const cleanEmail = (leadData.email || '').trim().toLowerCase();
  const rawId = (leadData.leadId || '').trim();

  // Deduplication check: check if lead with same email or leadId already exists
  if (cleanEmail) {
    const existing = await col.findOne({ email: cleanEmail }, { projection: { _id: 0 } });
    if (existing) {
      const updatedDoc: BackendLead = {
        ...existing,
        ...leadData,
        leadId: existing.leadId,
        updatedAt: new Date().toISOString()
      };
      await col.updateOne({ leadId: existing.leadId }, { $set: updatedDoc });
      return updatedDoc;
    }
  }

  let finalLeadId = rawId;
  if (!finalLeadId || finalLeadId.includes('NaN') || finalLeadId.includes('undefined')) {
    finalLeadId = await getNextLeadId();
  }

  // Ensure unique leadId
  const existingById = await col.findOne({ leadId: finalLeadId });
  if (existingById) {
    finalLeadId = await getNextLeadId();
  }

  const now = new Date().toISOString();
  const newLead: BackendLead = {
    leadId: finalLeadId,
    name: (leadData.name || 'Prospect').trim(),
    email: (leadData.email || '').trim(),
    company: (leadData.company || '').trim(),
    painPoint: leadData.painPoint || '',
    currentStage: typeof leadData.currentStage === 'number' ? leadData.currentStage : 0,
    status: leadData.status || 'Active',
    lastEmailSentDate: leadData.lastEmailSentDate || '',
    nextSendDate: leadData.nextSendDate || now.split('T')[0],
    threadId: leadData.threadId || '',
    notes: leadData.notes || '',
    firstName: leadData.firstName || (leadData.name ? leadData.name.split(' ')[0] : ''),
    lastName: leadData.lastName || (leadData.name ? leadData.name.split(' ').slice(1).join(' ') : ''),
    jobTitle: leadData.jobTitle || '',
    linkedinUrl: leadData.linkedinUrl || '',
    industry: leadData.industry || '',
    campaign: leadData.campaign || 'Default',
    opensCount: leadData.opensCount || 0,
    firstOpenedDate: leadData.firstOpenedDate || '',
    lastOpenedDate: leadData.lastOpenedDate || '',
    clicksCount: leadData.clicksCount || 0,
    firstClickedDate: leadData.firstClickedDate || '',
    lastClickedDate: leadData.lastClickedDate || '',
    currentNodeId: leadData.currentNodeId || '',
    campaignId: leadData.campaignId || '',
    nodeEnteredDate: leadData.nodeEnteredDate || '',
    senderUsed: leadData.senderUsed || '',
    createdAt: now,
    updatedAt: now
  };

  await col.insertOne({ ...newLead } as any);
  return newLead;
}

export async function updateLead(leadData: Partial<BackendLead>, token?: string, spreadsheetId?: string): Promise<BackendLead> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);

  if (!leadData.leadId) {
    throw new Error('updateLead requires leadId');
  }

  const existing = await col.findOne({ leadId: leadData.leadId }, { projection: { _id: 0 } });
  if (!existing) {
    // If not found by leadId, try by email if provided
    if (leadData.email) {
      const byEmail = await col.findOne({ email: leadData.email.trim().toLowerCase() }, { projection: { _id: 0 } });
      if (byEmail) {
        const merged: BackendLead = {
          ...byEmail,
          ...leadData,
          leadId: byEmail.leadId,
          updatedAt: new Date().toISOString()
        };
        await col.updateOne({ leadId: byEmail.leadId }, { $set: merged });
        return merged;
      }
    }
    // Fallback: create as new
    return createLead(leadData);
  }

  const updated: BackendLead = {
    ...existing,
    ...leadData,
    updatedAt: new Date().toISOString()
  };

  await col.updateOne({ leadId: leadData.leadId }, { $set: updated });
  return updated;
}

export async function deleteLead(leadId: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const result = await col.deleteOne({ leadId: leadId.trim() });
  return result.deletedCount > 0;
}

export async function batchCreateLeads(leadsData: Partial<BackendLead>[]): Promise<BackendLead[]> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const createdOrUpdated: BackendLead[] = [];

  // Get current max numeric ID
  const allLeads = await col.find({}, { projection: { leadId: 1, email: 1 } }).toArray();
  let maxNum = 100;
  const existingEmailMap = new Map<string, string>();
  for (const l of allLeads) {
    if (l.email) existingEmailMap.set(l.email.trim().toLowerCase(), l.leadId);
    const m = String(l.leadId || '').match(/LEAD-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  const now = new Date().toISOString();

  for (const item of leadsData) {
    const cleanEmail = (item.email || '').trim().toLowerCase();
    const existingLeadId = cleanEmail ? existingEmailMap.get(cleanEmail) : undefined;

    let targetLeadId = existingLeadId || (item.leadId || '').trim();
    if (!targetLeadId || targetLeadId.includes('NaN') || targetLeadId.includes('undefined')) {
      maxNum++;
      targetLeadId = `LEAD-${maxNum}`;
    }

    const leadDoc: BackendLead = {
      leadId: targetLeadId,
      name: (item.name || 'Prospect').trim(),
      email: (item.email || '').trim(),
      company: (item.company || '').trim(),
      painPoint: item.painPoint || '',
      currentStage: typeof item.currentStage === 'number' ? item.currentStage : 0,
      status: item.status || 'Active',
      lastEmailSentDate: item.lastEmailSentDate || '',
      nextSendDate: item.nextSendDate || now.split('T')[0],
      threadId: item.threadId || '',
      notes: item.notes || '',
      firstName: item.firstName || (item.name ? item.name.split(' ')[0] : ''),
      lastName: item.lastName || (item.name ? item.name.split(' ').slice(1).join(' ') : ''),
      jobTitle: item.jobTitle || '',
      linkedinUrl: item.linkedinUrl || '',
      industry: item.industry || '',
      campaign: item.campaign || 'Default',
      opensCount: item.opensCount || 0,
      firstOpenedDate: item.firstOpenedDate || '',
      lastOpenedDate: item.lastOpenedDate || '',
      clicksCount: item.clicksCount || 0,
      firstClickedDate: item.firstClickedDate || '',
      lastClickedDate: item.lastClickedDate || '',
      currentNodeId: item.currentNodeId || '',
      campaignId: item.campaignId || '',
      nodeEnteredDate: item.nodeEnteredDate || '',
      senderUsed: item.senderUsed || '',
      updatedAt: now
    };

    if (cleanEmail) {
      existingEmailMap.set(cleanEmail, targetLeadId);
    }

    await col.updateOne(
      { leadId: targetLeadId },
      { $set: leadDoc, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    createdOrUpdated.push(leadDoc);
  }

  return createdOrUpdated;
}

// ---------------------------------------------------------------------------
// CAMPAIGNS CRUD OPERATIONS (MongoDB with nested workflow_graph)
// ---------------------------------------------------------------------------

export async function listCampaigns(token?: string, spreadsheetId?: string): Promise<BackendCampaign[]> {
  const db = await getDb();
  const campaigns = await db
    .collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return campaigns;
}

export async function saveCampaign(campaign: Partial<BackendCampaign>): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);

  if (!campaign.id) {
    throw new Error('saveCampaign requires campaign id');
  }

  const now = new Date().toISOString();
  const doc: BackendCampaign = {
    id: campaign.id,
    name: campaign.name || 'Untitled Campaign',
    description: campaign.description || '',
    version: campaign.version || 1,
    is_active: Boolean(campaign.is_active ?? campaign.isActive),
    workflow_graph: campaign.workflow_graph || { nodes: campaign.nodes || [], edges: campaign.edges || [] },
    created_date: campaign.created_date || campaign.createdAt || now,
    updated_date: now
  };

  await col.updateOne(
    { id: campaign.id },
    { $set: doc },
    { upsert: true }
  );

  return doc;
}

export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const result = await col.deleteOne({ id: campaignId.trim() });
  return result.deletedCount > 0;
}

export async function toggleCampaignActive(campaignId: string, isActive: boolean): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const now = new Date().toISOString();

  await col.updateOne(
    { id: campaignId.trim() },
    { $set: { is_active: isActive, updated_date: now } }
  );

  const updated = await col.findOne({ id: campaignId.trim() }, { projection: { _id: 0 } });
  if (!updated) {
    throw new Error(`Campaign with id "${campaignId}" not found`);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// SENDERS PERSISTENCE (MongoDB - storing provider per sender profile)
// ---------------------------------------------------------------------------

export async function loadLocalSenders(): Promise<BackendSender[]> {
  const db = await getDb();
  const senders = await db
    .collection<BackendSender>(COLLECTIONS.SENDERS)
    .find({}, { projection: { _id: 0 } })
    .toArray();

  // Ensure each sender has a provider defined (default 'gmail')
  return senders.map(s => ({
    ...s,
    provider: s.provider || 'gmail'
  }));
}

export async function saveLocalSenders(senders: BackendSender[]): Promise<BackendSender[]> {
  const db = await getDb();
  const col = db.collection<BackendSender>(COLLECTIONS.SENDERS);

  const normalized = senders.map(s => ({
    ...s,
    provider: s.provider || 'gmail'
  }));

  if (normalized.length > 0) {
    const ops = normalized.map(s => ({
      updateOne: {
        filter: { id: s.id },
        update: { $set: s },
        upsert: true
      }
    }));
    await col.bulkWrite(ops);
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// TASKS PERSISTENCE (MongoDB)
// ---------------------------------------------------------------------------

export async function loadLocalTasks(): Promise<BackendTask[]> {
  const db = await getDb();
  const tasks = await db
    .collection<BackendTask>(COLLECTIONS.TASKS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return tasks;
}

export async function saveLocalTasks(tasks: BackendTask[]): Promise<BackendTask[]> {
  const db = await getDb();
  const col = db.collection<BackendTask>(COLLECTIONS.TASKS);

  if (tasks.length > 0) {
    const ops = tasks.map(t => ({
      updateOne: {
        filter: { id: t.id },
        update: { $set: t },
        upsert: true
      }
    }));
    await col.bulkWrite(ops);
  }

  return tasks;
}

export async function updateLocalTask(taskId: string, updates: Partial<BackendTask>): Promise<BackendTask | null> {
  const db = await getDb();
  const col = db.collection<BackendTask>(COLLECTIONS.TASKS);

  await col.updateOne({ id: taskId }, { $set: updates });
  const updated = await col.findOne({ id: taskId }, { projection: { _id: 0 } });
  return updated;
}

// ---------------------------------------------------------------------------
// SETTINGS PERSISTENCE (MongoDB)
// ---------------------------------------------------------------------------

export async function loadLocalSettings(): Promise<BackendSettings> {
  const db = await getDb();
  const settings = await db
    .collection<BackendSettings>(COLLECTIONS.SETTINGS)
    .findOne({ id: 'app_settings' }, { projection: { _id: 0 } });

  if (!settings) {
    return {
      id: 'app_settings',
      spreadsheetName: 'Outreach Flow CRM',
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: 'Outreach Flow',
      senderEmail: 'connect@giniiris.ai',
      appName: 'Outreach Flow'
    };
  }
  return settings;
}

export async function saveLocalSettings(settings: Partial<BackendSettings>): Promise<BackendSettings> {
  const db = await getDb();
  const col = db.collection<BackendSettings>(COLLECTIONS.SETTINGS);

  const doc: BackendSettings = {
    ...settings,
    id: 'app_settings',
    updatedAt: new Date().toISOString()
  };

  await col.updateOne(
    { id: 'app_settings' },
    { $set: doc },
    { upsert: true }
  );

  return doc;
}

// ---------------------------------------------------------------------------
// TRACKING EVENTS (MongoDB)
// ---------------------------------------------------------------------------

export async function loadTrackingEvents(): Promise<TrackingEvent[]> {
  const db = await getDb();
  const events = await db
    .collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return events;
}

export async function recordTrackingEvent(event: TrackingEvent): Promise<TrackingEvent> {
  const db = await getDb();
  const col = db.collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS);

  await col.updateOne(
    { id: event.id },
    { $set: event },
    { upsert: true }
  );

  return event;
}

export async function clearAllTrackingEvents(): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TRACKING_EVENTS);
  await col.deleteMany({});
  return true;
}

// ---------------------------------------------------------------------------
// SYSTEM STATS SUMMARY (MongoDB aggregations)
// ---------------------------------------------------------------------------

export async function getSystemStatsSummary() {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const campaignsCol = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const tasksCol = db.collection<BackendTask>(COLLECTIONS.TASKS);
  const sendersCol = db.collection<BackendSender>(COLLECTIONS.SENDERS);
  const eventsCol = db.collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS);

  const [
    totalLeads,
    activeLeads,
    repliedLeads,
    totalCampaigns,
    activeCampaigns,
    totalTasks,
    pendingTasks,
    totalSenders,
    totalOpens,
    totalClicks
  ] = await Promise.all([
    leadsCol.countDocuments(),
    leadsCol.countDocuments({ status: 'Active' }),
    leadsCol.countDocuments({ status: 'Replied' }),
    campaignsCol.countDocuments(),
    campaignsCol.countDocuments({ is_active: true }),
    tasksCol.countDocuments(),
    tasksCol.countDocuments({ isCompleted: false }),
    sendersCol.countDocuments(),
    eventsCol.countDocuments({ type: 'open' }),
    eventsCol.countDocuments({ type: 'click' })
  ]);

  return {
    leads: {
      total: totalLeads,
      active: activeLeads,
      replied: repliedLeads,
      paused: totalLeads - activeLeads - repliedLeads
    },
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns
    },
    tasks: {
      total: totalTasks,
      pending: pendingTasks
    },
    senders: {
      total: totalSenders
    },
    tracking: {
      totalOpens,
      totalClicks
    }
  };
}
