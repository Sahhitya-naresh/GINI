import { getDb, COLLECTIONS } from './mongodb.ts';
import {
  classifyReply,
  getActiveKeywords,
  normalizeCompanyName,
  areSameCompany,
  ReplyClassificationResult
} from './replyRules.ts';
import { sanitizeHtml } from './templateBackend.ts';

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

  // Ownership & Audit fields
  ownerId?: string;
  ownerName?: string;
  lastModifiedBy?: string;
  sentBy?: string;
  templateSource?: 'campaign' | 'own';

  // Sentiment and classification fields
  replySentiment?: 'positive' | 'negative' | 'neutral';
  replyClassifiedBy?: 'auto' | 'manual';
  replyClassifiedAt?: string;
  replyMatchedPhrases?: string[];
  replyReason?: string;
  stoppedReason?: string;
  stoppedByLeadId?: string;
  pendingCompanyPause?: {
    candidateLeadIds: string[];
    companyName?: string;
    count: number;
  };
  [key: string]: any;
}

export interface CampaignVersionSnapshot {
  version: number;
  name: string;
  workflow_graph: any;
  editedBy: string;
  editedAt: string;
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

  // Ownership, Audit & Versioning fields
  ownerId?: string;
  ownerName?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  versions?: CampaignVersionSnapshot[];

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
  positiveReplyAction?: 'pause_automatically' | 'ask_first';
  emailHeader?: string;
  emailFooter?: string;
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

export async function listLeads(token?: string, spreadsheetId?: string, queryFilter?: any): Promise<BackendLead[]> {
  const db = await getDb();
  const filter = queryFilter || {};
  const leads = await db
    .collection<BackendLead>(COLLECTIONS.LEADS)
    .find(filter, { projection: { _id: 0 } })
    .toArray();


  const activeKeywords = await getActiveKeywords().catch(() => undefined);

  // Auto-synchronize sentiment & status consistency across all leads
  for (const l of leads) {
    let changed = false;
    const updatePayload: Partial<BackendLead> = {};

    // 1. If lead has replied or status Replied/Negative Reply, but replySentiment is missing, auto-classify from inbound_replies
    if ((l.hasReplied || l.status === 'Replied' || l.status === 'Negative Reply') && !l.replySentiment) {
      try {
        const cleanEmail = (l.email || '').trim().toLowerCase();
        const inb = await db.collection(COLLECTIONS.INBOUND_REPLIES).findOne({
          $or: [
            ...(cleanEmail ? [{ leadEmail: cleanEmail }, { from: { $regex: cleanEmail, $options: 'i' } }] : []),
            ...(l.threadId ? [{ threadId: l.threadId }] : []),
            ...(l.leadId ? [{ leadId: l.leadId }] : [])
          ]
        });

        if (inb) {
          const classification = classifyReply((inb as any).subject, (inb as any).body, activeKeywords);
          l.replySentiment = classification.sentiment;
          l.replyClassifiedBy = 'auto';
          l.replyClassifiedAt = new Date().toISOString();
          l.replyMatchedPhrases = classification.matchedPhrases;
          l.replyReason = classification.reason;

          updatePayload.replySentiment = l.replySentiment;
          updatePayload.replyClassifiedBy = l.replyClassifiedBy;
          updatePayload.replyClassifiedAt = l.replyClassifiedAt;
          updatePayload.replyMatchedPhrases = l.replyMatchedPhrases;
          updatePayload.replyReason = l.replyReason;

          if (classification.sentiment === 'negative') {
            l.status = 'Negative Reply';
            l.stoppedReason = 'Negative reply received';
            updatePayload.status = 'Negative Reply';
            updatePayload.stoppedReason = 'Negative reply received';
          }
          changed = true;
        }
      } catch (_) {}
    }

    // 2. Strict safety sync: any lead with negative replySentiment MUST have status 'Negative Reply'
    if (l.replySentiment === 'negative' && l.status !== 'Negative Reply') {
      l.status = 'Negative Reply';
      l.stoppedReason = l.stoppedReason || 'Negative reply received';
      updatePayload.status = 'Negative Reply';
      updatePayload.stoppedReason = l.stoppedReason;
      changed = true;
    }

    if (changed && Object.keys(updatePayload).length > 0) {
      updatePayload.updatedAt = new Date().toISOString();
      await db.collection(COLLECTIONS.LEADS).updateOne(
        { leadId: l.leadId },
        { $set: updatePayload }
      ).catch(() => {});
    }
  }

  return leads.map(l => ({
    ...l,
    notes: cleanLeadNotes(l.notes),
    campaign: (l.campaign && l.campaign.trim()) ? l.campaign.trim() : 'Default',
    campaignId: l.campaignId || ''
  }));
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

export async function createLead(leadData: Partial<BackendLead>, requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendLead> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const cleanEmail = (leadData.email || '').trim().toLowerCase();
  const rawId = (leadData.leadId || '').trim();

  // Deduplication check: check if lead with same email already exists
  if (cleanEmail) {
    const existing = await col.findOne({ email: cleanEmail }, { projection: { _id: 0 } });
    if (existing) {
      if (requestingUser) {
        // Duplicate check across users
        if (existing.ownerId && existing.ownerId !== requestingUser.id) {
          if (requestingUser.role !== 'admin') {
            const err: any = new Error("This contact already exists in the system");
            err.status = 409;
            throw err;
          } else {
            const ownerLabel = existing.ownerName || existing.ownerId;
            const err: any = new Error(`This contact already exists in the system (owned by ${ownerLabel})`);
            err.status = 409;
            throw err;
          }
        }
      }

      const assignedOwnerId = existing.ownerId || (requestingUser?.role === 'admin' ? leadData.ownerId || requestingUser.id : requestingUser?.id || '');
      const assignedOwnerName = existing.ownerName || (requestingUser?.role === 'admin' ? leadData.ownerName || requestingUser.name : requestingUser?.name || '');

      const updatedDoc: BackendLead = {
        ...existing,
        ...leadData,
        leadId: existing.leadId,
        ownerId: assignedOwnerId,
        ownerName: assignedOwnerName,
        lastModifiedBy: requestingUser?.name || 'System',
        currentStage: typeof leadData.currentStage === 'number' ? leadData.currentStage : (existing.currentStage || 0),
        status: leadData.status || existing.status || 'Active',
        lastEmailSentDate: leadData.lastEmailSentDate || existing.lastEmailSentDate || '',
        nextSendDate: leadData.nextSendDate || existing.nextSendDate || new Date().toISOString().split('T')[0],
        threadId: leadData.threadId || existing.threadId || '',
        opensCount: typeof leadData.opensCount === 'number' ? leadData.opensCount : (existing.opensCount || 0),
        clicksCount: typeof leadData.clicksCount === 'number' ? leadData.clicksCount : (existing.clicksCount || 0),
        firstOpenedDate: leadData.firstOpenedDate || existing.firstOpenedDate || '',
        lastOpenedDate: leadData.lastOpenedDate || existing.lastOpenedDate || '',
        firstClickedDate: leadData.firstClickedDate || existing.firstClickedDate || '',
        lastClickedDate: leadData.lastClickedDate || existing.lastClickedDate || '',
        templateSource: leadData.templateSource || existing.templateSource || 'campaign',
        updatedAt: new Date().toISOString()
      };
      await col.updateOne({ leadId: existing.leadId }, { $set: updatedDoc });

      // Clean up previous tasks & tracking events for this email
      try {
        await db.collection(COLLECTIONS.TASKS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { leadEmail: { $regex: `^${cleanEmail}$`, $options: 'i' } }
          ]
        });
        await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { email: { $regex: `^${cleanEmail}$`, $options: 'i' } }
          ]
        });
      } catch (_) {}

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

  // Purge any pre-existing orphan tasks, tracking events, or replies for this email or leadId
  if (cleanEmail || finalLeadId) {
    try {
      const taskOr: any[] = [];
      const trackOr: any[] = [];
      const replyOr: any[] = [];
      if (finalLeadId) {
        taskOr.push({ leadId: finalLeadId });
        trackOr.push({ leadId: finalLeadId });
        replyOr.push({ leadId: finalLeadId });
      }
      if (cleanEmail) {
        taskOr.push({ leadEmail: { $regex: `^${cleanEmail}$`, $options: 'i' } });
        trackOr.push({ email: { $regex: `^${cleanEmail}$`, $options: 'i' } });
        replyOr.push({ leadEmail: { $regex: `^${cleanEmail}$`, $options: 'i' } });
        replyOr.push({ from: { $regex: `^${cleanEmail}$`, $options: 'i' } });
      }
      if (taskOr.length > 0) await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskOr });
      if (trackOr.length > 0) await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackOr });
      if (replyOr.length > 0) await db.collection(COLLECTIONS.INBOUND_REPLIES).deleteMany({ $or: replyOr });
    } catch (_) {}
  }

  const assignedOwnerId = (requestingUser?.role === 'admin' && leadData.ownerId)
    ? leadData.ownerId
    : (requestingUser?.id || leadData.ownerId || '');
  const assignedOwnerName = (requestingUser?.role === 'admin' && leadData.ownerName)
    ? leadData.ownerName
    : (requestingUser?.name || leadData.ownerName || '');

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
    ownerId: assignedOwnerId,
    ownerName: assignedOwnerName,
    lastModifiedBy: requestingUser?.name || 'System',
    templateSource: leadData.templateSource || 'campaign',
    createdAt: now,
    updatedAt: now
  };

  if (!newLead.campaignId && newLead.campaign && newLead.campaign !== 'Default') {
    const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
      name: { $regex: new RegExp(`^${newLead.campaign.trim()}$`, 'i') }
    });
    if (matchedCamp && (matchedCamp.id || (matchedCamp as any)._id)) {
      newLead.campaignId = matchedCamp.id || String((matchedCamp as any)._id);
    }
  }

  await col.insertOne({ ...newLead } as any);
  return newLead;
}

