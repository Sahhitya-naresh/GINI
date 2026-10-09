/**
 * server/templateBackend.ts
 *
 * Multi-tenant template management, version history, resolver,
 * and email composer for Outreach Flow.
 */

import { getDb, COLLECTIONS } from './mongodb.ts';
import { DEFAULT_STAGE_TEMPLATES, renderEmailMergeTags } from '../src/data/defaultTemplates.ts';
import { loadLocalSettings } from './mongoBackend.ts';
import { getPublicBaseUrl } from './urlHelper.ts';

export type TemplateSetKind = 'default' | 'user' | 'campaign';

export interface TemplateStageItem {
  stage: number;
  name: string;
  purpose: string;
  defaultGapDays: number;
  subject: string;
  bodyHtml: string;
}

export interface TemplateSetHistoryEntry {
  version: number;
  stages: TemplateStageItem[];
  editedBy: string;
  editedAt: string;
  changeNote?: string;
}

export interface TemplateSet {
  id: string;
  kind: TemplateSetKind;
  ownerId?: string;
  campaignId?: string;
  name: string;
  stages: TemplateStageItem[];
  version: number;
  history: TemplateSetHistoryEntry[];
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

export const DEFAULT_SET_ID = 'tplset-default';

export function cloneDefaultStages(): TemplateStageItem[] {
  return DEFAULT_STAGE_TEMPLATES.map(t => ({
    stage: t.stage,
    name: t.name,
    purpose: t.purpose,
    defaultGapDays: t.defaultGapDays,
    subject: t.subject,
    bodyHtml: t.bodyHtml
  }));
}

/**
 * Ensures the templateSets collection has indexes and seeds:
 * 1. Admin Default templateSet
 * 2. Clones personal sets for existing users without one
 * 3. Clones campaign sets for existing campaigns without one
 */
export async function ensureTemplateSetsAndSeed(): Promise<void> {
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);

  // 1. Ensure indexes
  await Promise.all([
    col.createIndex({ id: 1 }, { unique: true, name: 'idx_templatesets_id_unique' }).catch(() => {}),
    col.createIndex({ kind: 1, ownerId: 1 }, { name: 'idx_templatesets_owner' }).catch(() => {}),
    col.createIndex({ kind: 1, campaignId: 1 }, { name: 'idx_templatesets_campaign' }).catch(() => {})
  ]);

  const now = new Date().toISOString();

  // 2. Ensure Admin Default Set
  const existingDefault = await col.findOne({ id: DEFAULT_SET_ID });
  if (!existingDefault) {
    const defaultSet: TemplateSet = {
      id: DEFAULT_SET_ID,
      kind: 'default',
      name: 'Admin Default Sequence',
      stages: cloneDefaultStages(),
      version: 1,
      history: [],
      updatedBy: 'System',
      updatedAt: now,
      createdAt: now
    };
    await col.insertOne(defaultSet as any);
    console.log('[TemplateSets] Initialized Admin Default templateSet');
  }

  // 3. Backfill existing users with their own personal set (one-time clone)
  const usersCol = db.collection(COLLECTIONS.USERS);
  const allUsers = await usersCol.find({}).toArray();
  for (const user of allUsers) {
    const existingUserSet = await col.findOne({ kind: 'user', ownerId: user.id });
    if (!existingUserSet) {
      const userSet: TemplateSet = {
        id: `tplset-user-${user.id}`,
        kind: 'user',
        ownerId: user.id,
        name: `${user.name || user.email}'s Personal Sequence`,
        stages: cloneDefaultStages(),
        version: 1,
        history: [],
        updatedBy: 'System',
        updatedAt: now,
        createdAt: now
      };
      await col.insertOne(userSet as any);
      console.log(`[TemplateSets] Backfilled personal templateSet for user ${user.email} (${user.id})`);
    }
  }

