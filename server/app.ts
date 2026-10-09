import express from 'express';
import { MongoClient } from 'mongodb';
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  batchCreateLeads,
  reassignLead,
  reassignAllLeads,
  listCampaigns,
  saveCampaign,
  deleteCampaign,
  toggleCampaignActive,
  checkCampaignImpact,
  duplicateCampaign,
  restoreCampaignVersion,
  loadLocalSettings,
  saveLocalSettings,
  loadLocalSenders,
  saveLocalSenders,
  loadLocalTasks,
  saveLocalTasks,
  updateLocalTask,
  deleteLocalTask,
  loadTaskAlertsState,
  saveDismissedTaskAlerts,
  clearTaskAlertsState,
  loadUserWorkspaceNotes,
  saveUserWorkspaceNotes,
  loadUserAlertsState,
  saveUserDismissedAlerts,
  clearUserAlertsState,
  loadTrackingEvents,
  recordTrackingEvent,
  clearAllTrackingEvents,
  getSystemStatsSummary,
  applyLeadReply,
  manualOverrideSentiment,
  resumeCompanyLeads,
  confirmCompanyPause,
  TrackingEvent,
  BackendLead,
  BackendTask
} from './mongoBackend.ts';
import {
  getActiveKeywords,
  saveActiveKeywords,
  resetKeywordsToDefault,
  validatePhrase,
  classifyReply,
  DEFAULT_KEYWORD_LISTS,
  ActiveKeywordLists
} from './replyRules.ts';
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
import { renderEmailMergeTags, DEFAULT_STAGE_TEMPLATES } from '../src/data/defaultTemplates.ts';
import {
  getDefaultTemplateSet,
  getUserTemplateSet,
  getCampaignTemplateSet,
  getTemplateSetById,
  saveTemplateSet,
  restoreTemplateSetVersion,
  resetUserTemplateSetToDefault,
  getCampaignTemplateImpact,
  resolveEmailContent,
  composeFullEmail,
  sanitizeHtml
} from './templateBackend.ts';
import { requireAuth, requirePermission, requireAdmin } from './authMiddleware.ts';
import {
  getAuthProvider,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  checkLockout,
  recordFailedAttempt,
  clearLockout,
  seedInitialUsers
} from './auth.ts';
import {
  listUsers,
  createUser,
  toggleUserActive,
  changeUserRole,
  resetUserPassword,
  changeOwnPassword,
  deleteUser
} from './userBackend.ts';
import { getPermissionsForRole } from './permissions.ts';

export const app = express();

// Seed initial users on startup if collection is empty
seedInitialUsers().catch(err => console.error('[Auth Seeder] Startup error:', err));

app.set('trust proxy', true);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Authentication Middleware (Whitelists public webhook, tracking, cron, health & login endpoints)
app.use(requireAuth);

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