export async function updateLead(leadData: Partial<BackendLead>, token?: string, spreadsheetId?: string, requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendLead> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);

  if (!leadData.leadId) {
    throw new Error('updateLead requires leadId');
  }

  const existing = await col.findOne({ leadId: leadData.leadId }, { projection: { _id: 0 } });
  if (!existing) {
    const err: any = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  // Scoping check: non-admin can only update their own leads
  if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err: any = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  const payload: Partial<BackendLead> = {
    ...leadData
  };
  // Non-admins cannot alter ownership fields
  if (requestingUser && requestingUser.role !== 'admin') {
    delete (payload as any).ownerId;
    delete (payload as any).ownerName;
  }

  const updated: BackendLead = {
    ...existing,
    ...payload,
    notes: cleanLeadNotes(payload.notes !== undefined ? payload.notes : existing.notes),
    lastModifiedBy: requestingUser?.name || existing.lastModifiedBy || 'System',
    updatedAt: new Date().toISOString()
  };

  // Prevent accidental status downgrade of Negative Reply
  if ((existing.replySentiment === 'negative' || payload.replySentiment === 'negative') && updated.status === 'Replied') {
    updated.status = 'Negative Reply';
    updated.replySentiment = 'negative';
  } else if (updated.status === 'Negative Reply' && !updated.replySentiment) {
    updated.replySentiment = 'negative';
  }

  await col.updateOne({ leadId: leadData.leadId }, { $set: updated });
  return updated;
}

export async function deleteLead(leadId: string, requestingUser?: { id: string; name?: string; role?: string }): Promise<boolean> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const cleanId = leadId.trim();
  const existing = await col.findOne({ leadId: cleanId });

  if (!existing) {
    const err: any = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  // Scoping check: non-admin can only delete their own leads
  if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err: any = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  const leadEmail = existing.email?.trim().toLowerCase();
  const result = await col.deleteOne({ leadId: cleanId });

  // Delete associated tasks
  try {
    const taskFilters: any[] = [
      { leadId: cleanId },
      { id: { $regex: cleanId, $options: 'i' } }
    ];
    if (leadEmail) {
      taskFilters.push({ leadEmail: { $regex: `^${leadEmail}$`, $options: 'i' } });
    }
    await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskFilters });
  } catch (_) {}

  // Delete associated tracking events
  try {
    const trackingFilters: any[] = [
      { leadId: cleanId }
    ];
    if (leadEmail) {
      trackingFilters.push({ email: { $regex: `^${leadEmail}$`, $options: 'i' } });
    }
    await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackingFilters });
  } catch (_) {}

  // Delete associated inbound replies
  try {
    const replyFilters: any[] = [
      { leadId: cleanId }
    ];
    if (leadEmail) {
      replyFilters.push({ leadEmail: { $regex: `^${leadEmail}$`, $options: 'i' } });
      replyFilters.push({ from: { $regex: `^${leadEmail}$`, $options: 'i' } });
    }
    await db.collection(COLLECTIONS.INBOUND_REPLIES).deleteMany({ $or: replyFilters });
  } catch (_) {}

  return result.deletedCount > 0;
}