  // 4. Backfill existing campaigns with their own set (one-time clone)
  const campCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const allCampaigns = await campCol.find({}).toArray();
  for (const camp of allCampaigns) {
    const existingCampSet = await col.findOne({ kind: 'campaign', campaignId: camp.id });
    if (!existingCampSet) {
      const campSet: TemplateSet = {
        id: `tplset-camp-${camp.id}`,
        kind: 'campaign',
        campaignId: camp.id,
        name: `${camp.name || 'Campaign'} Sequence`,
        stages: cloneDefaultStages(),
        version: 1,
        history: [],
        updatedBy: camp.lastEditedBy || camp.ownerName || 'System',
        updatedAt: now,
        createdAt: now
      };
      await col.insertOne(campSet as any);
      console.log(`[TemplateSets] Backfilled campaign templateSet for campaign ${camp.name} (${camp.id})`);
    }
  }
}

/**
 * Gets the Admin Default template set
 */
export async function getDefaultTemplateSet(): Promise<TemplateSet> {
  const db = await getDb();
  let defaultSet = await db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS).findOne({ id: DEFAULT_SET_ID }, { projection: { _id: 0 } });
  if (!defaultSet) {
    await ensureTemplateSetsAndSeed();
    defaultSet = await db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS).findOne({ id: DEFAULT_SET_ID }, { projection: { _id: 0 } });
  }
  return defaultSet!;
}

/**
 * Gets or creates the personal template set for a user
 */
export async function getUserTemplateSet(userId: string): Promise<TemplateSet> {
  const db = await getDb();
  const col = db.collection<any>(COLLECTIONS.TEMPLATE_SETS);
  let userSet = await col.findOne({ kind: 'user', ownerId: userId }, { projection: { _id: 0 } });
  if (!userSet) {
    // Create cloned from default
    const defaultSet = await getDefaultTemplateSet();
    const now = new Date().toISOString();
    userSet = {
      id: `tplset-user-${userId}`,
      kind: 'user',
      ownerId: userId,
      name: `User Personal Sequence`,
      stages: defaultSet.stages.map(s => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: 'System',
      updatedAt: now,
      createdAt: now
    };
    await col.updateOne({ id: userSet.id }, { $set: userSet }, { upsert: true });
  }
  return userSet as TemplateSet;
}

/**
 * Gets or creates the campaign template set for a campaign
 */
export async function getCampaignTemplateSet(campaignId: string, campaignName?: string): Promise<TemplateSet> {
  const db = await getDb();
  const col = db.collection<any>(COLLECTIONS.TEMPLATE_SETS);
  let campSet = await col.findOne({ kind: 'campaign', campaignId }, { projection: { _id: 0 } });
  if (!campSet) {
    const defaultSet = await getDefaultTemplateSet();
    const now = new Date().toISOString();
    campSet = {
      id: `tplset-camp-${campaignId}`,
      kind: 'campaign',
      campaignId,
      name: `${campaignName || 'Campaign'} Sequence`,
      stages: defaultSet.stages.map(s => ({ ...s })),
      version: 1,
      history: [],
      updatedBy: 'System',
      updatedAt: now,
      createdAt: now
    };
    await col.updateOne({ id: campSet.id }, { $set: campSet }, { upsert: true });
  }
  return campSet as TemplateSet;
}

/**
 * Gets a template set by its ID
 */
export async function getTemplateSetById(id: string): Promise<TemplateSet | null> {
  const db = await getDb();
  return db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS).findOne({ id }, { projection: { _id: 0 } });
}

/**
 * Saves changes to a template set with versioning (last 10 history entries)
 */