// ===========================================================================
// AUTHENTICATION & USER MANAGEMENT ENDPOINTS
// ===========================================================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const cleanEmail = String(email).toLowerCase().trim();

    // Check brute-force lockout (5 attempts per email+IP locks for 15 minutes in MongoDB)
    const lockout = await checkLockout(cleanEmail, clientIp);
    if (lockout.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockout.remainingMinutes || 15} minutes.`
      });
    }

    const authProvider = getAuthProvider();
    const user = await authProvider.authenticate(cleanEmail, String(password));

    if (!user) {
      const attempt = await recordFailedAttempt(cleanEmail, clientIp);
      if (attempt.isLocked) {
        return res.status(429).json({
          success: false,
          error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${attempt.remainingMinutes || 15} minutes.`
        });
      }
      // Same generic error for wrong email and wrong password
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Reject inactive users
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account is deactivated. Please contact an administrator.' });
    }

    // Clear lockout on successful authentication
    await clearLockout(cleanEmail, clientIp);

    // Update lastLoginAt
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection('users').updateOne({ id: user.id }, { $set: { lastLoginAt: now } });

    // Issue signed session token (stateless HMAC-SHA256, 8-hour expiry)
    const token = createSessionToken({ id: user.id, email: user.email, role: user.role });
    setSessionCookie(res, token);

    const permissions = getPermissionsForRole(user.role);

    return res.json({
      success: true,
      user: {
        ...user,
        lastLoginAt: now,
        permissions
      }
    });
  } catch (err: any) {
    console.error('[Auth API] Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal login error' });
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session missing or expired' });
  }
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    const result = await changeOwnPassword(req.user.id, oldPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, user: result.user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Admin Users Management Endpoints ---

app.get('/api/users', requirePermission('users.manage'), async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', requirePermission('users.manage'), async (req, res) => {
  try {
    const user = await createUser(req.body || {});
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/toggle-active', requirePermission('users.manage'), async (req, res) => {
  try {
    const requestingUserId = req.user!.id;
    const result = await toggleUserActive(req.params.id, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/change-role', requirePermission('users.changeRoles'), async (req, res) => {
  try {
    const requestingUserId = req.user!.id;
    const { role } = req.body || {};
    const result = await changeUserRole(req.params.id, role, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users/:id/reset-password', requirePermission('users.manage'), async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    const result = await resetUserPassword(req.params.id, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', requirePermission('users.manage'), async (req, res) => {
  try {
    const requestingUserId = req.user!.id;
    const reassignToUserId = req.body?.reassignToUserId || (req.query?.reassignToUserId as string) || '';
    if (!reassignToUserId) {
      return res.status(400).json({ success: false, error: 'A replacement user (reassignToUserId) is required to inherit leads and campaigns.' });
    }
    const result = await deleteUser(req.params.id, reassignToUserId, requestingUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

app.get('/api/mongodb/status', requireAdmin, async (_req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get('/api/mongodb/test-atlas', requireAdmin, async (req, res) => {
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

app.post('/api/mongodb/update-uri', requireAdmin, async (req, res) => {
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

app.post('/api/mongodb/migrate', requireAdmin, async (_req, res) => {
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
      // Asynchronously trigger workflow runner to evaluate condition branches immediately upon open
      runDueCampaignsJob(undefined, undefined, undefined, undefined).catch(err => {
        console.warn('[Track Open] Background campaign run error:', err);
      });
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
      // Asynchronously trigger workflow runner to evaluate condition branches immediately upon click
      runDueCampaignsJob(undefined, undefined, undefined, undefined).catch(err => {
        console.warn('[Track Click] Background campaign run error:', err);
      });
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

    // Verify lead ownership for non-admin
    if (req.user && req.user.role !== 'admin') {
      const existingLead = await leadsCol.findOne({ $or: filter });
      if (!existingLead || (existingLead.ownerId && existingLead.ownerId !== req.user.id)) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
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

app.get('/api/track/debug', requireAdmin, async (req, res) => {
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

app.get('/api/track/events', async (req, res) => {
  try {
    const ownerId = (req.user && req.user.role !== 'admin') ? req.user.id : undefined;
    const events = await loadTrackingEvents(ownerId);
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

app.post('/api/track/event', requireAdmin, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, error: 'Manual tracking event generation is disabled in production' });
    }

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

app.post('/api/track/clear', requireAdmin, async (_req, res) => {
  try {
    await clearAllTrackingEvents();
    res.json({ success: true, message: 'All tracking events cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Leads CRUD Endpoints (MongoDB Single Source of Truth) ---

app.all(['/api/leads', '/api/leads/list', '/api/leads/local'], async (req, res) => {
  try {
    const filter = (req.user && req.user.role !== 'admin') ? { ownerId: req.user.id } : {};
    const leads = await listLeads(undefined, undefined, filter);
    res.json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    console.error('API /api/leads/list error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/create', async (req, res) => {
  try {
    const leadData = req.body.lead || (req.body.email || req.body.name || req.body.leadId ? req.body : null);
    if (!leadData) {
      return res.status(400).json({ success: false, error: 'Missing lead object in request body' });
    }
    const created = await createLead(leadData, req.user);
    res.json({ success: true, lead: created });
  } catch (err: any) {
    console.error('API /api/leads/create error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/update', async (req, res) => {
  try {
    const leadData = req.body.lead || (req.body.leadId ? req.body : null);
    if (!leadData || !leadData.leadId) {
      return res.status(400).json({ success: false, error: 'Missing lead object or leadId' });
    }
    const updated = await updateLead(leadData, undefined, undefined, req.user);
    res.json({ success: true, lead: updated });
  } catch (err: any) {
    console.error('API /api/leads/update error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
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

    const leadDoc = await db.collection<BackendLead>(COLLECTIONS.LEADS).findOne({ $or: filters });
    if (!leadDoc) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    if (req.user && req.user.role !== 'admin' && leadDoc.ownerId && leadDoc.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
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
    const created = await batchCreateLeads(leadsData, req.user);
    res.json({ success: true, count: created.length, leads: created });
  } catch (err: any) {
    console.error('API /api/leads/batch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/delete', async (req, res) => {
  try {
    const { leadId, email } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'Missing leadId' });
    }
    const cleanId = String(leadId).trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    // Purge in-memory inbound replies for this lead
    for (let i = inMemoryInboundReplies.length - 1; i >= 0; i--) {
      const r = inMemoryInboundReplies[i];
      if ((cleanId && (r as any).leadId === cleanId) || (cleanEmail && r.leadEmail.toLowerCase() === cleanEmail)) {
        inMemoryInboundReplies.splice(i, 1);
      }
    }

    const deleted = await deleteLead(leadId, req.user);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('API /api/leads/delete error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Admin Lead Reassignment Routes
app.post('/api/leads/:leadId/reassign', requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'targetUserId is required' });
    }
    const requestingUser = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
    const result = await reassignLead(req.params.leadId, targetUserId, requestingUser);
    res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/reassign-all', requireAdmin, async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body || {};
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ success: false, error: 'fromUserId and toUserId are required' });
    }
    const requestingUser = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
    const result = await reassignAllLeads(fromUserId, toUserId, requestingUser);
    res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// --- Campaigns CRUD & Workflow Graph Endpoints (MongoDB) ---

app.get(['/api/campaigns', '/api/campaigns/list'], async (_req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err: any) {
    console.error('API /api/campaigns error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/campaigns', '/api/campaigns/save'], async (req, res) => {
  try {
    const campaign = req.body.campaign || req.body;
    if (!campaign || !campaign.id) {
      return res.status(400).json({ success: false, error: 'Missing campaign or campaign.id' });
    }
    const saved = await saveCampaign(campaign, req.user);
    res.json({ success: true, campaign: saved });
  } catch (err: any) {
    console.error('API /api/campaigns/save error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/delete', async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Missing campaignId' });
    }
    const deleted = await deleteCampaign(campaignId, req.user);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('API /api/campaigns/delete error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/toggle-active', async (req, res) => {
  try {
    const { campaignId, isActive } = req.body;
    if (!campaignId || isActive === undefined) {
      return res.status(400).json({ success: false, error: 'Missing campaignId or isActive' });
    }
    const updated = await toggleCampaignActive(campaignId, Boolean(isActive), req.user);
    res.json({ success: true, campaign: updated });
  } catch (err: any) {
    console.error('API /api/campaigns/toggle-active error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.get('/api/campaigns/:id/impact', async (req, res) => {
  try {
    const result = await checkCampaignImpact(req.params.id, req.user?.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/:id/duplicate', async (req, res) => {
  try {
    const { name } = req.body || {};
    const duplicated = await duplicateCampaign(req.params.id, req.user, name);
    res.json({ success: true, campaign: duplicated });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.post(['/api/campaigns/:id/restore', '/api/campaigns/:id/restore-version'], async (req, res) => {
  try {
    const { version } = req.body || {};
    if (typeof version !== 'number') {
      return res.status(400).json({ success: false, error: 'Target version number is required' });
    }
    const restored = await restoreCampaignVersion(req.params.id, version, req.user);
    res.json({ success: true, campaign: restored });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
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

app.post('/api/campaigns/run-due', requireAdmin, async (req, res) => {
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

// --- Settings Persistence Endpoints (Admin Only) ---

app.get('/api/settings', requireAdmin, async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
  try {
    const updated = await saveLocalSettings(req.body.settings || req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- Senders Persistence Endpoints (Admin Only) ---

app.get('/api/senders', requireAdmin, async (_req, res) => {
  try {
    const senders = await loadLocalSenders();
    res.json({ success: true, senders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/senders', requireAdmin, async (req, res) => {
  try {
    const senders = await saveLocalSenders(req.body.senders || []);
    res.json({ success: true, senders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Manual Tasks Queue Endpoints (Scoped to lead owner) ---

app.get('/api/tasks', async (req, res) => {
  try {
    const ownerId = (req.user && req.user.role !== 'admin') ? req.user.id : undefined;
    const tasks = await loadLocalTasks(ownerId);
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const tasksList = req.body.tasks || [];
    if (req.user && req.user.role !== 'admin') {
      const db = await getDb();
      for (const t of tasksList) {
        if (t.leadId) {
          const l = await db.collection<BackendLead>(COLLECTIONS.LEADS).findOne({ leadId: t.leadId });
          if (!l || (l.ownerId && l.ownerId !== req.user.id)) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
          }
        }
      }
    }
    const tasks = await saveLocalTasks(tasksList);
    res.json({ success: true, tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/update', async (req, res) => {
  try {
    const { taskId, updates } = req.body;
    if (!taskId) return res.status(400).json({ success: false, error: 'Missing taskId' });
    const db = await getDb();
    const existingTask = (await db.collection(COLLECTIONS.TASKS).findOne({ id: taskId })) as unknown as (BackendTask | null);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    if (req.user && req.user.role !== 'admin' && existingTask.leadId) {
      const lead = (await db.collection(COLLECTIONS.LEADS).findOne({ leadId: existingTask.leadId })) as unknown as (BackendLead | null);
      if (!lead || (lead.ownerId && lead.ownerId !== req.user.id)) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
    }
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
    const db = await getDb();
    const existingTask = (await db.collection(COLLECTIONS.TASKS).findOne({ id: taskId })) as unknown as (BackendTask | null);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    if (req.user && req.user.role !== 'admin' && existingTask.leadId) {
      const lead = (await db.collection(COLLECTIONS.LEADS).findOne({ leadId: existingTask.leadId })) as unknown as (BackendLead | null);
      if (!lead || (lead.ownerId && lead.ownerId !== req.user.id)) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
    }
    const deleted = await deleteLocalTask(taskId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- User-State Persistence Endpoints (MongoDB) ---

app.get('/api/user-state/notes', async (req, res) => {
  try {
    const notes = await loadUserWorkspaceNotes(req.user!.id);
    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const handleSaveNotes = async (req: any, res: any) => {
  try {
    const notes = String(req.body.notes || '');
    await saveUserWorkspaceNotes(req.user!.id, notes);
    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.post('/api/user-state/notes', handleSaveNotes);
app.put('/api/user-state/notes', handleSaveNotes);

app.get('/api/user-state/alerts', async (req, res) => {
  try {
    const state = await loadUserAlertsState(req.user!.id);
    res.json({ success: true, dismissedAlertIds: state.dismissedAlertIds });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/user-state/alerts', async (req, res) => {
  try {
    const alertIds = Array.isArray(req.body.alertIds)
      ? req.body.alertIds
      : Array.isArray(req.body.dismissedIds)
      ? req.body.dismissedIds
      : Array.isArray(req.body.dismissedAlertIds)
      ? req.body.dismissedAlertIds
      : req.body.alertId
      ? [req.body.alertId]
      : [];
    const dismissedAlertIds = await saveUserDismissedAlerts(req.user!.id, alertIds);
    res.json({ success: true, dismissedAlertIds });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/user-state/alerts', async (req, res) => {
  try {
    await clearUserAlertsState(req.user!.id);
    res.json({ success: true, dismissedAlertIds: [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backward-compatible alerts state endpoints (scoped to session user)
app.get('/api/tasks/alerts-state', async (req, res) => {
  try {
    const state = await loadUserAlertsState(req.user!.id);
    res.json({ success: true, dismissedAlertIds: state.dismissedAlertIds });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/alerts-state/dismiss', async (req, res) => {
  try {
    const alertIds = Array.isArray(req.body.alertIds)
      ? req.body.alertIds
      : req.body.alertId
      ? [req.body.alertId]
      : [];
    const updated = await saveUserDismissedAlerts(req.user!.id, alertIds);
    res.json({ success: true, dismissedAlertIds: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/alerts-state/clear', async (req, res) => {
  try {
    await clearUserAlertsState(req.user!.id);
    res.json({ success: true, dismissedAlertIds: [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- System Overview & Stats ---

app.get('/api/system/stats', async (req, res) => {
  try {
    const ownerId = (req.user && req.user.role !== 'admin') ? req.user.id : undefined;
    const stats = await getSystemStatsSummary(ownerId);
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

    if (leadId) {
      const db = await getDb();
      const lead = await db.collection<BackendLead>(COLLECTIONS.LEADS).findOne({ leadId: leadId.trim() });
      if (!lead) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      if (req.user && req.user.role !== 'admin' && lead.ownerId && lead.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
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

app.get('/api/email/service-account', requireAdmin, async (_req, res) => {
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

    // Verify database record as real-time safety and ownership boundary
    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: 'Database unavailable' });

    const dbLead = (await db.collection(COLLECTIONS.LEADS).findOne({
      $or: [
        ...(lead.leadId ? [{ leadId: lead.leadId }] : []),
        ...(lead.email ? [{ email: lead.email.trim().toLowerCase() }] : [])
      ]
    })) as (BackendLead | null);

    if (!dbLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Ownership check BEFORE calling Graph API
    if (req.user && req.user.role !== 'admin' && dbLead.ownerId && dbLead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Hard safety check: Refuse to email any lead with status 'Negative Reply' at send time
    if (dbLead.status === 'Negative Reply' || lead.status === 'Negative Reply') {
      return res.status(400).json({
        success: false,
        error: `Cannot email lead ${lead.name || lead.email}: Lead status is "Negative Reply" (do not contact).`
      });
    }

    const effectiveStage = stageNum || (dbLead.currentStage != null ? dbLead.currentStage + 1 : 1);
    const nodeOrStage = (template?.useCustomTemplate && template?.customSubject)
      ? { data: template }
      : effectiveStage;

    const resolved = await resolveEmailContent(dbLead, nodeOrStage);
    const effectiveTemplate = {
      stage: resolved.stage || effectiveStage,
      name: `Stage ${resolved.stage || effectiveStage}`,
      purpose: 'Outreach',
      defaultGapDays: 3,
      subject: resolved.subject,
      bodyHtml: resolved.bodyHtml
    };

    const baseUrl = getPublicBaseUrl(req);

    const result = await sendAppEmail({
      lead: dbLead as any,
      template: effectiveTemplate,
      stageNum: effectiveStage,
      senderDisplayName: customSenderName,
      baseUrl
    });

    // Record sentBy and lastModifiedBy on the lead
    await db.collection(COLLECTIONS.LEADS).updateOne(
      { leadId: dbLead.leadId },
      { $set: { sentBy: req.user?.name || 'System', lastModifiedBy: req.user?.name || 'System', updatedAt: new Date().toISOString() } }
    );

    // Record outbound email to sent_emails collection so it appears in the thread
    const effectiveSender = customSenderName
      ? `"${customSenderName}" <${lead.senderUsed || 'care@giniiris.ai'}>`
      : (lead.senderUsed ? `Outreach Flow <${lead.senderUsed}>` : 'You <care@giniiris.ai>');

    await recordSentEmail({
      id: result.messageId,
      leadId: lead.leadId,
      leadEmail: lead.email,
      threadId: result.threadId || lead.threadId,
      from: effectiveSender,
      to: lead.email,
      subject: result.subject || effectiveTemplate.subject,
      bodyHtml: result.bodyHtml || effectiveTemplate.bodyHtml,
      stage: effectiveStage,
      campaign: lead.campaign
    });

    res.json(result);
  } catch (err: any) {
    console.error('API /api/email/send-stage error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================================
// TEMPLATE SETS & EMAIL HEADER / FOOTER ENDPOINTS
// ===========================================================================

// 1. Get Admin Default Template Set
app.get('/api/template-sets/default', requireAuth, async (_req, res) => {
  try {
    const defaultSet = await getDefaultTemplateSet();
    res.json({ success: true, templateSet: defaultSet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get User Personal Template Set
app.get('/api/template-sets/user/:userId', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const isSelf = req.user?.id === targetUserId;
    const isAdmin = req.user?.role === 'admin';
    const hasViewAny = req.user?.permissions?.includes('templates.editAny');

    if (!isSelf && !isAdmin && !hasViewAny) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to view other users\' templates' });
    }

    const userSet = await getUserTemplateSet(targetUserId);
    res.json({ success: true, templateSet: userSet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Campaign Template Set
app.get('/api/template-sets/campaign/:campaignId', requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const campSet = await getCampaignTemplateSet(campaignId);
    res.json({ success: true, templateSet: campSet });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Save Template Set (enforces server-side permissions and versioning)
app.post('/api/template-sets/save', requireAuth, async (req, res) => {
  try {
    const { setId, stages } = req.body;
    if (!setId || !Array.isArray(stages)) {
      return res.status(400).json({ success: false, error: 'Missing setId or stages array' });
    }

    const updated = await saveTemplateSet(setId, stages, req.user!);
    res.json({ success: true, templateSet: updated });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 5. Restore Previous Template Set Version
app.post('/api/template-sets/:id/restore', requireAuth, async (req, res) => {
  try {
    const setId = req.params.id;
    const { version } = req.body;
    if (version === undefined || version === null) {
      return res.status(400).json({ success: false, error: 'Missing version parameter' });
    }

    const restored = await restoreTemplateSetVersion(setId, Number(version), req.user!);
    res.json({ success: true, templateSet: restored });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 6. Reset User Template Set to Current Admin Default
app.post('/api/template-sets/user/:userId/reset', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const isSelf = req.user?.id === targetUserId;
    const isAdmin = req.user?.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only reset your own template set' });
    }

    const resetSet = await resetUserTemplateSetToDefault(targetUserId, req.user!);
    res.json({ success: true, templateSet: resetSet });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 7. Campaign Template Impact Warning Count
app.get('/api/template-sets/campaign/:campaignId/impact', requireAuth, async (req, res) => {
  try {
    const campaignId = req.params.campaignId;
    const impact = await getCampaignTemplateImpact(campaignId);
    res.json({ success: true, impact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Resolve & Preview Composed Email (desktop & mobile)
app.post('/api/templates/resolve-preview', requireAuth, async (req, res) => {
  try {
    const { lead, stage, node, campaignId } = req.body;
    const effectiveLead = lead || { leadId: 'preview-lead', name: 'Alex Johnson', email: 'alex@example.com', company: 'Acme Corp', campaignId };
    if (campaignId && !effectiveLead.campaignId) effectiveLead.campaignId = campaignId;

    const resolved = await resolveEmailContent(effectiveLead, node || stage || 1);
    const settings = await loadLocalSettings();
    const baseUrl = getPublicBaseUrl(req);

    const composed = composeFullEmail({
      bodyHtml: resolved.bodyHtml,
      headerHtml: settings.emailHeader || '',
      footerHtml: settings.emailFooter || '',
      lead: effectiveLead,
      stage: resolved.stage,
      senderDisplayName: req.user?.name || 'Outreach Flow',
      baseUrl,
      embedTrackingPixel: true
    });

    res.json({
      success: true,
      resolved,
      composed
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Get Global Header & Footer
app.get('/api/settings/header-footer', requireAuth, async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({
      success: true,
      header: settings.emailHeader || '',
      footer: settings.emailFooter || ''
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Update Global Header & Footer (Admin or templates.editHeaderFooter ONLY)
app.post('/api/settings/header-footer', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const hasHeaderFooterPerm = Boolean(req.user?.permissions?.includes('templates.editHeaderFooter'));

    if (!isAdmin && !hasHeaderFooterPerm) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only administrators can modify global email header and footer'
      });
    }

    const { header, footer } = req.body;
    const sanitizedHeader = sanitizeHtml(String(header || ''));
    const sanitizedFooter = sanitizeHtml(String(footer || ''));

    const currentSettings = await loadLocalSettings();
    const updatedSettings = {
      ...currentSettings,
      emailHeader: sanitizedHeader,
      emailFooter: sanitizedFooter
    };

    await saveLocalSettings(updatedSettings);

    res.json({
      success: true,
      header: sanitizedHeader,
      footer: sanitizedFooter
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function stripHtmlTags(html: string): string {
  return (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function recordSentEmail(entry: {
  id?: string;
  leadId?: string;
  leadEmail: string;
  threadId?: string;
  from?: string;
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  stage?: number;
  campaign?: string;
  date?: string;
}) {
  const db = await getDb().catch(() => null);
  const cleanEmail = (entry.leadEmail || entry.to || '').trim().toLowerCase();
  const doc = {
    id: entry.id || `sent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    leadId: entry.leadId || '',
    leadEmail: cleanEmail,
    threadId: entry.threadId || '',
    from: entry.from || 'You <care@giniiris.ai>',
    to: entry.to || cleanEmail,
    subject: entry.subject || 'Outreach email',
    bodyHtml: entry.bodyHtml || '',
    bodyText: entry.bodyText || stripHtmlTags(entry.bodyHtml),
    snippet: stripHtmlTags(entry.bodyHtml).substring(0, 160),
    date: entry.date || new Date().toISOString(),
    stage: entry.stage || 1,
    campaign: entry.campaign || '',
    isFromLead: false
  };

  if (db) {
    try {
      await db.collection('sent_emails').updateOne(
        { id: doc.id },
        { $set: doc },
        { upsert: true }
      );
    } catch (e) {
      console.warn('Could not persist sent_email doc to DB:', e);
    }
  }
  return doc;
}

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
    const threadId = (req.query.threadId as string) || '';
    const leadEmail = (req.query.leadEmail as string) || '';
    const leadId = (req.query.leadId as string) || '';
    const cleanEmail = leadEmail.trim().toLowerCase();

    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: 'Database unavailable' });

    // Verify lead ownership BEFORE calling Microsoft Graph
    const leadQuery: any = {};
    if (leadId) {
      leadQuery.leadId = leadId.trim();
    } else if (cleanEmail && threadId) {
      leadQuery.$or = [{ email: cleanEmail }, { threadId }];
    } else if (cleanEmail) {
      leadQuery.email = cleanEmail;
    } else if (threadId) {
      leadQuery.threadId = threadId;
    }

    const leadDoc = Object.keys(leadQuery).length > 0
      ? ((await db.collection(COLLECTIONS.LEADS).findOne(leadQuery)) as (BackendLead | null))
      : null;

    if (!leadDoc) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (req.user && req.user.role !== 'admin' && leadDoc.ownerId && leadDoc.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // 1. Fetch Microsoft Graph messages now that ownership is confirmed
    const graphResult = await getAppConversationThread(threadId || leadDoc.threadId, cleanEmail || leadDoc.email).catch(() => ({ messages: [], subject: '' }));

    // 2. Query sent_emails collection from database
    let sentMessages: any[] = [];
    try {
      const sentQuery: any = {};
      const targetEmail = cleanEmail || leadDoc.email;
      const targetThreadId = threadId || leadDoc.threadId;
      if (targetEmail && targetThreadId) {
        sentQuery.$or = [{ leadEmail: targetEmail }, { threadId: targetThreadId }];
      } else if (targetEmail) {
        sentQuery.leadEmail = targetEmail;
      } else if (targetThreadId) {
        sentQuery.threadId = targetThreadId;
      }
      sentMessages = await db.collection('sent_emails').find(sentQuery).toArray();
    } catch (_) {}


    // 3. If no sent emails are recorded in sent_emails yet, but lead exists and was dispatched to
    if (sentMessages.length === 0 && leadDoc && (leadDoc.lastEmailSentDate || (leadDoc.currentStage || 0) >= 1)) {
      try {
        let campaignDoc: any = null;
        if (leadDoc.campaignId) {
          campaignDoc = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ id: leadDoc.campaignId }).catch(() => null);
        } else if (leadDoc.campaign) {
          campaignDoc = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({ name: leadDoc.campaign }).catch(() => null);
        }

        const senderDisplayName = leadDoc.senderUsed || 'Care';
        const senderEmail = leadDoc.senderUsed || 'care@giniiris.ai';
        const maxStage = Math.max(1, leadDoc.currentStage || 1);

        for (let st = 1; st <= maxStage; st++) {
          let subject = '';
          let bodyHtml = '';

          if (campaignDoc) {
            const nodes = campaignDoc.workflow_graph?.nodes || campaignDoc.nodes || [];
            const emailNodes = nodes.filter((n: any) => n.type === 'emailNode' || n.data?.nodeType === 'email');
            const emailNode = emailNodes[st - 1];
            if (emailNode?.data) {
              subject = emailNode.data.customSubject || '';
              bodyHtml = (emailNode.data.customBody || '').replace(/\n/g, '<br/>');
            }
          }

          if (!subject || !bodyHtml) {
            const defaultTpl = DEFAULT_STAGE_TEMPLATES.find(t => t.stage === st) || DEFAULT_STAGE_TEMPLATES[0];
            subject = subject || defaultTpl.subject;
            bodyHtml = bodyHtml || defaultTpl.bodyHtml;
          }

          const renderedSubject = renderEmailMergeTags(subject, leadDoc as any, senderDisplayName);
          const renderedBody = renderEmailMergeTags(bodyHtml, leadDoc as any, senderDisplayName);

          const backfilledDoc = {
            id: `sent-${leadDoc.leadId}-stage-${st}`,
            leadId: leadDoc.leadId,
            leadEmail: cleanEmail || leadDoc.email.toLowerCase(),
            threadId: threadId || leadDoc.threadId || '',
            from: `"${senderDisplayName}" <${senderEmail}>`,
            to: leadDoc.email,
            date: leadDoc.lastEmailSentDate || leadDoc.createdAt || new Date().toISOString(),
            subject: renderedSubject,
            snippet: stripHtmlTags(renderedBody).substring(0, 160),
            bodyHtml: renderedBody,
            bodyText: stripHtmlTags(renderedBody),
            stage: st,
            campaign: leadDoc.campaign || '',
            isFromLead: false
          };

          sentMessages.push(backfilledDoc);
          if (db) {
            await db.collection('sent_emails').updateOne(
              { id: backfilledDoc.id },
              { $set: backfilledDoc },
              { upsert: true }
            ).catch(() => {});
          }
        }
      } catch (backfillErr) {
        console.warn('Error backfilling sent stage emails:', backfillErr);
      }
    }

    // 4. Query inbound_replies collection
    let inboundReplies: any[] = [];
    if (db) {
      try {
        const inbQuery: any = {};
        if (cleanEmail && threadId) {
          inbQuery.$or = [{ leadEmail: cleanEmail }, { threadId }];
        } else if (cleanEmail) {
          inbQuery.leadEmail = cleanEmail;
        } else if (threadId) {
          inbQuery.threadId = threadId;
        }
        inboundReplies = await db.collection('inbound_replies').find(inbQuery).toArray();
      } catch (_) {}
    }

    // Also include any recorded in-memory inbound replies
    for (const inb of inMemoryInboundReplies) {
      if ((cleanEmail && inb.leadEmail === cleanEmail) || (threadId && inb.threadId === threadId)) {
        if (!inboundReplies.some(m => m.id === inb.id)) {
          inboundReplies.push(inb);
        }
      }
    }

    // 5. Build combined thread messages
    const messageMap = new Map<string, any>();

    // Add Graph messages
    for (const msg of graphResult.messages || []) {
      messageMap.set(msg.id, msg);
    }

    // Add sent messages
    for (const sent of sentMessages) {
      messageMap.set(sent.id, {
        id: sent.id,
        threadId: sent.threadId || threadId,
        from: sent.from || 'You <care@giniiris.ai>',
        to: sent.to || cleanEmail,
        date: sent.date,
        subject: sent.subject,
        snippet: sent.snippet || stripHtmlTags(sent.bodyHtml),
        bodyHtml: sent.bodyHtml,
        bodyText: sent.bodyText || stripHtmlTags(sent.bodyHtml),
        isFromLead: false
      });
    }

    // Add inbound replies (filter out dummy system records and map fields)
    for (const inb of inboundReplies) {
      if (!inb) continue;
      const rawBody = inb.body || inb.bodyText || inb.snippet || '';
      // Exclude internal dummy status strings from appearing as emails in thread
      if (
        rawBody.includes('Incoming reply flag detected on lead record') ||
        rawBody.includes('Status already marked Replied') ||
        rawBody.includes('Status marked Negative Reply')
      ) {
        continue;
      }

      messageMap.set(inb.id, {
        id: inb.id,
        threadId: inb.threadId || threadId,
        from: inb.from || cleanEmail,
        to: inb.to || '',
        date: inb.receivedDateTime || inb.date || new Date().toISOString(),
        subject: inb.subject || 'Re: Outreach Flow follow-up',
        snippet: inb.snippet || rawBody,
        bodyHtml: inb.bodyHtml || (rawBody ? `<p>${rawBody.replace(/\n/g, '<br/>')}</p>` : ''),
        bodyText: rawBody,
        isFromLead: true
      });
    }

    // Deduplicate across Graph, sent emails, and inbound replies
    const allRaw = Array.from(messageMap.values());
    const seenSignatures = new Set<string>();
    const deduplicatedMessages: any[] = [];

    for (const msg of allRaw) {
      const isFromLead = Boolean(msg.isFromLead);
      const cleanBody = (msg.bodyText || msg.snippet || msg.bodyHtml || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .substring(0, 100);

      // Unique signature:
      // Inbound: lead email + first 100 chars of normalized text
      // Outbound: stage + sent date day + normalized subject
      const dateDay = (msg.date || '').slice(0, 10);
      const signature = isFromLead
        ? `inbound_${(msg.from || cleanEmail).toLowerCase().trim()}_${cleanBody}`
        : `outbound_${msg.stage || 0}_${dateDay}_${(msg.subject || '').trim().toLowerCase()}`;

      if (cleanBody && seenSignatures.has(signature)) {
        continue;
      }
      seenSignatures.add(signature);
      deduplicatedMessages.push(msg);
    }

    // Sort chronologically (oldest first)
    deduplicatedMessages.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    const subject = graphResult.subject || sentMessages[0]?.subject || inboundReplies[0]?.subject || (threadId ? `Conversation ${threadId}` : 'Email Thread');

    res.json({
      success: true,
      messages: deduplicatedMessages,
      subject
    });
  } catch (err: any) {
    console.error('API /api/email/thread error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/email/check-reply', async (req, res) => {
  try {
    const { leadEmail, threadId, lastSentDate, leadId } = req.body;
    if (!leadEmail && !threadId && !leadId) {
      return res.status(400).json({ success: false, error: 'leadEmail, threadId, or leadId is required' });
    }

    const db = await getDb().catch(() => null);
    if (!db) return res.status(500).json({ success: false, error: 'Database unavailable' });

    const filter: any = {};
    if (leadId) filter.leadId = leadId.trim();
    else if (leadEmail) filter.email = leadEmail.trim().toLowerCase();
    else if (threadId) filter.threadId = threadId.trim();

    const dbLead = (await db.collection(COLLECTIONS.LEADS).findOne(filter)) as (BackendLead | null);
    if (!dbLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    // Ownership check BEFORE calling Microsoft Graph API
    if (req.user && req.user.role !== 'admin' && dbLead.ownerId && dbLead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const result = await checkAppThreadForReply({
      leadEmail: leadEmail || dbLead.email,
      threadId: threadId || dbLead.threadId,
      lastSentDate: lastSentDate || dbLead.lastEmailSentDate
    });

    if (result.hasReplied) {
      // Process through shared reply logic & rule-based sentiment classification
      const applyResult = await applyLeadReply({
        leadEmail: leadEmail || dbLead.email,
        threadId: threadId || dbLead.threadId,
        messageId: result.replyMessage?.id,
        subject: result.replyMessage?.subject || 'Re: Outreach Flow follow-up',
        body: result.replyMessage?.bodyPreview || result.reason || '',
        from: result.replyMessage?.from || leadEmail || dbLead.email,
        receivedDateTime: result.replyMessage?.receivedDateTime,
        source: 'Microsoft Graph Reply Check'
      });

      return res.json({
        success: true,
        ...result,
        applied: applyResult.applied,
        updatedLead: applyResult.lead,
        classification: applyResult.classification,
        pausedCompanyLeadsCount: applyResult.pausedCompanyLeadsCount,
        pendingConfirmation: applyResult.pendingConfirmation
      });
    }

    // In production, real Microsoft Graph API is the sole source of truth for reply detection.
    // Stored simulated replies are restricted to local non-production environments.
    if (process.env.NODE_ENV !== 'production') {
      const effectiveLastSent = lastSentDate || dbLead.lastEmailSentDate;
      const effectiveThreadId = threadId || dbLead.threadId;

      // If no outreach email was ever sent to this lead, it cannot have replied to outreach!
      if (!effectiveLastSent && !effectiveThreadId) {
        return res.json({ success: true, hasReplied: false, reason: 'No outreach email sent to this lead yet' });
      }

      const cleanEmail = (leadEmail || dbLead.email).trim().toLowerCase();
      let reply = inMemoryInboundReplies.find(
        r => r.leadEmail === cleanEmail || (effectiveThreadId && r.threadId === effectiveThreadId)
      );

      if (!reply) {
        try {
          const query: any = { $or: [{ leadEmail: cleanEmail }] };
          if (effectiveThreadId) query.$or.push({ threadId: effectiveThreadId });
          const dbReply = await (db.collection('inbound_replies') as any).findOne(query);
          if (dbReply) reply = dbReply;
        } catch (_) {}
      }

      if (reply) {
        // Enforce timestamp correlation: reply must be received AFTER lastSentDate
        if (effectiveLastSent) {
          const sentTime = new Date(effectiveLastSent.includes('T') ? effectiveLastSent : `${effectiveLastSent}T00:00:00Z`).getTime();
          const replyTime = new Date(reply.receivedDateTime || (reply as any).createdAt || 0).getTime();
          if (!isNaN(sentTime) && !isNaN(replyTime) && replyTime <= sentTime) {
            // Reply is older than outreach dispatch date; ignore as stale previous test reply!
            return res.json({ success: true, hasReplied: false, reason: 'Stored reply is older than outreach dispatch date' });
          }
        }

        // Process through shared reply logic & rule-based sentiment classification
        const applyResult = await applyLeadReply({
          leadEmail: cleanEmail,
          threadId: reply.threadId || effectiveThreadId,
          messageId: reply.id,
          subject: reply.subject || 'Re: Outreach Flow follow-up',
          body: reply.body || '',
          from: reply.from || cleanEmail,
          receivedDateTime: reply.receivedDateTime,
          source: 'Simulated Inbound Reply'
        });

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
          },
          applied: applyResult.applied,
          updatedLead: applyResult.lead,
          classification: applyResult.classification,
          pausedCompanyLeadsCount: applyResult.pausedCompanyLeadsCount,
          pendingConfirmation: applyResult.pendingConfirmation
        });
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('API /api/email/check-reply error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Manual Sentiment Override & Company Actions Endpoints ---

app.post('/api/leads/override-sentiment', async (req, res) => {
  try {
    const { leadId, sentiment, reason } = req.body;
    if (!leadId || !sentiment) {
      return res.status(400).json({ success: false, error: 'leadId and sentiment are required' });
    }
    const db = await getDb();
    const lead = (await db.collection(COLLECTIONS.LEADS).findOne({ leadId: leadId.trim() })) as unknown as (BackendLead | null);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    if (req.user && req.user.role !== 'admin' && lead.ownerId && lead.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const result = await manualOverrideSentiment(leadId, sentiment, reason);
    res.json(result);
  } catch (err: any) {
    console.error('API /api/leads/override-sentiment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/resume-company', async (req, res) => {
  try {
    const replyingLeadId = (req.body.replyingLeadId || req.body.leadId || '').trim();
    if (!replyingLeadId) {
      return res.status(400).json({ success: false, error: 'replyingLeadId is required' });
    }
    const db = await getDb();
    const replyingLead = (await db.collection(COLLECTIONS.LEADS).findOne({ leadId: replyingLeadId })) as unknown as (BackendLead | null);
    if (!replyingLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const isOwner = replyingLead.ownerId === req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const result = await resumeCompanyLeads(replyingLeadId);
    if (!isAdmin) {
      return res.json({ success: true, count: result.resumedCount });
    }
    res.json(result);
  } catch (err: any) {
    console.error('API /api/leads/resume-company error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/leads/confirm-company-pause', async (req, res) => {
  try {
    const replyingLeadId = (req.body.replyingLeadId || req.body.leadId || '').trim();
    if (!replyingLeadId) {
      return res.status(400).json({ success: false, error: 'replyingLeadId is required' });
    }
    const db = await getDb();
    const replyingLead = (await db.collection(COLLECTIONS.LEADS).findOne({ leadId: replyingLeadId })) as unknown as (BackendLead | null);
    if (!replyingLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const isOwner = replyingLead.ownerId === req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const result = await confirmCompanyPause(replyingLeadId);
    if (!isAdmin) {
      return res.json({ success: true, count: result.pausedCount });
    }
    res.json(result);
  } catch (err: any) {
    console.error('API /api/leads/confirm-company-pause error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================================
// REPLY CLASSIFIER KEYWORD RULES & TEST ENDPOINTS (Admin Only)
// ===========================================================================

app.get('/api/reply-rules', requireAdmin, async (_req, res) => {
  try {
    const lists = await getActiveKeywords();
    res.json({
      success: true,
      lists,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reply-rules', requireAdmin, async (req, res) => {
  try {
    const { negativePhrases, positivePhrases, deferralPhrases, autoReplyPhrases } = req.body;

    const sanitizeList = (raw: any, categoryName: string): string[] | undefined => {
      if (raw === undefined) return undefined;
      if (!Array.isArray(raw)) throw new Error(`${categoryName} must be an array of strings`);
      const sanitized: string[] = [];
      const seen = new Set<string>();

      for (const item of raw) {
        const str = String(item || '');
        const v = validatePhrase(str, sanitized);
        if (!v.valid) {
          throw new Error(`[${categoryName}] ${v.error}`);
        }
        if (!seen.has(v.normalized)) {
          seen.add(v.normalized);
          sanitized.push(v.normalized);
        }
      }
      return sanitized;
    };

    const updated = await saveActiveKeywords({
      negativePhrases: sanitizeList(negativePhrases, 'Negative phrases'),
      positivePhrases: sanitizeList(positivePhrases, 'Positive phrases'),
      deferralPhrases: sanitizeList(deferralPhrases, 'Deferral phrases'),
      autoReplyPhrases: sanitizeList(autoReplyPhrases, 'Auto-reply phrases')
    });

    res.json({
      success: true,
      lists: updated,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/reply-rules/reset', requireAdmin, async (req, res) => {
  try {
    const { category } = req.body;
    const updated = await resetKeywordsToDefault(category);
    res.json({
      success: true,
      lists: updated,
      defaults: DEFAULT_KEYWORD_LISTS
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reply-rules/test', requireAdmin, async (req, res) => {
  try {
    const { text, subject } = req.body;
    const activeKeywords = await getActiveKeywords();
    const classification = classifyReply(subject || '', text || '', activeKeywords);
    res.json({
      success: true,
      classification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reply-rules/preview-recent', requireAdmin, async (_req, res) => {
  try {
    const db = await getDb();
    const activeKeywords = await getActiveKeywords();

    // Find up to 10 most recent leads with replies
    const leads = await db
      .collection(COLLECTIONS.LEADS)
      .find({
        $or: [
          { status: 'Replied' },
          { status: 'Negative Reply' },
          { hasReplied: true },
          { lastReplyReceivedDate: { $exists: true, $ne: '' } }
        ]
      })
      .sort({ lastReplyReceivedDate: -1, updatedAt: -1 })
      .limit(10)
      .toArray();

    // Also look up stored inbound reply snippets if available
    const inboundReplies = await db
      .collection(COLLECTIONS.INBOUND_REPLIES)
      .find({})
      .sort({ receivedDateTime: -1, createdAt: -1 })
      .limit(20)
      .toArray();

    const previews = leads.map(l => {
      const matchingReply = inboundReplies.find(
        (r: any) =>
          (l.email && r.leadEmail && r.leadEmail.toLowerCase() === l.email.toLowerCase()) ||
          (l.threadId && r.threadId && r.threadId === l.threadId)
      );

      const replyBody = (matchingReply as any)?.body || l.notes || '';
      const replySubject = (matchingReply as any)?.subject || '';
      const currentSentiment = l.replySentiment || (l.status === 'Negative Reply' ? 'negative' : 'neutral');

      const sim = classifyReply(replySubject, replyBody, activeKeywords);

      return {
        leadId: l.leadId,
        name: l.name,
        email: l.email,
        company: l.company,
        replySnippet: replyBody.slice(0, 150),
        currentSentiment,
        simulatedSentiment: sim.sentiment,
        matchedPhrases: sim.matchedPhrases,
        reason: sim.reason,
        sentimentChanged: currentSentiment !== sim.sentiment
      };
    });

    res.json({
      success: true,
      count: previews.length,
      previews
    });
  } catch (err: any) {
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
 * 3. On-demand Subscription Management: /api/webhooks/graph/subscribe (Admin Only)
 * Allows admin to inspect or trigger active subscription creation.
 */
app.post('/api/webhooks/graph/subscribe', requireAdmin, async (req, res) => {
  try {
    const sub = await createGraphWebhookSubscription();
    res.json({ success: true, subscription: sub });
  } catch (err: any) {
    console.error('API /api/webhooks/graph/subscribe error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin-only test send endpoint with production safeguard
app.post('/api/email/test-send', requireAdmin, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_TEST_SEND !== 'true') {
      return res.status(403).json({ success: false, error: 'Test sending is disabled in production unless ALLOW_PROD_TEST_SEND is enabled' });
    }

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

// ===========================================================================
// DENY BY DEFAULT FALLBACK (Requirement 5)
// Any /api/* endpoint not explicitly handled above requires admin-only access
// ===========================================================================

app.all('/api/*', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }
  return res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found` });
});