export async function batchCreateLeads(leadsData: Partial<BackendLead>[], requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendLead[]> {
  const db = await getDb();
  const col = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const createdOrUpdated: BackendLead[] = [];

  const allLeads = await col.find({}, { projection: { leadId: 1, email: 1, ownerId: 1, ownerName: 1 } }).toArray();
  let maxNum = 100;
  const existingEmailMap = new Map<string, { leadId: string; ownerId?: string; ownerName?: string }>();
  for (const l of allLeads) {
    if (l.email) existingEmailMap.set(l.email.trim().toLowerCase(), { leadId: l.leadId, ownerId: l.ownerId, ownerName: l.ownerName });
    const m = String(l.leadId || '').match(/LEAD-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  const now = new Date().toISOString();

  for (const item of leadsData) {
    const cleanEmail = (item.email || '').trim().toLowerCase();
    const existing = cleanEmail ? existingEmailMap.get(cleanEmail) : undefined;

    // Duplicate email check: if already owned by someone else, skip importing
    if (existing && requestingUser) {
      if (existing.ownerId && existing.ownerId !== requestingUser.id) {
        continue;
      }
    }

    let targetLeadId = existing?.leadId || (item.leadId || '').trim();
    if (!targetLeadId || targetLeadId.includes('NaN') || targetLeadId.includes('undefined')) {
      maxNum++;
      targetLeadId = `LEAD-${maxNum}`;
    }

    const assignedOwnerId = (requestingUser?.role === 'admin' && item.ownerId)
      ? item.ownerId
      : (requestingUser?.id || item.ownerId || '');
    const assignedOwnerName = (requestingUser?.role === 'admin' && item.ownerName)
      ? item.ownerName
      : (requestingUser?.name || item.ownerName || '');

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
      ownerId: assignedOwnerId,
      ownerName: assignedOwnerName,
      lastModifiedBy: requestingUser?.name || 'System',
      templateSource: item.templateSource || 'campaign',
      updatedAt: now
    };

    if (!leadDoc.campaignId && leadDoc.campaign && leadDoc.campaign !== 'Default') {
      const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
        name: { $regex: new RegExp(`^${leadDoc.campaign.trim()}$`, 'i') }
      });
      if (matchedCamp && (matchedCamp.id || (matchedCamp as any)._id)) {
        leadDoc.campaignId = matchedCamp.id || String((matchedCamp as any)._id);
      }
    }

    if (cleanEmail) {
      existingEmailMap.set(cleanEmail, { leadId: targetLeadId, ownerId: assignedOwnerId, ownerName: assignedOwnerName });
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

export async function reassignLead(leadId: string, targetUserId: string, requestingUser: { id: string; name: string; role: string }) {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const usersCol = db.collection('users');

  const targetUser = await usersCol.findOne({ id: targetUserId });
  if (!targetUser || (targetUser as any).isActive === false) {
    const err: any = new Error('Target user does not exist or is inactive');
    err.status = 400;
    throw err;
  }

  const lead = await leadsCol.findOne({ leadId: leadId.trim() });
  if (!lead) {
    const err: any = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  const prevOwnerName = lead.ownerName || lead.ownerId || 'Unassigned';
  const prevOwnerId = lead.ownerId || 'none';
  const newOwnerName = (targetUser as any).name;
  const auditNote = `[Reassigned from ${prevOwnerName} (${prevOwnerId}) to ${newOwnerName} (${targetUserId}) by ${requestingUser.name} on ${now}]`;

  await leadsCol.updateOne(
    { leadId: lead.leadId },
    {
      $set: {
        ownerId: targetUserId,
        ownerName: newOwnerName,
        lastModifiedBy: requestingUser.name,
        notes: appendLeadNote(lead.notes, auditNote),
        updatedAt: now
      }
    }
  );

  const templateNotice = lead.templateSource === 'own'
    ? `Notice: Lead "${lead.name}" uses personal template sequence, which now switches to ${newOwnerName}'s personal template sequence.`
    : null;

  return { success: true, leadId: lead.leadId, newOwnerId: targetUserId, newOwnerName, templateNotice };
}

export async function reassignAllLeads(fromUserId: string, toUserId: string, requestingUser: { id: string; name: string; role: string }) {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const usersCol = db.collection('users');

  const targetUser = await usersCol.findOne({ id: toUserId });
  if (!targetUser || (targetUser as any).isActive === false) {
    const err: any = new Error('Target user does not exist or is inactive');
    err.status = 400;
    throw err;
  }

  const leads = await leadsCol.find({ ownerId: fromUserId }).toArray();
  const now = new Date().toISOString();
  const newOwnerName = (targetUser as any).name;

  let count = 0;
  for (const lead of leads) {
    const prevOwnerName = lead.ownerName || fromUserId;
    const auditNote = `[Reassigned from ${prevOwnerName} (${fromUserId}) to ${newOwnerName} (${toUserId}) by ${requestingUser.name} on ${now}]`;
    await leadsCol.updateOne(
      { leadId: lead.leadId },
      {
        $set: {
          ownerId: toUserId,
          ownerName: newOwnerName,
          lastModifiedBy: requestingUser.name,
          notes: appendLeadNote(lead.notes, auditNote),
          updatedAt: now
        }
      }
    );
    count++;
  }

  return { success: true, reassignedCount: count, toUserId, toUserName: newOwnerName };
}

export async function listCampaigns(token?: string, spreadsheetId?: string): Promise<BackendCampaign[]> {
  const db = await getDb();
  const campaigns = await db
    .collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return campaigns;
}

export async function saveCampaign(campaign: Partial<BackendCampaign>, requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);

  if (!campaign.id) {
    throw new Error('saveCampaign requires campaign id');
  }

  const existing = await col.findOne({ id: campaign.id }, { projection: { _id: 0 } });
  const now = new Date().toISOString();

  let versions = existing?.versions || [];
  let currentVersion = existing?.version || 1;

  if (existing) {
    // If editing existing: check ownership
    if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
      const err: any = new Error('Forbidden: only the campaign owner or an admin can edit this campaign');
      err.status = 403;
      throw err;
    }

    // Save previous version snapshot (keep up to 10)
    const snapshot: CampaignVersionSnapshot = {
      version: currentVersion,
      name: existing.name,
      workflow_graph: existing.workflow_graph,
      editedBy: existing.lastEditedBy || existing.ownerName || 'Unknown',
      editedAt: existing.lastEditedAt || existing.updated_date || existing.created_date
    };
    versions = [snapshot, ...versions].slice(0, 10);
    currentVersion += 1;
  }

  const assignedOwnerId = existing
    ? (existing.ownerId || requestingUser?.id || '')
    : (requestingUser?.id || campaign.ownerId || '');
  const assignedOwnerName = existing
    ? (existing.ownerName || requestingUser?.name || '')
    : (requestingUser?.name || campaign.ownerName || '');

  const doc: BackendCampaign = {
    id: campaign.id,
    name: campaign.name || existing?.name || 'Untitled Campaign',
    description: campaign.description !== undefined ? campaign.description : (existing?.description || ''),
    version: currentVersion,
    is_active: Boolean(campaign.is_active ?? campaign.isActive ?? existing?.is_active ?? true),
    workflow_graph: campaign.workflow_graph || (campaign.nodes ? { nodes: campaign.nodes || [], edges: campaign.edges || [] } : existing?.workflow_graph || { nodes: [], edges: [] }),
    created_date: existing?.created_date || campaign.created_date || campaign.createdAt || now,
    updated_date: now,
    ownerId: assignedOwnerId,
    ownerName: assignedOwnerName,
    lastEditedBy: requestingUser?.name || 'System',
    lastEditedAt: now,
    versions
  };

  await col.updateOne(
    { id: campaign.id },
    { $set: doc },
    { upsert: true }
  );

  if (!existing) {
    try {
      const { createTemplateSetForNewCampaign } = await import('./templateBackend.ts');
      await createTemplateSetForNewCampaign(campaign.id, doc.name, requestingUser);
    } catch (cErr) {
      console.warn('[Campaign] Failed to create template set for new campaign:', cErr);
    }
  }

  return doc;
}

export async function deleteCampaign(campaignId: string, requestingUser?: { id: string; name?: string; role?: string }): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const cleanId = campaignId.trim();

  const existing = await col.findOne({ id: cleanId });
  if (!existing) {
    const err: any = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err: any = new Error('Forbidden: only the campaign owner or an admin can delete this campaign');
    err.status = 403;
    throw err;
  }

  // Block deleting a campaign with enrolled active leads
  const activeLeadsCount = await db.collection(COLLECTIONS.LEADS).countDocuments({
    campaignId: cleanId,
    status: 'Active'
  });

  if (activeLeadsCount > 0) {
    const err: any = new Error(`Cannot delete campaign with active enrolled leads: ${activeLeadsCount} active lead(s) currently enrolled`);
    err.status = 400;
    throw err;
  }

  const result = await col.deleteOne({ id: cleanId });
  return result.deletedCount > 0;
}

export async function toggleCampaignActive(campaignId: string, isActive: boolean, requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const cleanId = campaignId.trim();

  const existing = await col.findOne({ id: cleanId }, { projection: { _id: 0 } });
  if (!existing) {
    const err: any = new Error(`Campaign with id "${campaignId}" not found`);
    err.status = 404;
    throw err;
  }

  if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err: any = new Error('Forbidden: only the campaign owner or an admin can toggle active state');
    err.status = 403;
    throw err;
  }

  const now = new Date().toISOString();
  await col.updateOne(
    { id: cleanId },
    { $set: { is_active: isActive, updated_date: now, lastEditedBy: requestingUser?.name || 'System', lastEditedAt: now } }
  );

  const updated = await col.findOne({ id: cleanId }, { projection: { _id: 0 } });
  return updated!;
}

