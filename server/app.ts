import express from 'express';
import { MongoClient } from 'mongodb';
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  batchCreateLeads,
  listCampaigns,
  saveCampaign,
  deleteCampaign,
  toggleCampaignActive,
  loadLocalSettings,
  saveLocalSettings,
  loadLocalSenders,
  saveLocalSenders,
  loadLocalTasks,
  saveLocalTasks,
  updateLocalTask,
  deleteLocalTask,
  loadTrackingEvents,
  recordTrackingEvent,
  clearAllTrackingEvents,
  getSystemStatsSummary,
  applyLeadReply,
  TrackingEvent,
  BackendLead
} from './mongoBackend.ts';
import { getMongoStatus, getDb, autoSeedFromLocalData, updateMongoUri, COLLECTIONS } from './mongodb.ts';
import { parseFileBuffer } from './importBackend.ts';
import { runDueCampaignsJob } from './runnerBackend.ts';
import {
  sendAppEmail,
  checkAppThreadForReply,
  getAppConversationThread,
  getServiceAccountProfile,
  sendDirectTestEmail,
  getWebhookClientState,
  verifyWebhookClientState,
  createGraphWebhookSubscription,
  renewExpiringGraphSubscriptions,
  processGraphWebhookNotification
} from './msGraphService.ts';
import { getAuthDiagnostics } from './msGraphAuth.ts';
import { getPublicBaseUrl } from './urlHelper.ts';

export const app = express();

app.set('trust proxy', true);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1x1 transparent GIF binary for tracking pixel
const TRANSPARENT_GIF_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Helper to compute stats by lead
function computeStatsByLead(evts: TrackingEvent[]) {
  const stats: Record<string, {
    opensCount: number;
    firstOpenedDate?: string;
    lastOpenedDate?: string;
    clicksCount: number;
    firstClickedDate?: string;
    lastClickedDate?: string;
    events: TrackingEvent[];
  }> = {};

  for (const ev of evts) {
    if (!ev.leadId && !ev.email) continue;
    const primaryKey = ev.leadId || ev.email || '';
    if (!stats[primaryKey]) {
      stats[primaryKey] = {
        opensCount: 0,
        clicksCount: 0,
        events: []
      };
    }
    const item = stats[primaryKey];
    item.events.push(ev);

    if (ev.type === 'open') {
      item.opensCount++;
      if (!item.firstOpenedDate || new Date(ev.timestamp) < new Date(item.firstOpenedDate)) {
        item.firstOpenedDate = ev.timestamp;
      }
      if (!item.lastOpenedDate || new Date(ev.timestamp) > new Date(item.lastOpenedDate)) {
        item.lastOpenedDate = ev.timestamp;
      }
    } else if (ev.type === 'click') {
      item.clicksCount++;
      if (!item.firstClickedDate || new Date(ev.timestamp) < new Date(item.firstClickedDate)) {
        item.firstClickedDate = ev.timestamp;
      }
      if (!item.lastClickedDate || new Date(ev.timestamp) > new Date(item.lastClickedDate)) {
        item.lastClickedDate = ev.timestamp;
      }
    }

    if (ev.email && ev.email.toLowerCase() !== primaryKey.toLowerCase()) {
      stats[ev.email.toLowerCase()] = item;
    }
    if (ev.leadId && ev.leadId !== primaryKey) {
      stats[ev.leadId] = item;
    }
  }

  return stats;
}

// Helper to extract auth header token and spreadsheet id (kept for backward compatibility)
const getAuth = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const spreadsheetId = (req.headers['x-spreadsheet-id'] || req.body?.spreadsheetId || req.query?.spreadsheetId) as string | undefined;
  return { token, spreadsheetId };
};

// --- Health & MongoDB Status Endpoints ---

app.get('/api/health', async (_req, res) => {
  const mongo = await getMongoStatus();
  res.json({
    status: 'ok',
    database: 'mongodb',
    connected: mongo.connected,
    mongo
  });
});