export async function saveTemplateSet(
  setId: string,
  updatedStages: TemplateStageItem[],
  requestingUser: { id: string; name?: string; role?: string; permissions?: string[] }
): Promise<TemplateSet> {
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);

  const existing = await col.findOne({ id: setId });
  if (!existing) {
    const err: any = new Error('Template set not found');
    err.status = 404;
    throw err;
  }

  // Permission checks
  const isAdmin = requestingUser.role === 'admin';
  const hasPerm = (p: string) => isAdmin || Boolean(requestingUser.permissions?.includes(p));

  if (existing.kind === 'default') {
    if (!hasPerm('templates.editDefault') && !isAdmin) {
      const err: any = new Error('Forbidden: Only administrators can edit the default template set');
      err.status = 403;
      throw err;
    }
  } else if (existing.kind === 'user') {
    const isOwner = existing.ownerId === requestingUser.id;
    if (isOwner) {
      if (!hasPerm('templates.editOwn') && !isAdmin) {
        const err: any = new Error('Forbidden: Missing permission to edit your personal templates');
        err.status = 403;
        throw err;
      }
    } else {
      if (!hasPerm('templates.editAny') && !isAdmin) {
        const err: any = new Error('Forbidden: Missing permission to edit other users templates');
        err.status = 403;
        throw err;
      }
    }
  } else if (existing.kind === 'campaign') {
    // Check if requesting user owns the campaign or is admin
    const camp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ id: existing.campaignId });
    const isCampOwner = camp?.ownerId === requestingUser.id;
    if (!isCampOwner && !hasPerm('campaigns.editAny') && !isAdmin) {
      const err: any = new Error('Forbidden: Only the campaign owner or an admin can edit the campaign templates');
      err.status = 403;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];

  // Snapshot previous version
  const snapshot: TemplateSetHistoryEntry = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || 'System',
    editedAt: existing.updatedAt || now
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;

  // Ensure stages array has all 7 stages properly formed
  const completeStages: TemplateStageItem[] = [];
  for (let s = 1; s <= 7; s++) {
    const incoming = updatedStages.find(st => st.stage === s);
    const prev = existing.stages.find(st => st.stage === s) || DEFAULT_STAGE_TEMPLATES.find(st => st.stage === s)!;
    completeStages.push({
      stage: s,
      name: incoming?.name || prev.name,
      purpose: incoming?.purpose || prev.purpose,
      defaultGapDays: incoming?.defaultGapDays ?? prev.defaultGapDays ?? 3,
      subject: incoming?.subject !== undefined ? incoming.subject : prev.subject,
      bodyHtml: incoming?.bodyHtml !== undefined ? incoming.bodyHtml : prev.bodyHtml
    });
  }

  const updatedDoc: TemplateSet = {
    ...existing,
    stages: completeStages,
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || 'User',
    updatedAt: now
  };

  await col.updateOne({ id: setId }, { $set: updatedDoc });
  return updatedDoc;
}

/**
 * Restores a template set to a previous history version
 */
export async function restoreTemplateSetVersion(
  setId: string,
  targetVersion: number,
  requestingUser: { id: string; name?: string; role?: string; permissions?: string[] }
): Promise<TemplateSet> {
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);

  const existing = await col.findOne({ id: setId });
  if (!existing) {
    const err: any = new Error('Template set not found');
    err.status = 404;
    throw err;
  }

  // Permission check
  const isAdmin = requestingUser.role === 'admin';
  const hasPerm = (p: string) => isAdmin || Boolean(requestingUser.permissions?.includes(p));

  if (existing.kind === 'default' && !hasPerm('templates.editDefault') && !isAdmin) {
    const err: any = new Error('Forbidden'); err.status = 403; throw err;
  }
  if (existing.kind === 'user' && existing.ownerId !== requestingUser.id && !hasPerm('templates.editAny') && !isAdmin) {
    const err: any = new Error('Forbidden'); err.status = 403; throw err;
  }

  const targetSnapshot = existing.history?.find(h => h.version === targetVersion);
  if (!targetSnapshot) {
    const err: any = new Error(`Version ${targetVersion} not found in template set history`);
    err.status = 404;
    throw err;
  }

  const now = new Date().toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];

  const snapshot: TemplateSetHistoryEntry = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || 'System',
    editedAt: existing.updatedAt || now,
    changeNote: `Restored from version ${targetVersion}`
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;

  const restoredDoc: TemplateSet = {
    ...existing,
    stages: targetSnapshot.stages,
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || 'User',
    updatedAt: now
  };

  await col.updateOne({ id: setId }, { $set: restoredDoc });
  return restoredDoc;
}

/**
 * Resets a user's personal template set to the current admin default set
 */