export async function checkCampaignImpact(campaignId: string, requestingUserId?: string) {
  const db = await getDb();
  const leads = await db.collection(COLLECTIONS.LEADS).find({
    campaignId: campaignId.trim(),
    status: 'Active'
  }).toArray();

  const totalActiveLeadsCount = leads.length;
  const userIds = new Set<string>();
  const userNames = new Set<string>();
  let colleagueLeadsCount = 0;

  for (const l of leads) {
    if (l.ownerId) userIds.add(l.ownerId);
    if (l.ownerName) userNames.add(l.ownerName);
    if (requestingUserId && l.ownerId && l.ownerId !== requestingUserId) {
      colleagueLeadsCount++;
    }
  }

  return {
    colleagueLeadsCount,
    enrolledOtherUsersLeadsCount: colleagueLeadsCount,
    totalActiveLeadsCount,
    userCount: userIds.size,
    affectedUserNames: Array.from(userNames)
  };
}

export async function duplicateCampaign(campaignId: string, requestingUser?: { id: string; name?: string; role?: string }, newName?: string): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const existing = await col.findOne({ id: campaignId.trim() }, { projection: { _id: 0 } });

  if (!existing) {
    const err: any = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  const newId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const duplicateName = newName || `${existing.name} (Copy)`;

  const doc: BackendCampaign = {
    id: newId,
    name: duplicateName,
    description: existing.description || '',
    version: 1,
    is_active: false,
    workflow_graph: JSON.parse(JSON.stringify(existing.workflow_graph || { nodes: [], edges: [] })),
    created_date: now,
    updated_date: now,
    ownerId: requestingUser?.id || '',
    ownerName: requestingUser?.name || '',
    lastEditedBy: requestingUser?.name || '',
    lastEditedAt: now,
    versions: []
  };

  await col.insertOne(doc as any);

  try {
    const { getCampaignTemplateSet } = await import('./templateBackend.ts');
    const sourceSet = await getCampaignTemplateSet(existing.id, existing.name);
    const newCampSet = {
      id: `tplset-camp-${newId}`,
      kind: 'campaign' as const,
      campaignId: newId,
      name: `${duplicateName} Sequence`,
      stages: sourceSet.stages.map(s => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: requestingUser?.name || 'System',
      updatedAt: now,
      createdAt: now
    };
    await db.collection(COLLECTIONS.TEMPLATE_SETS).insertOne(newCampSet as any);
  } catch (err) {
    console.warn('[Campaign] Template copy warning during duplicate:', err);
  }

  return doc;
}

export async function restoreCampaignVersion(campaignId: string, targetVersion: number, requestingUser?: { id: string; name?: string; role?: string }): Promise<BackendCampaign> {
  const db = await getDb();
  const col = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const existing = await col.findOne({ id: campaignId.trim() }, { projection: { _id: 0 } });

  if (!existing) {
    const err: any = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  if (requestingUser && requestingUser.role !== 'admin' && existing.ownerId && existing.ownerId !== requestingUser.id) {
    const err: any = new Error('Forbidden: only the campaign owner or an admin can restore versions');
    err.status = 403;
    throw err;
  }

  const versions = existing.versions || [];
  const targetSnapshot = versions.find(v => v.version === targetVersion);
  if (!targetSnapshot) {
    const err: any = new Error(`Version ${targetVersion} not found in campaign history`);
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  const currentSnapshot: CampaignVersionSnapshot = {
    version: existing.version || 1,
    name: existing.name,
    workflow_graph: existing.workflow_graph,
    editedBy: existing.lastEditedBy || existing.ownerName || 'Unknown',
    editedAt: existing.lastEditedAt || existing.updated_date || existing.created_date
  };

  const updatedVersions = [currentSnapshot, ...versions.filter(v => v.version !== targetVersion)].slice(0, 10);
  const newVersionNumber = (existing.version || 1) + 1;

  const restoredDoc: BackendCampaign = {
    ...existing,
    name: targetSnapshot.name,
    workflow_graph: targetSnapshot.workflow_graph,
    version: newVersionNumber,
    lastEditedBy: requestingUser?.name || 'System',
    lastEditedAt: now,
    updated_date: now,
    versions: updatedVersions
  };

  await col.updateOne({ id: campaignId.trim() }, { $set: restoredDoc });
  return restoredDoc;
}


// ---------------------------------------------------------------------------
// SENDERS PERSISTENCE (MongoDB - storing provider per sender profile)
// ---------------------------------------------------------------------------

export async function loadLocalSenders(): Promise<BackendSender[]> {
  const serviceAccount = (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || '').trim();
  const displayName = (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || 'Microsoft Graph Service Mailbox').trim();

  const db = await getDb();
  let senders = await db
    .collection<BackendSender>(COLLECTIONS.SENDERS)
    .find({}, { projection: { _id: 0 } })
    .toArray();

  if (senders.length === 0) {
    const defaultSender: BackendSender = {
      id: 'sender-primary',
      name: displayName,
      email: serviceAccount || 'service-account@domain.com',
      avatarUrl: '',
      status: 'connected',
      isPrimary: true,
      dailySendLimit: 500,
      sendsToday: 0,
      provider: 'outlook',
      lastUsedAt: new Date().toISOString()
    };
    await db.collection(COLLECTIONS.SENDERS).insertOne(defaultSender);
    return [defaultSender];
  }

  // When a service account mailbox is configured, ensure the primary sender reflects it
  if (serviceAccount) {
    return senders.map((s, idx) => {
      if (s.isPrimary || idx === 0) {
        return {
          ...s,
          name: displayName || s.name,
          email: serviceAccount,
          provider: 'outlook',
          status: 'connected'
        };
      }
      return {
        ...s,
        provider: s.provider || 'outlook'
      };
    });
  }

  // Ensure each sender has a provider defined (default 'outlook')
  return senders.map(s => ({
    ...s,
    provider: s.provider || 'outlook'
  }));
}

export async function saveLocalSenders(senders: BackendSender[]): Promise<BackendSender[]> {
  const db = await getDb();
  const col = db.collection<BackendSender>(COLLECTIONS.SENDERS);

  const normalized = senders.map(s => ({
    ...s,
    provider: s.provider || 'outlook'
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

export async function loadLocalTasks(ownerId?: string): Promise<BackendTask[]> {
  const db = await getDb();
  if (ownerId) {
    const leads = await db
      .collection<BackendLead>(COLLECTIONS.LEADS)
      .find({ ownerId }, { projection: { leadId: 1 } })
      .toArray();
    const leadIds = leads.map(l => l.leadId);
    return db
      .collection<BackendTask>(COLLECTIONS.TASKS)
      .find({ leadId: { $in: leadIds } }, { projection: { _id: 0 } })
      .toArray();
  }
  return db
    .collection<BackendTask>(COLLECTIONS.TASKS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
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

export async function deleteLocalTask(taskId: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection<BackendTask>(COLLECTIONS.TASKS);
  const result = await col.deleteOne({ id: taskId });
  return result.deletedCount > 0;
}

export async function loadTaskAlertsState(): Promise<{ dismissedAlertIds: string[] }> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.SETTINGS).findOne({ id: 'task_alerts_state' });
  return {
    dismissedAlertIds: Array.isArray(doc?.dismissedAlertIds) ? doc.dismissedAlertIds : []
  };
}

export async function saveDismissedTaskAlerts(alertIds: string[]): Promise<string[]> {
  const db = await getDb();
  const existing = await loadTaskAlertsState();
  const merged = Array.from(new Set([...existing.dismissedAlertIds, ...alertIds]));
  await db.collection(COLLECTIONS.SETTINGS).updateOne(
    { id: 'task_alerts_state' },
    { $set: { id: 'task_alerts_state', dismissedAlertIds: merged, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return merged;
}

export async function clearTaskAlertsState(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.SETTINGS).updateOne(
    { id: 'task_alerts_state' },
    { $set: { id: 'task_alerts_state', dismissedAlertIds: [], updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

// ---------------------------------------------------------------------------
// PER-USER WORKSPACE NOTES & ALERT STATES (MongoDB)
// ---------------------------------------------------------------------------

export async function loadUserWorkspaceNotes(userId: string): Promise<string> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.USER_WORKSPACE_NOTES).findOne({ userId });
  return (doc as any)?.notes || '';
}

export async function saveUserWorkspaceNotes(userId: string, notes: string): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection(COLLECTIONS.USER_WORKSPACE_NOTES).updateOne(
    { userId },
    { $set: { userId, notes, updatedAt: now } },
    { upsert: true }
  );
  return notes;
}

export async function loadUserAlertsState(userId: string): Promise<{ dismissedAlertIds: string[] }> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.USER_ALERT_STATES).findOne({ userId });
  return {
    dismissedAlertIds: Array.isArray((doc as any)?.dismissedAlertIds) ? (doc as any).dismissedAlertIds : []
  };
}

export async function saveUserDismissedAlerts(userId: string, alertIds: string[]): Promise<string[]> {
  const db = await getDb();
  const existing = await loadUserAlertsState(userId);
  const merged = Array.from(new Set([...existing.dismissedAlertIds, ...alertIds]));
  const now = new Date().toISOString();
  await db.collection(COLLECTIONS.USER_ALERT_STATES).updateOne(
    { userId },
    { $set: { userId, dismissedAlertIds: merged, updatedAt: now } },
    { upsert: true }
  );
  return merged;
}

export async function clearUserAlertsState(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection(COLLECTIONS.USER_ALERT_STATES).updateOne(
    { userId },
    { $set: { userId, dismissedAlertIds: [], updatedAt: now } },
    { upsert: true }
  );
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

  const cleanHeader = settings.emailHeader !== undefined ? sanitizeHtml(settings.emailHeader) : undefined;
  const cleanFooter = settings.emailFooter !== undefined ? sanitizeHtml(settings.emailFooter) : undefined;

  const doc: BackendSettings = {
    ...settings,
    ...(cleanHeader !== undefined ? { emailHeader: cleanHeader } : {}),
    ...(cleanFooter !== undefined ? { emailFooter: cleanFooter } : {}),
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

export async function loadTrackingEvents(ownerId?: string): Promise<TrackingEvent[]> {
  const db = await getDb();
  if (ownerId) {
    const leads = await db
      .collection<BackendLead>(COLLECTIONS.LEADS)
      .find({ ownerId }, { projection: { leadId: 1 } })
      .toArray();
    const leadIds = leads.map(l => l.leadId);
    return db
      .collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS)
      .find({ leadId: { $in: leadIds } }, { projection: { _id: 0 } })
      .toArray();
  }
  return db
    .collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS)
    .find({}, { projection: { _id: 0 } })
    .toArray();
}

export async function recordTrackingEvent(event: TrackingEvent): Promise<TrackingEvent> {
  const db = await getDb();
  const col = db.collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS);

  await col.updateOne(
    { id: event.id },
    { $set: event },
    { upsert: true }
  );

  // Synchronously update the matching lead document in MongoDB
  try {
    const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);
    const filterConditions: any[] = [];
    if (event.leadId && event.leadId !== 'TEST') {
      filterConditions.push({ leadId: event.leadId });
    }
    if (event.email) {
      filterConditions.push({ email: event.email });
    }
    if (filterConditions.length > 0) {
      const updateDoc: any = {
        $set: {
          updatedAt: new Date().toISOString(),
          ...(event.type === 'open' ? { lastOpenedDate: event.timestamp } : { lastClickedDate: event.timestamp })
        },
        $inc: {
          ...(event.type === 'open' ? { opensCount: 1 } : { clicksCount: 1 })
        }
      };
      await leadsCol.updateOne({ $or: filterConditions }, updateDoc);
    }
  } catch (leadUpdateErr) {
    console.warn('Could not update lead engagement counters on tracking event:', leadUpdateErr);
  }

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

export async function getSystemStatsSummary(ownerId?: string) {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);
  const campaignsCol = db.collection<BackendCampaign>(COLLECTIONS.CAMPAIGNS);
  const tasksCol = db.collection<BackendTask>(COLLECTIONS.TASKS);
  const sendersCol = db.collection<BackendSender>(COLLECTIONS.SENDERS);
  const eventsCol = db.collection<TrackingEvent>(COLLECTIONS.TRACKING_EVENTS);

  const leadsFilter = ownerId ? { ownerId } : {};
  let tasksFilter: any = {};
  let eventsFilter: any = {};

  if (ownerId) {
    const leads = await leadsCol.find({ ownerId }, { projection: { leadId: 1 } }).toArray();
    const leadIds = leads.map(l => l.leadId);
    tasksFilter = { leadId: { $in: leadIds } };
    eventsFilter = { leadId: { $in: leadIds } };
  }

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
    leadsCol.countDocuments(leadsFilter),
    leadsCol.countDocuments({ ...leadsFilter, status: 'Active' }),
    leadsCol.countDocuments({ ...leadsFilter, status: 'Replied' }),
    campaignsCol.countDocuments(),
    campaignsCol.countDocuments({ is_active: true }),
    tasksCol.countDocuments(tasksFilter),
    tasksCol.countDocuments({ ...tasksFilter, isCompleted: false }),
    sendersCol.countDocuments(),
    eventsCol.countDocuments({ ...eventsFilter, type: 'open' }),
    eventsCol.countDocuments({ ...eventsFilter, type: 'click' })
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

// ---------------------------------------------------------------------------
// SHARED LEAD REPLY PROCESSING (Reused by Webhooks, Polling & Manual checks)
// ---------------------------------------------------------------------------

export function cleanLeadNotes(existingNotes: string | undefined): string {
  if (!existingNotes || !existingNotes.trim()) return '';
  const parts = existingNotes.split('|').map(p => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const part of parts) {
    // Drop repetitive dummy tags
    if (/Reply detected on \d{4}-\d{2}-\d{2}: Incoming reply flag detected/i.test(part)) {
      continue;
    }
    const normalized = part.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    cleaned.push(part);
  }

  // If there's a specific sentiment tag (e.g. "[Negative reply detected..." or "[Positive reply detected..."),
  // remove any generic "Reply detected" or "[Reply detected]" tags that precede it.
  const hasSpecificSentiment = cleaned.some(p => /\[(?:Negative|Positive|Neutral) reply detected/i.test(p));
  const finalParts = hasSpecificSentiment
    ? cleaned.filter(p => p !== 'Reply detected' && p !== '[Reply detected]')
    : cleaned;

  return finalParts.join(' | ');
}

export function appendLeadNote(existingNotes: string | undefined, newTag: string): string {
  const cleaned = cleanLeadNotes(existingNotes);
  if (!cleaned) return newTag;
  if (!newTag || !newTag.trim()) return cleaned;

  // If the note already contains the tag or its core classifier (e.g. [Negative reply detected), don't append duplicate
  const tagBase = newTag.replace(/\s+by\s+(auto|manual).*/i, '').trim();
  if (cleaned.toLowerCase().includes(tagBase.toLowerCase()) || cleaned.toLowerCase().includes(newTag.toLowerCase())) {
    return cleaned;
  }

  return `${cleaned} | ${newTag}`;
}

export interface ApplyReplyParams {
  leadEmail?: string;
  threadId?: string;
  messageId?: string;
  subject?: string;
  body?: string;
  from?: string;
  receivedDateTime?: string;
  source?: string;
  classifiedBy?: 'auto' | 'manual';
}

export interface ApplyReplyResult {
  success: boolean;
  applied: boolean;
  lead?: BackendLead;
  reply?: any;
  message?: string;
  classification?: ReplyClassificationResult;
  pausedCompanyLeadsCount?: number;
  pendingConfirmation?: {
    candidateLeadIds: string[];
    companyName?: string;
    count: number;
  };
}

/**
 * Shared central reply-apply function used across:
 * 1. Microsoft Graph Webhook path (processGraphWebhookNotification)
 * 2. POST /api/email/check-reply endpoint
 * 3. Workflow Campaign Runner reply check (server/runnerBackend.ts)
 * 4. src/services/replyService.ts (checkLeadForReplyAndSave)
 */
export async function applyLeadReply(params: ApplyReplyParams): Promise<ApplyReplyResult> {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const cleanEmail = (params.leadEmail || params.from || '').trim().toLowerCase();
  const cleanThreadId = (params.threadId || '').trim();

  // Find lead by threadId or email
  let matchedLead: BackendLead | null = null;
  if (cleanThreadId && !cleanThreadId.startsWith('graph-conv-')) {
    matchedLead = await leadsCol.findOne({ threadId: cleanThreadId }, { projection: { _id: 0 } });
  }
  if (!matchedLead && cleanEmail) {
    matchedLead = await leadsCol.findOne(
      { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { projection: { _id: 0 } }
    );
  }

  const isDummySystemBody = !params.body ||
    params.body.includes('Incoming reply flag detected on lead record') ||
    params.body.includes('Status already marked Replied') ||
    params.body.includes('Status marked Negative Reply');

  const repliesCol = db.collection(COLLECTIONS.INBOUND_REPLIES);
  let existingReply: any = null;

  if (params.messageId) {
    existingReply = await repliesCol.findOne({ id: params.messageId });
  }

  // Deduplication check: verify if an inbound reply with matching body already exists for this lead/thread
  if (!existingReply && cleanEmail && params.body && !isDummySystemBody) {
    const normalizedBody = params.body.trim().replace(/\s+/g, ' ').toLowerCase();
    const candidateQuery: any = {
      $or: [
        { leadEmail: cleanEmail },
        ...(cleanThreadId ? [{ threadId: cleanThreadId }] : [])
      ]
    };
    const candidateReplies = await repliesCol.find(candidateQuery).toArray();
    existingReply = candidateReplies.find((r: any) => {
      const rBody = (r.body || r.snippet || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!rBody) return false;
      return rBody === normalizedBody ||
        (rBody.length > 30 && normalizedBody.length > 30 && (rBody.startsWith(normalizedBody.slice(0, 50)) || normalizedBody.startsWith(rBody.slice(0, 50))));
    });
  }

  const replyId = existingReply?.id || params.messageId || `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const receivedAt = existingReply?.receivedDateTime || params.receivedDateTime || new Date().toISOString();
  const replyDoc = existingReply || {
    id: replyId,
    leadEmail: cleanEmail || matchedLead?.email || '',
    leadId: matchedLead?.leadId,
    threadId: cleanThreadId || matchedLead?.threadId || '',
    from: params.from || cleanEmail,
    subject: params.subject || 'Re: Outreach Flow follow-up',
    body: params.body || '',
    receivedDateTime: receivedAt,
    source: params.source || 'Webhook'
  };

  if (!existingReply && !isDummySystemBody) {
    try {
      await repliesCol.updateOne(
        { id: replyId },
        { $set: replyDoc },
        { upsert: true }
      );
    } catch (err) {
      console.warn('[MongoDB] Could not persist inbound reply document:', err);
    }
  }

  if (!matchedLead) {
    return {
      success: true,
      applied: false,
      reply: replyDoc,
      message: `No lead matched email "${cleanEmail}" or thread "${cleanThreadId}". Inbound reply stored.`
    };
  }

  // 1. Rule-based classification (deterministic, 100% server-side)
  const activeKeywords = await getActiveKeywords().catch(() => undefined);
  const classification = classifyReply(params.subject, params.body, activeKeywords);
  const now = new Date().toISOString();

  const updateFields: Partial<BackendLead> = {
    hasReplied: true,
    hasUnreadReply: true,
    lastReplyReceivedDate: receivedAt,
    replySentiment: classification.sentiment,
    replyClassifiedBy: params.classifiedBy || 'auto',
    replyClassifiedAt: now,
    replyMatchedPhrases: classification.matchedPhrases,
    replyReason: classification.reason,
    updatedAt: now
  };

  let pausedCompanyLeadsCount = 0;
  let pendingConfirmation: any = undefined;

  // 2. Action based on classified sentiment
  if (classification.sentiment === 'negative') {
    // Negative reply: stop ONLY that lead, do NOT affect anyone else at the company
    updateFields.status = 'Negative Reply';
    updateFields.stoppedReason = 'Negative reply received';
    updateFields.stoppedByLeadId = undefined;
    const noteTag = `[Negative reply detected (${classification.matchedPhrases.join(', ') || 'disinterest'}) by ${params.classifiedBy || 'auto'}: Sequence stopped]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);

  } else if (classification.sentiment === 'positive') {
    // Positive reply: stop this lead (Replied)
    updateFields.status = 'Replied';
    const noteTag = `[Positive reply detected (${classification.matchedPhrases.join(', ') || 'interest'}) by ${params.classifiedBy || 'auto'}]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);

    // Stop the rest of the same company (across all campaigns)
    const settings = await loadLocalSettings().catch(() => null);
    const positiveAction = settings?.positiveReplyAction || 'pause_automatically';

    // Find other leads that are currently Active across all campaigns
    // NEVER touch leads already Replied, Negative Reply, Completed, or Broke Up.
    const otherActiveLeads = await leadsCol.find(
      {
        leadId: { $ne: matchedLead.leadId },
        status: 'Active'
      },
      { projection: { _id: 0 } }
    ).toArray();

    const sameCompanyLeads = otherActiveLeads.filter(other => areSameCompany(matchedLead, other));

    if (positiveAction === 'ask_first') {
      if (sameCompanyLeads.length > 0) {
        pendingConfirmation = {
          candidateLeadIds: sameCompanyLeads.map(l => l.leadId),
          companyName: matchedLead.company,
          count: sameCompanyLeads.length
        };
        updateFields.pendingCompanyPause = pendingConfirmation;
      }
    } else {
      // Automatic pause: pause active colleagues at same company
      for (const other of sameCompanyLeads) {
        const stopReason = `Positive reply from ${matchedLead.name} at the same company`;
        await leadsCol.updateOne(
          { leadId: other.leadId },
          {
            $set: {
              status: 'Paused',
              stoppedReason: stopReason,
              stoppedByLeadId: matchedLead.leadId,
              notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
              updatedAt: now
            }
          }
        );
        pausedCompanyLeadsCount++;
      }
    }

  } else {
    // Neutral reply: behaves exactly as today (Replied, manual follow-up)
    updateFields.status = 'Replied';
    const autoTag = classification.isAutoReply ? ' (auto-reply)' : '';
    const noteTag = `[Neutral reply detected${autoTag} by ${params.classifiedBy || 'auto'}: Manual follow-up needed]`;
    updateFields.notes = appendLeadNote(matchedLead.notes, noteTag);
  }

  await leadsCol.updateOne({ leadId: matchedLead.leadId }, { $set: updateFields });
  const updatedLeadDoc = await leadsCol.findOne({ leadId: matchedLead.leadId }, { projection: { _id: 0 } });

  return {
    success: true,
    applied: true,
    lead: updatedLeadDoc || { ...matchedLead, ...updateFields },
    reply: replyDoc,
    classification,
    pausedCompanyLeadsCount,
    pendingConfirmation
  };
}

/**
 * Manual override for lead reply sentiment (Mark Positive / Negative / Neutral).
 * Runs the exact same side effects and reverses previous decisions (Undo).
 */
export async function manualOverrideSentiment(
  leadId: string,
  newSentiment: 'positive' | 'negative' | 'neutral',
  reason?: string
): Promise<{ success: boolean; lead?: BackendLead; pausedCount: number; resumedCount: number }> {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const lead = await leadsCol.findOne({ leadId }, { projection: { _id: 0 } });
  if (!lead) {
    return { success: false, pausedCount: 0, resumedCount: 0 };
  }

  let resumedCount = 0;
  let pausedCount = 0;
  const now = new Date().toISOString();

  // 1. UNDO PREVIOUS DECISION
  // If previously positive, resume company leads that were paused by this lead
  if (lead.replySentiment === 'positive') {
    const leadsToResume = await leadsCol.find(
      { stoppedByLeadId: leadId, status: 'Paused' },
      { projection: { _id: 0 } }
    ).toArray();

    for (const pausedLead of leadsToResume) {
      await leadsCol.updateOne(
        { leadId: pausedLead.leadId },
        {
          $set: {
            status: 'Active',
            notes: appendLeadNote(pausedLead.notes, `[Resumed: Positive reply from ${lead.name} overridden]`),
            updatedAt: now
          },
          $unset: {
            stoppedReason: "",
            stoppedByLeadId: ""
          }
        }
      );
      resumedCount++;
    }
  }

  // 2. APPLY NEW SENTIMENT
  const overrideReason = reason || `Manual override to ${newSentiment}`;
  const noteTag = `[Sentiment manually updated to ${newSentiment} by user: ${overrideReason}]`;

  const updateFields: Partial<BackendLead> = {
    replySentiment: newSentiment,
    replyClassifiedBy: 'manual',
    replyClassifiedAt: now,
    replyReason: overrideReason,
    notes: appendLeadNote(lead.notes, noteTag),
    updatedAt: now
  };

  if (newSentiment === 'positive') {
    updateFields.status = 'Replied';
    updateFields.stoppedReason = undefined;

    // Pause other active leads at the same company
    const otherActiveLeads = await leadsCol.find(
      {
        leadId: { $ne: leadId },
        status: 'Active'
      },
      { projection: { _id: 0 } }
    ).toArray();

    const sameCompanyLeads = otherActiveLeads.filter(other => areSameCompany(lead, other));
    for (const other of sameCompanyLeads) {
      const stopReason = `Positive reply from ${lead.name} at the same company`;
      await leadsCol.updateOne(
        { leadId: other.leadId },
        {
          $set: {
            status: 'Paused',
            stoppedReason: stopReason,
            stoppedByLeadId: lead.leadId,
            notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
            updatedAt: now
          }
        }
      );
      pausedCount++;
    }

  } else if (newSentiment === 'negative') {
    updateFields.status = 'Negative Reply';
    updateFields.stoppedReason = 'Negative reply (manual override)';
    updateFields.stoppedByLeadId = undefined;

  } else {
    // Neutral
    updateFields.status = 'Replied';
    updateFields.stoppedReason = undefined;
  }

  await leadsCol.updateOne({ leadId }, { $set: updateFields });
  const updatedLead = await leadsCol.findOne({ leadId }, { projection: { _id: 0 } });

  return {
    success: true,
    lead: updatedLead || undefined,
    pausedCount,
    resumedCount
  };
}

/**
 * Resumes company leads paused by a specific replying lead.
 */
export async function resumeCompanyLeads(replyingLeadId: string): Promise<{ success: boolean; resumedCount: number }> {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const leadsToResume = await leadsCol.find(
    { stoppedByLeadId: replyingLeadId, status: 'Paused' },
    { projection: { _id: 0 } }
  ).toArray();

  let resumedCount = 0;
  const now = new Date().toISOString();

  for (const lead of leadsToResume) {
    await leadsCol.updateOne(
      { leadId: lead.leadId },
      {
        $set: {
          status: 'Active',
          notes: appendLeadNote(lead.notes, `[Resumed company outreach by user from lead ${replyingLeadId}]`),
          updatedAt: now
        },
        $unset: {
          stoppedReason: "",
          stoppedByLeadId: ""
        }
      }
    );
    resumedCount++;
  }

  const replyingLead = await leadsCol.findOne({ leadId: replyingLeadId }, { projection: { _id: 0 } });
  if (replyingLead && replyingLead.status === 'Paused') {
    await leadsCol.updateOne(
      { leadId: replyingLeadId },
      {
        $set: {
          status: 'Active',
          notes: appendLeadNote(replyingLead.notes, `[Resumed company outreach]`),
          updatedAt: now
        },
        $unset: {
          stoppedReason: "",
          stoppedByLeadId: ""
        }
      }
    );
    resumedCount++;
  }

  return {
    success: true,
    resumedCount
  };
}

/**
 * Confirms company pause for "Ask me first" mode.
 */
export async function confirmCompanyPause(replyingLeadId: string): Promise<{ success: boolean; pausedCount: number }> {
  const db = await getDb();
  const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);

  const replyingLead = await leadsCol.findOne({ leadId: replyingLeadId }, { projection: { _id: 0 } });
  if (!replyingLead) {
    return { success: false, pausedCount: 0 };
  }

  const otherActiveLeads = await leadsCol.find(
    {
      leadId: { $ne: replyingLeadId },
      status: 'Active'
    },
    { projection: { _id: 0 } }
  ).toArray();

  const sameCompanyLeads = otherActiveLeads.filter(other => areSameCompany(replyingLead, other));
  let pausedCount = 0;
  const now = new Date().toISOString();

  for (const other of sameCompanyLeads) {
    const stopReason = `Positive reply from ${replyingLead.name} at the same company`;
    await leadsCol.updateOne(
      { leadId: other.leadId },
      {
        $set: {
          status: 'Paused',
          stoppedReason: stopReason,
          stoppedByLeadId: replyingLead.leadId,
          notes: appendLeadNote(other.notes, `[Paused: ${stopReason}]`),
          updatedAt: now
        }
      }
    );
    pausedCount++;
  }

  // If replyingLead was also active, pause it as well
  if (replyingLead.status === 'Active') {
    await leadsCol.updateOne(
      { leadId: replyingLeadId },
      {
        $set: {
          status: 'Paused',
          stoppedReason: 'Positive reply received',
          updatedAt: now
        }
      }
    );
    pausedCount++;
  }

  // Clear pendingCompanyPause on replyingLead
  await leadsCol.updateOne(
    { leadId: replyingLeadId },
    {
      $unset: { pendingCompanyPause: "" },
      $set: { updatedAt: now }
    }
  );

  return {
    success: true,
    pausedCount
  };
}