app.get('/api/mongodb/status', async (_req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get('/api/mongodb/test-atlas', async (req, res) => {
  const customUri = (req.query.uri as string) || '';
  const variations: { name: string; uri: string }[] = customUri ? [{ name: 'custom', uri: customUri }] : [
    {
      name: 'Original with appName',
      uri: 'mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?appName=Cluster0'
    },
    {
      name: 'With dbName in path (outreach_flow)',
      uri: 'mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/outreach_flow?retryWrites=true&w=majority&appName=Cluster0'
    },
    {
      name: 'With authSource=admin',
      uri: 'mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&appName=Cluster0'
    },
    {
      name: 'With authMechanism=SCRAM-SHA-1',
      uri: 'mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-1'
    },
    {
      name: 'With authMechanism=SCRAM-SHA-256',
      uri: 'mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-256'
    }
  ];

  const results: any[] = [];
  for (const item of variations) {
    const testClient = new MongoClient(item.uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    try {
      await testClient.connect();
      const ping = await testClient.db('admin').command({ ping: 1 });
      results.push({
        name: item.name,
        success: true,
        ping
      });
      await testClient.close();
      break; // Successfully connected!
    } catch (e: any) {
      results.push({
        name: item.name,
        success: false,
        error: e.message,
        code: e.code,
        codeName: e.codeName
      });
      try { await testClient.close(); } catch {}
    }
  }

  res.json({ results });
});

app.post('/api/mongodb/update-uri', async (req, res) => {
  const { uri } = req.body || {};
  if (!uri || typeof uri !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid "uri" string is required.' });
  }
  const result = await updateMongoUri(uri);
  const status = await getMongoStatus();
  if (result.success) {
    res.json({ success: true, database: result.database, status });
  } else {
    res.status(400).json({ success: false, error: result.error, code: result.code, status });
  }
});

app.post('/api/mongodb/migrate', async (_req, res) => {
  try {
    const db = await getDb();
    const result = await autoSeedFromLocalData(db);
    const status = await getMongoStatus();
    res.json({ success: true, result, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to detect if open/click request originated from within our own app (e.g., viewing thread in app)
function isInternalAppRequest(req: express.Request): boolean {
  const referer = (req.headers['referer'] || req.headers['referrer'] || '').toString().toLowerCase();
  const origin = (req.headers['origin'] || '').toString().toLowerCase();
  const source = referer || origin;
  if (!source) return false;

  const host = (req.headers['host'] || '').toString().toLowerCase();
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toString().toLowerCase();

  if (host && (source.includes(host) || source.startsWith(`http://${host}`) || source.startsWith(`https://${host}`))) {
    return true;
  }
  if (xForwardedHost && source.includes(xForwardedHost)) {
    return true;
  }
  if (process.env.APP_URL) {
    try {
      const appUrlHost = new URL(process.env.APP_URL).host.toLowerCase();
      if (appUrlHost && source.includes(appUrlHost)) {
        return true;
      }
    } catch (_) {}
  }
  if (source.includes('localhost') || source.includes('127.0.0.1')) {
    return true;
  }

  return false;
}

// --- Open Tracking Pixel Endpoint ---

const handleOpenTracking = async (req: express.Request, res: express.Response) => {
  const leadId = (req.query.leadId || req.params.leadId || '').toString().trim();
  const email = (req.query.email || '').toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || req.params.stage || '1').toString(), 10) || 1;
  const campaign = (req.query.campaign || 'default').toString();

  // Don't record an event when the request's Referer or Origin header matches our own app
  const isInternal = isInternalAppRequest(req);

  if (!isInternal && (leadId || email)) {
    const newEvent: TrackingEvent = {
      id: `open-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'open',
      leadId: leadId || email,
      email: email || undefined,
      stage,
      campaign,
      timestamp: new Date().toISOString(),
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '',
      userAgent: req.headers['user-agent'] || ''
    };

    try {
      await recordTrackingEvent(newEvent);
    } catch (err: any) {
      console.error('Failed to record open event:', err);
    }
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_GIF_1X1.length.toString(),
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  res.end(TRANSPARENT_GIF_1X1);
};

app.get('/api/track/open', handleOpenTracking);
app.get('/api/track/open/:leadId', handleOpenTracking);
app.get('/api/track/open/:leadId/:stage', handleOpenTracking);

// --- Link Click Tracking Endpoint ---

app.get('/api/track/click', async (req, res) => {
  const targetUrl = (req.query.url || 'https://example.com').toString();
  const leadId = (req.query.leadId || '').toString().trim();
  const email = (req.query.email || '').toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || '1').toString(), 10) || 1;
  const campaign = (req.query.campaign || 'default').toString();

  // Don't record click event when triggered internally from within our app
  const isInternal = isInternalAppRequest(req);

  if (!isInternal && (leadId || email)) {
    const newEvent: TrackingEvent = {
      id: `click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'click',
      leadId: leadId || email,
      email: email || undefined,
      stage,
      campaign,
      timestamp: new Date().toISOString(),
      targetUrl,
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || '',
      userAgent: req.headers['user-agent'] || ''
    };

    try {
      await recordTrackingEvent(newEvent);
    } catch (err: any) {
      console.error('Failed to record click event:', err);
    }
  }

  res.redirect(302, targetUrl);
});

// --- Reset Tracking for a Lead Endpoint ---

app.post('/api/track/reset-lead', async (req, res) => {
  try {
    const { leadId, email } = req.body;
    if (!leadId && !email) {
      return res.status(400).json({ success: false, error: 'leadId or email is required' });
    }

    const cleanEmail = (email || '').toString().trim().toLowerCase();
    const cleanLeadId = (leadId || '').toString().trim();

    const db = await getDb();
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    const leadsCol = db.collection<BackendLead>(COLLECTIONS.LEADS);

    const filter: any[] = [];
    if (cleanLeadId) {
      filter.push({ leadId: cleanLeadId });
    }
    if (cleanEmail) {
      const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      filter.push({ email: emailRegex });
      filter.push({ leadId: emailRegex });
    }

    // Delete tracking events for this lead
    const deletedEvents = await eventsCol.deleteMany({ $or: filter });

    // Reset engagement counters on the lead document in MongoDB
    const updatedLeads = await leadsCol.updateMany(
      { $or: filter },
      {
        $set: {
          opensCount: 0,
          clicksCount: 0,
          firstOpenedDate: '',
          lastOpenedDate: '',
          firstClickedDate: '',
          lastClickedDate: '',
          updatedAt: new Date().toISOString()
        }
      }
    );

    res.json({
      success: true,
      message: 'Tracking reset successfully for lead',
      deletedEvents: deletedEvents.deletedCount,
      updatedLeads: updatedLeads.modifiedCount
    });
  } catch (err: any) {
    console.error('API /api/track/reset-lead error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Debug Tracking Endpoint ---

app.get('/api/track/debug', async (req, res) => {
  try {
    const leadId = (req.query.leadId || '').toString().trim();
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required' });
    }

    const allEvents = await loadTrackingEvents();
    const leadEvents = allEvents.filter(e =>
      e.leadId === leadId ||
      (e.email && e.email.toLowerCase() === leadId.toLowerCase())
    );

    // Sort descending by timestamp
    leadEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latest20 = leadEvents.slice(0, 20).map(e => ({
      type: e.type,
      timestamp: e.timestamp,
      userAgent: e.userAgent || ''
    }));

    res.json({
      success: true,
      leadId,
      totalEvents: leadEvents.length,
      events: latest20
    });
  } catch (err: any) {
    console.error('API /api/track/debug error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Tracking Stats Endpoint ---

app.get('/api/track/events', async (_req, res) => {
  try {
    const events = await loadTrackingEvents();
    const statsByLead = computeStatsByLead(events);
    res.json({
      success: true,
      totalOpens: events.filter(e => e.type === 'open').length,
      totalClicks: events.filter(e => e.type === 'click').length,
      events,
      statsByLead
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/track/event', async (req, res) => {
  try {
    const { type, leadId, stage, campaign, targetUrl } = req.body;
    if (!type || !leadId) {
      return res.status(400).json({ error: 'Missing type or leadId' });
    }

    const newEvent: TrackingEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: type === 'click' ? 'click' : 'open',
      leadId,
      stage: stage || 1,
      campaign: campaign || 'default',
      targetUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'manual'
    };

    const saved = await recordTrackingEvent(newEvent);
    res.json({ success: true, event: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/track/clear', async (_req, res) => {
  try {
    await clearAllTrackingEvents();
    res.json({ success: true, message: 'All tracking events cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Leads CRUD Endpoints (MongoDB Single Source of Truth) ---

app.all(['/api/leads', '/api/leads/list', '/api/leads/local'], async (_req, res) => {
  try {
    const leads = await listLeads();
    res.json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    console.error('API /api/leads/list error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/create', async (req, res) => {
  try {
    const leadData = req.body.lead;
    if (!leadData) {
      return res.status(400).json({ success: false, error: 'Missing lead object in request body' });
    }
    const created = await createLead(leadData);
    res.json({ success: true, lead: created });
  } catch (err: any) {
    console.error('API /api/leads/create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/update', async (req, res) => {
  try {
    const leadData = req.body.lead;
    if (!leadData || !leadData.leadId) {
      return res.status(400).json({ success: false, error: 'Missing lead object or leadId' });
    }
    const updated = await updateLead(leadData);
    res.json({ success: true, lead: updated });
  } catch (err: any) {
    console.error('API /api/leads/update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/mark-reply-read', async (req, res) => {
  try {
    const { leadId, email } = req.body;
    const db = await getDb();
    const filters: any[] = [];
    if (leadId) filters.push({ leadId: leadId.trim() });
    if (email) filters.push({ email: { $regex: `^${email.trim()}$`, $options: 'i' } });

    if (filters.length === 0) {
      return res.status(400).json({ success: false, error: 'leadId or email is required' });
    }

    await db.collection(COLLECTIONS.LEADS).updateMany(
      { $or: filters },
      { $set: { hasUnreadReply: false, updatedAt: new Date().toISOString() } }
    );

    res.json({ success: true, message: 'Marked reply as read' });
  } catch (err: any) {
    console.error('API /api/leads/mark-reply-read error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/batch', async (req, res) => {
  try {
    const leadsData = req.body.leads;
    if (!Array.isArray(leadsData)) {
      return res.status(400).json({ success: false, error: 'Expected leads array' });
    }
    const created = await batchCreateLeads(leadsData);
    res.json({ success: true, count: created.length, leads: created });
  } catch (err: any) {
    console.error('API /api/leads/batch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/delete', async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'Missing leadId' });
    }
    const deleted = await deleteLead(leadId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('API /api/leads/delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Campaigns CRUD & Workflow Graph Endpoints (MongoDB) ---

app.all(['/api/campaigns', '/api/campaigns/list'], async (_req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err: any) {
    console.error('API /api/campaigns error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/save', async (req, res) => {
  try {
    const campaign = req.body.campaign;
    if (!campaign || !campaign.id) {
      return res.status(400).json({ success: false, error: 'Missing campaign or campaign.id' });
    }
    const saved = await saveCampaign(campaign);
    res.json({ success: true, campaign: saved });
  } catch (err: any) {
    console.error('API /api/campaigns/save error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/delete', async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Missing campaignId' });
    }
    const deleted = await deleteCampaign(campaignId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('API /api/campaigns/delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/toggle-active', async (req, res) => {
  try {
    const { campaignId, isActive } = req.body;
    if (!campaignId || isActive === undefined) {
      return res.status(400).json({ success: false, error: 'Missing campaignId or isActive' });
    }
    const updated = await toggleCampaignActive(campaignId, Boolean(isActive));
    res.json({ success: true, campaign: updated });
  } catch (err: any) {
    console.error('API /api/campaigns/toggle-active error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Server-Side File Import Endpoint ---

app.post('/api/import/parse', async (req, res) => {
  try {
    const { filename, fileBase64, existingEmails, columnMapping } = req.body;
    if (!filename || !fileBase64) {
      return res.status(400).json({ success: false, error: 'Missing filename or fileBase64' });
    }

    const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanedBase64, 'base64');

    const result = parseFileBuffer(buffer, filename, existingEmails || [], columnMapping);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/import/parse error:', err);
    res.status(400).json({ success: false, error: err.message || 'Failed to parse file' });
  }
});

// --- Run Due Campaigns Job Endpoint (Manual Trigger) ---

app.post('/api/campaigns/run-due', async (req, res) => {
  try {
    const { token, spreadsheetId } = getAuth(req);
    const { campaignId, userEmail } = req.body;
    const result = await runDueCampaignsJob(campaignId, token, spreadsheetId, userEmail);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/campaigns/run-due error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Settings Persistence Endpoints ---

app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await saveLocalSettings(req.body.settings || req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Senders Persistence Endpoints (Stores provider per sender profile) ---

app.get('/api/senders', async (_req, res) => {
  try {
    const senders = await loadLocalSenders();
    res.json({ success: true, senders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/senders', async (req, res) => {
  try {
    const senders = await saveLocalSenders(req.body.senders || []);
    res.json({ success: true, senders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Manual Tasks Queue Endpoints ---

app.get('/api/tasks', async (_req, res) => {
  try {
    const tasks = await loadLocalTasks();
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const tasks = await saveLocalTasks(req.body.tasks || []);
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/update', async (req, res) => {
  try {
    const { taskId, updates } = req.body;
    const task = await updateLocalTask(taskId, updates);
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/delete', async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Missing taskId' });
    }
    const deleted = await deleteLocalTask(taskId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- System Overview & Stats ---

app.get('/api/system/stats', async (_req, res) => {
  try {
    const stats = await getSystemStatsSummary();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Email Dispatch & Tracking Injection Endpoint ---

app.post('/api/emails/send', async (req, res) => {
  try {
    const { to, subject, htmlBody, leadId, stage, campaign, senderEmail } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, error: 'Recipient "to" and "subject" are required' });
    }

    const baseUrl = getPublicBaseUrl(req);
    const trackingPixelHtml = `<img src="${baseUrl}/api/track/open?leadId=${encodeURIComponent(leadId || '')}&stage=${encodeURIComponent(stage || 1)}&campaign=${encodeURIComponent(campaign || 'default')}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;

    res.json({
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      to,
      subject,
      leadId,
      stage: stage || 1,
      senderEmail,
      timestamp: new Date().toISOString(),
      trackingPixelUrl: `${baseUrl}/api/track/open?leadId=${leadId}&stage=${stage}`
    });
  } catch (err: any) {
    console.error('API /api/emails/send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Microsoft Graph App-Only Service Account Endpoints ---

app.get('/api/email/service-account', async (_req, res) => {
  try {
    const profile = getServiceAccountProfile();
    const diagnostics = await getAuthDiagnostics();
    res.json({ success: true, profile, diagnostics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/email/send-stage', async (req, res) => {
  try {
    const { lead, template, stageNum, customSenderName } = req.body;
    if (!lead || !lead.email) {
      return res.status(400).json({ success: false, error: 'Lead with email is required' });
    }
    if (!template || !template.subject || !template.bodyHtml) {
      return res.status(400).json({ success: false, error: 'Stage template is required' });
    }

    const baseUrl = getPublicBaseUrl(req);

    const result = await sendAppEmail({
      lead,
      template,
      stageNum,
      senderDisplayName: customSenderName,
      baseUrl
    });

    res.json(result);
  } catch (err: any) {
    console.error('API /api/email/send-stage error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

interface InboundReply {
  id: string;
  leadEmail: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  receivedDateTime: string;
}

const inMemoryInboundReplies: InboundReply[] = [];

app.get('/api/email/thread', async (req, res) => {
  try {
    const threadId = req.query.threadId as string;
    const leadEmail = req.query.leadEmail as string;
    const result = await getAppConversationThread(threadId, leadEmail);

    // Also include any recorded inbound replies
    const cleanEmail = (leadEmail || '').trim().toLowerCase();
    let matchingInbound = inMemoryInboundReplies.filter(
      r => (cleanEmail && r.leadEmail === cleanEmail) || (threadId && r.threadId === threadId)
    );

    const db = await getDb().catch(() => null);
    if (db) {
      try {
        const query: any = {};
        if (cleanEmail && threadId) {
          query.$or = [{ leadEmail: cleanEmail }, { threadId }];
        } else if (cleanEmail) {
          query.leadEmail = cleanEmail;
        } else if (threadId) {
          query.threadId = threadId;
        }
        const dbReplies = await (db.collection('inbound_replies') as any).find(query).toArray();
        for (const r of dbReplies) {
          if (!matchingInbound.some(m => m.id === r.id)) {
            matchingInbound.push(r);
          }
        }
      } catch (_) {}
    }

    if (matchingInbound.length > 0) {
      const messages = [...result.messages];
      for (const inb of matchingInbound) {
        if (!messages.some(m => m.id === inb.id)) {
          messages.push({
            id: inb.id,
            threadId: inb.threadId || threadId || '',
            from: inb.from || cleanEmail,
            to: '',
            date: inb.receivedDateTime,
            subject: inb.subject,
            snippet: inb.body,
            bodyHtml: `<p>${inb.body}</p>`,
            bodyText: inb.body,
            isFromLead: true
          });
        }
      }
      return res.json({ success: true, messages, subject: result.subject || matchingInbound[0].subject });
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('API /api/email/thread error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/email/check-reply', async (req, res) => {
  try {
    const { leadEmail, threadId, lastSentDate } = req.body;
    if (!leadEmail) {
      return res.status(400).json({ success: false, error: 'leadEmail is required' });
    }

    const result = await checkAppThreadForReply({
      leadEmail,
      threadId,
      lastSentDate
    });

    if (result.hasReplied) {
      return res.json({ success: true, ...result });
    }

    // In production, real Microsoft Graph API is the sole source of truth for reply detection.
    // Stored simulated replies are restricted to local non-production environments.
    if (process.env.NODE_ENV !== 'production') {
      const cleanEmail = leadEmail.trim().toLowerCase();
      let reply = inMemoryInboundReplies.find(
        r => r.leadEmail === cleanEmail || (threadId && r.threadId === threadId)
      );

      if (!reply) {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const query: any = { $or: [{ leadEmail: cleanEmail }] };
            if (threadId) query.$or.push({ threadId });
            const dbReply = await (db.collection('inbound_replies') as any).findOne(query);
            if (dbReply) reply = dbReply;
          } catch (_) {}
        }
      }

      if (reply) {
        return res.json({
          success: true,
          hasReplied: true,
          reason: `Inbound reply detected from ${cleanEmail}`,
          replyMessage: {
            id: reply.id,
            from: reply.from || cleanEmail,
            subject: reply.subject,
            receivedDateTime: reply.receivedDateTime,
            bodyPreview: reply.body
          }
        });
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('API /api/email/check-reply error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================================
// MICROSOFT GRAPH CHANGE NOTIFICATIONS (WEBHOOKS) & RENEWAL CRON
// ===========================================================================

/**
 * 1. Webhook Endpoint: /api/webhooks/graph
 * - Validation Handshake: When Microsoft Graph registers/validates a subscription,
 *   it sends ?validationToken=...; the endpoint returns it as plain text HTTP 200 within 10s.
 * - Change Notifications: When inbound email arrives, Graph POSTs { value: [...] }.
 * - Security Boundary: Validates clientState on every notification against MICROSOFT_GRAPH_CLIENT_STATE.
 * - Shared Reply Logic: Calls shared applyLeadReply to update lead to Replied and record message.
 */
app.all('/api/webhooks/graph', async (req, res) => {
  try {
    // 1. Subscription Validation Handshake
    const validationToken = (req.query.validationToken as string) || (req.body?.validationToken as string);
    if (validationToken) {
      console.log('[Graph Webhook] Validation handshake received, returning token as plain text.');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(validationToken);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Incoming Change Notification Validation
    const notifications = req.body?.value;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Bad Request: Missing notification value array' });
    }

    const expectedSecret = getWebhookClientState();
    const results = [];

    // 3. Security Boundary: Validate clientState on EVERY incoming notification
    for (const item of notifications) {
      const providedClientState = item.clientState || '';
      if (!verifyWebhookClientState(providedClientState, expectedSecret)) {
        console.warn('[Graph Webhook] SECURITY REJECTION: Invalid or spoofed clientState:', providedClientState);
        return res.status(401).json({ error: 'Unauthorized: clientState validation failed' });
      }

      // 4. Shared reply processing logic
      const result = await processGraphWebhookNotification(item);
      results.push(result);
    }

    // Microsoft Graph requires HTTP 202 Accepted or 200 OK within 30 seconds
    return res.status(202).json({ success: true, processed: results.length, results });
  } catch (err: any) {
    console.error('[Graph Webhook] Processing error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Subscription Renewal Cron: /api/cron/renew-subscriptions
 * - Runs once daily via Vercel Cron ("0 2 * * *").
 * - Checks subscriptions expiring within 24 hours and extends them (max 4230 minutes).
 * - Creates a fresh subscription if none exists.
 */
app.all('/api/cron/renew-subscriptions', async (req, res) => {
  try {
    console.log('[Cron] Running daily Microsoft Graph webhook subscription renewal...');
    const renewed = await renewExpiringGraphSubscriptions();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      subscriptions: renewed
    });
  } catch (err: any) {
    console.error('[Cron] Subscription renewal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. On-demand Subscription Management: /api/webhooks/graph/subscribe
 * Allows admin/test script to inspect or trigger active subscription creation.
 */
app.post('/api/webhooks/graph/subscribe', async (req, res) => {
  try {
    const sub = await createGraphWebhookSubscription();
    res.json({ success: true, subscription: sub });
  } catch (err: any) {
    console.error('API /api/webhooks/graph/subscribe error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/email/test-send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient "to" email address is required' });
    }

    const result = await sendDirectTestEmail(to, subject, body);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/email/test-send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