export async function resetUserTemplateSetToDefault(
  userId: string,
  requestingUser: { id: string; name?: string; role?: string; permissions?: string[] }
): Promise<TemplateSet> {
  const isAdmin = requestingUser.role === 'admin';
  const isOwner = requestingUser.id === userId;
  if (!isOwner && !isAdmin) {
    const err: any = new Error('Forbidden: You can only reset your own template set');
    err.status = 403;
    throw err;
  }

  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);
  const existing = await getUserTemplateSet(userId);

  const now = new Date().toISOString();
  const currentVersion = existing.version || 1;
  const history = existing.history || [];

  const snapshot: TemplateSetHistoryEntry = {
    version: currentVersion,
    stages: existing.stages,
    editedBy: existing.updatedBy || 'System',
    editedAt: existing.updatedAt || now,
    changeNote: 'Reset to Admin Default'
  };
  const updatedHistory = [snapshot, ...history].slice(0, 10);
  const nextVersion = currentVersion + 1;

  const resetDoc: TemplateSet = {
    ...existing,
    stages: defaultSet.stages.map(s => ({ ...s })),
    version: nextVersion,
    history: updatedHistory,
    updatedBy: requestingUser.name || requestingUser.id || 'User',
    updatedAt: now
  };

  await col.updateOne({ id: existing.id }, { $set: resetDoc });
  return resetDoc;
}

/**
 * Creates personal template set for a newly created user (cloned from current default)
 */
export async function createTemplateSetForNewUser(userId: string, userName?: string): Promise<TemplateSet> {
  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);

  const now = new Date().toISOString();
  const userSet: TemplateSet = {
    id: `tplset-user-${userId}`,
    kind: 'user',
    ownerId: userId,
    name: `${userName || 'User'}'s Personal Sequence`,
    stages: defaultSet.stages.map(s => ({ ...s })),
    version: 1,
    history: [],
    updatedBy: 'System',
    updatedAt: now,
    createdAt: now
  };

  await col.updateOne({ id: userSet.id }, { $set: userSet }, { upsert: true });
  return userSet;
}

/**
 * Creates campaign template set for a newly created campaign (cloned from current default)
 */
export async function createTemplateSetForNewCampaign(
  campaignId: string,
  campaignName?: string,
  requestingUser?: { id: string; name?: string }
): Promise<TemplateSet> {
  const defaultSet = await getDefaultTemplateSet();
  const db = await getDb();
  const col = db.collection<TemplateSet>(COLLECTIONS.TEMPLATE_SETS);

  const now = new Date().toISOString();
  const campSet: TemplateSet = {
    id: `tplset-camp-${campaignId}`,
    kind: 'campaign',
    campaignId,
    name: `${campaignName || 'Campaign'} Sequence`,
    stages: defaultSet.stages.map(s => ({ ...s })),
    version: 1,
    history: [],
    updatedBy: requestingUser?.name || 'System',
    updatedAt: now,
    createdAt: now
  };

  await col.updateOne({ id: campSet.id }, { $set: campSet }, { upsert: true });
  return campSet;
}

/**
 * Deletes personal template set when a user is deleted
 */
export async function deleteUserTemplateSet(userId: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection(COLLECTIONS.TEMPLATE_SETS).deleteOne({ kind: 'user', ownerId: userId });
  return res.deletedCount > 0;
}

/**
 * Warning count calculation:
 * When a campaign template is edited:
 * Count active enrolled leads where lead.templateSource === 'campaign' (or not 'own').
 * Also count distinct users owning those leads.
 */
export async function getCampaignTemplateImpact(campaignId: string): Promise<{
  affectedLeadsCount: number;
  userCount: number;
  affectedUserNames: string[];
}> {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);

  const leads = await leadsCol.find({
    campaignId: campaignId.trim(),
    status: 'Active',
    templateSource: { $ne: 'own' }
  }).toArray();

  const userIds = new Set<string>();
  const userNames = new Set<string>();

  for (const l of leads) {
    if (l.ownerId) userIds.add(l.ownerId);
    if (l.ownerName) userNames.add(l.ownerName);
  }

  return {
    affectedLeadsCount: leads.length,
    userCount: userIds.size,
    affectedUserNames: Array.from(userNames)
  };
}

/**
 * ---------------------------------------------------------------------------
 * STEP 2: RESOLVER
 * ---------------------------------------------------------------------------
 * resolveEmailContent(lead, stageNumOrNode):
 *   a) a node using custom text uses that text (it belongs to the campaign);
 *   b) else if lead.templateSource === 'own', use the lead's CURRENT owner's personal set;
 *   c) else use the campaign's set;
 *   d) a lead with no campaign uses its owner's personal set;
 *   e) fallback to default set.
 */
export async function resolveEmailContent(
  lead: { leadId?: string; ownerId?: string; campaignId?: string; templateSource?: 'campaign' | 'own'; [key: string]: any },
  stageNumOrNode: number | any
): Promise<{
  subject: string;
  bodyHtml: string;
  templateSourceUsed: 'custom_node' | 'user' | 'campaign' | 'default';
  version?: number;
  stage: number;
}> {
  let stageNum = typeof stageNumOrNode === 'number' ? stageNumOrNode : 1;
  let customNodeSubject: string | undefined;
  let customNodeBody: string | undefined;

  if (typeof stageNumOrNode === 'object' && stageNumOrNode !== null) {
    const nodeData = stageNumOrNode.data || stageNumOrNode;
    stageNum = nodeData.templateStage || nodeData.stage || stageNum;
    const body = nodeData.customBodyHtml !== undefined ? nodeData.customBodyHtml : nodeData.customBody;
    if (nodeData.useCustomTemplate || nodeData.customSubject !== undefined || body !== undefined) {
      if (nodeData.customSubject !== undefined) customNodeSubject = String(nodeData.customSubject);
      if (body !== undefined) customNodeBody = String(body);
    }
  }

  // Case a) Node with custom text
  if (customNodeSubject !== undefined || customNodeBody !== undefined) {
    return {
      subject: customNodeSubject || '',
      bodyHtml: (customNodeBody || '').replace(/\n/g, '<br/>'),
      templateSourceUsed: 'custom_node',
      stage: stageNum
    };
  }

  // Case b) lead.templateSource === 'own'
  if (lead.templateSource === 'own' && lead.ownerId) {
    const userSet = await getUserTemplateSet(lead.ownerId);
    const stageItem = userSet.stages.find(s => s.stage === stageNum) || userSet.stages[0];
    if (stageItem) {
      return {
        subject: stageItem.subject,
        bodyHtml: stageItem.bodyHtml,
        templateSourceUsed: 'user',
        version: userSet.version,
        stage: stageNum
      };
    }
  }

  // Case c) campaign template set
  if (lead.campaignId) {
    const campSet = await getCampaignTemplateSet(lead.campaignId);
    const stageItem = campSet.stages.find(s => s.stage === stageNum) || campSet.stages[0];
    if (stageItem) {
      return {
        subject: stageItem.subject,
        bodyHtml: stageItem.bodyHtml,
        templateSourceUsed: 'campaign',
        version: campSet.version,
        stage: stageNum
      };
    }
  }

  // Case d) lead with no campaign -> uses owner's personal set
  if (lead.ownerId) {
    const userSet = await getUserTemplateSet(lead.ownerId);
    const stageItem = userSet.stages.find(s => s.stage === stageNum) || userSet.stages[0];
    if (stageItem) {
      return {
        subject: stageItem.subject,
        bodyHtml: stageItem.bodyHtml,
        templateSourceUsed: 'user',
        version: userSet.version,
        stage: stageNum
      };
    }
  }

  // Case e) Fallback to default set
  const defaultSet = await getDefaultTemplateSet();
  const stageItem = defaultSet.stages.find(s => s.stage === stageNum) || defaultSet.stages[0];
  return {
    subject: stageItem?.subject || 'Introduction',
    bodyHtml: stageItem?.bodyHtml || '',
    templateSourceUsed: 'default',
    version: defaultSet.version,
    stage: stageNum
  };
}

/**
 * ---------------------------------------------------------------------------
 * STEP 6: SHARED EMAIL COMPOSER
 * ---------------------------------------------------------------------------
 * Composes header + body + footer into one HTML document.
 * - Wraps body links ONLY with click tracking (header and footer links are NOT wrapped).
 * - Appends tracking pixel ONCE at the very end.
 * - Sanitizes header and footer.
 */

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Strip dangerous tags: <script>, <style>, <iframe>, <object>, <embed>, <applet>, on* event handlers, javascript: URIs
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"');
  return cleaned;
}

export interface ComposeEmailOptions {
  bodyHtml: string;
  headerHtml?: string;
  header?: string;
  footerHtml?: string;
  footer?: string;
  lead?: any;
  stage?: number;
  senderDisplayName?: string;
  baseUrl?: string;
  embedTrackingPixel?: boolean;
}

export interface ComposedEmailResult {
  composedHtml: string;
  renderedHeader: string;
  renderedBody: string;
  renderedFooter: string;
  isLikelyLong: boolean;
  charCount: number;
}

export function composeFullEmail(options: ComposeEmailOptions): ComposedEmailResult {
  const {
    bodyHtml,
    headerHtml,
    header,
    footerHtml,
    footer,
    lead,
    stage = 1,
    senderDisplayName,
    baseUrl,
    embedTrackingPixel = false
  } = options;

  const effectiveHeader = headerHtml !== undefined ? headerHtml : (header || '');
  const effectiveFooter = footerHtml !== undefined ? footerHtml : (footer || '');
  const effectiveSenderName = senderDisplayName || 'Outreach Flow';

  // 1. Render merge tags on header, body, footer independently
  const sanitizedHeader = sanitizeHtml(effectiveHeader);
  const sanitizedFooter = sanitizeHtml(effectiveFooter);

  const renderedHeader = sanitizedHeader ? renderEmailMergeTags(sanitizedHeader, lead || {}, effectiveSenderName) : '';
  const renderedBody = renderEmailMergeTags(bodyHtml, lead || {}, effectiveSenderName);
  const renderedFooter = sanitizedFooter ? renderEmailMergeTags(sanitizedFooter, lead || {}, effectiveSenderName) : '';

  // 2. Wrap body links ONLY with click tracking (leave header and footer links untouched)
  let trackedBody = renderedBody;
  if (lead && baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const campaignParam = encodeURIComponent(lead.campaign || 'Default');
    const leadIdParam = encodeURIComponent(lead.leadId || '');
    const leadEmailParam = encodeURIComponent(lead.email || '');

    trackedBody = renderedBody.replace(
      /<a\s+([^>]*?)href\s*=\s*(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
      (_match, pre, quote, originalUrl, post) => {
        if (originalUrl.includes('/api/track/click')) return _match;
        const clickTrackUrl = `${cleanBase}/api/track/click?url=${encodeURIComponent(originalUrl)}&leadId=${leadIdParam}&email=${leadEmailParam}&stage=${stage}&campaign=${campaignParam}`;
        return `<a ${pre}href=${quote}${clickTrackUrl}${quote}${post}>`;
      }
    );
  }

  // 3. Assemble complete HTML: header + body + footer
  const sections: string[] = [];
  if (renderedHeader.trim()) {
    sections.push(`<div class="email-header" style="margin-bottom: 20px;">${renderedHeader}</div>`);
  }
  sections.push(`<div class="email-body">${trackedBody}</div>`);
  if (renderedFooter.trim()) {
    sections.push(`<div class="email-footer" style="margin-top: 28px;">${renderedFooter}</div>`);
  }

  let composedHtml = sections.join('\n');

  // 4. Append tracking pixel ONCE at the very end if requested
  if (embedTrackingPixel && lead && baseUrl) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const campaignParam = encodeURIComponent(lead.campaign || 'Default');
    const leadIdParam = encodeURIComponent(lead.leadId || '');
    const leadEmailParam = encodeURIComponent(lead.email || '');
    const openTrackUrl = `${cleanBase}/api/track/open?leadId=${leadIdParam}&email=${leadEmailParam}&stage=${stage}&campaign=${campaignParam}&t=${Date.now()}`;
    const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;

    if (composedHtml.includes('</body>')) {
      composedHtml = composedHtml.replace('</body>', `${pixelTag}</body>`);
    } else {
      composedHtml += `\n${pixelTag}`;
    }
  }

  // Length estimation:
  // Strip tags to get approximate text length. Typical single desktop/mobile email screen fits ~1500 characters or ~400 words.
  const plainText = composedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const charCount = plainText.length;
  const isLikelyLong = charCount > 1500;

  return {
    composedHtml,
    renderedHeader,
    renderedBody,
    renderedFooter,
    isLikelyLong,
    charCount
  };
}
