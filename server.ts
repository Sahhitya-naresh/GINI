import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  listLeads,
  loadLocalLeads,
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
  getSystemStatsSummary
} from './server/sheetsBackend.ts';
import { parseFileBuffer } from './server/importBackend.ts';
import { runDueCampaignsJob } from './server/runnerBackend.ts';

interface TrackingEvent {
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

const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const EVENTS_FILE = path.join(process.cwd(), 'tracking-events.json');

// 1x1 transparent GIF binary
const TRANSPARENT_GIF_1X1 = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function loadEvents(): TrackingEvent[] {
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading tracking-events.json:', e);
  }
  return [];
}

function saveEvents(events: TrackingEvent[]) {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing tracking-events.json:', e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  let events: TrackingEvent[] = loadEvents();

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

      // Also alias by email if email is present and distinct from primaryKey
      if (ev.email && ev.email.toLowerCase() !== primaryKey.toLowerCase()) {
        stats[ev.email.toLowerCase()] = item;
      }
      // Also alias by leadId if leadId is present and distinct from primaryKey
      if (ev.leadId && ev.leadId !== primaryKey) {
        stats[ev.leadId] = item;
      }
    }

    return stats;
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', eventsCount: events.length });
  });

  // Open Tracking Pixel Endpoint (query params)
  // e.g. /api/track/open?leadId=LEAD-101&email=test@example.com&stage=1&campaign=Inbound
  const handleOpenTracking = (req: express.Request, res: express.Response) => {
    const leadId = (req.query.leadId || req.params.leadId || '').toString().trim();
    const email = (req.query.email || '').toString().trim().toLowerCase();
    const stage = parseInt((req.query.stage || req.params.stage || '1').toString(), 10) || 1;
    const campaign = (req.query.campaign || 'default').toString();

    if (leadId || email) {
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

      events.push(newEvent);
      saveEvents(events);
    }

    // Always serve 1x1 transparent GIF with aggressive no-cache headers
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

  // Link Click Tracking Endpoint (query params)
  // e.g. /api/track/click?url=https%3A%2F%2Fexample.com&leadId=LEAD-101&email=test@example.com&stage=3
  app.get('/api/track/click', (req, res) => {
    const targetUrl = (req.query.url || 'https://example.com').toString();
    const leadId = (req.query.leadId || '').toString().trim();
    const email = (req.query.email || '').toString().trim().toLowerCase();
    const stage = parseInt((req.query.stage || '1').toString(), 10) || 1;
    const campaign = (req.query.campaign || 'default').toString();

    if (leadId || email) {
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

      events.push(newEvent);
      saveEvents(events);
    }

    // Redirect to original URL
    res.redirect(302, targetUrl);
  });

  // Get all tracking stats and events
  app.get('/api/track/events', (_req, res) => {
    const statsByLead = computeStatsByLead(events);
    res.json({
      success: true,
      totalOpens: events.filter(e => e.type === 'open').length,
      totalClicks: events.filter(e => e.type === 'click').length,
      events,
      statsByLead
    });
  });

  // Record an event manually (e.g. for testing / simulation)
  app.post('/api/track/event', (req, res) => {
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

    events.push(newEvent);
    saveEvents(events);

    res.json({ success: true, event: newEvent });
  });

  // Clear events
  app.post('/api/track/clear', (_req, res) => {
    events = [];
    saveEvents(events);
    res.json({ success: true, message: 'All tracking events cleared' });
  });

  // Helper to extract auth header token and spreadsheet id
  const getAuth = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const spreadsheetId = (req.headers['x-spreadsheet-id'] || req.body?.spreadsheetId || req.query?.spreadsheetId) as string | undefined;
    return { token, spreadsheetId };
  };

  // --- Leads CRUD Endpoints ---

  app.post('/api/leads/list', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const leads = await listLeads(token, spreadsheetId);
      res.json({ success: true, leads });
    } catch (err: any) {
      console.error('API /api/leads/list error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/leads/list', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const leads = await listLeads(token, spreadsheetId);
      res.json({ success: true, leads });
    } catch (err: any) {
      console.error('API /api/leads/list GET error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/leads/local', (req, res) => {
    try {
      const local = loadLocalLeads();
      res.json({ success: true, count: local.length, leads: local });
    } catch (err: any) {
      console.error('API /api/leads/local GET error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/leads/create', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const leadData = req.body.lead;
      const alreadySyncedToSheet = Boolean(req.body.alreadySyncedToSheet);
      if (!leadData) {
        return res.status(400).json({ success: false, error: 'Missing lead object in request body' });
      }
      const created = await createLead(leadData, token, spreadsheetId, alreadySyncedToSheet);
      res.json({ success: true, lead: created });
    } catch (err: any) {
      console.error('API /api/leads/create error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/leads/update', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const leadData = req.body.lead;
      const alreadySyncedToSheet = Boolean(req.body.alreadySyncedToSheet);
      if (!leadData || !leadData.leadId) {
        return res.status(400).json({ success: false, error: 'Missing lead object or leadId' });
      }
      const updated = await updateLead(leadData, token, spreadsheetId, alreadySyncedToSheet);
      res.json({ success: true, lead: updated });
    } catch (err: any) {
      console.error('API /api/leads/update error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/leads/batch', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const leadsData = req.body.leads;
      const alreadySyncedToSheet = Boolean(req.body.alreadySyncedToSheet);
      if (!Array.isArray(leadsData)) {
        return res.status(400).json({ success: false, error: 'Expected leads array' });
      }
      const created = await batchCreateLeads(leadsData, token, spreadsheetId, alreadySyncedToSheet);
      res.json({ success: true, count: created.length, leads: created });
    } catch (err: any) {
      console.error('API /api/leads/batch error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/leads/delete', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const { leadId } = req.body;
      const alreadySyncedToSheet = Boolean(req.body.alreadySyncedToSheet);
      if (!leadId) {
        return res.status(400).json({ success: false, error: 'Missing leadId' });
      }
      const deleted = await deleteLead(leadId, token, spreadsheetId, alreadySyncedToSheet);
      res.json({ success: true, deleted });
    } catch (err: any) {
      console.error('API /api/leads/delete error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Campaigns CRUD & Workflow Graph Persistence Endpoints ---

  app.post('/api/campaigns/list', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const campaigns = await listCampaigns(token, spreadsheetId);
      res.json({ success: true, campaigns });
    } catch (err: any) {
      console.error('API /api/campaigns/list error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get(['/api/campaigns', '/api/campaigns/list'], async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const campaigns = await listCampaigns(token, spreadsheetId);
      res.json({ success: true, campaigns });
    } catch (err: any) {
      console.error('API /api/campaigns list GET error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/campaigns/save', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const campaign = req.body.campaign;
      if (!campaign || !campaign.id) {
        return res.status(400).json({ success: false, error: 'Missing campaign or campaign.id' });
      }
      const saved = await saveCampaign(campaign, token, spreadsheetId);
      res.json({ success: true, campaign: saved });
    } catch (err: any) {
      console.error('API /api/campaigns/save error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/campaigns/delete', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const campaignId = req.body.campaignId;
      if (!campaignId) {
        return res.status(400).json({ success: false, error: 'Missing campaignId' });
      }
      const deleted = await deleteCampaign(campaignId, token, spreadsheetId);
      res.json({ success: true, deleted });
    } catch (err: any) {
      console.error('API /api/campaigns/delete error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/campaigns/toggle-active', async (req, res) => {
    try {
      const { token, spreadsheetId } = getAuth(req);
      const { campaignId, isActive } = req.body;
      if (!campaignId || isActive === undefined) {
        return res.status(400).json({ success: false, error: 'Missing campaignId or isActive' });
      }
      const updated = await toggleCampaignActive(campaignId, Boolean(isActive), token, spreadsheetId);
      res.json({ success: true, campaign: updated });
    } catch (err: any) {
      console.error('API /api/campaigns/toggle-active error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Step 2: Server-Side File Import Endpoint ---

  app.post('/api/import/parse', async (req, res) => {
    try {
      const { filename, fileBase64, existingEmails, columnMapping } = req.body;
      if (!filename || !fileBase64) {
        return res.status(400).json({ success: false, error: 'Missing filename or fileBase64' });
      }

      // Strip data url prefix if present (e.g. data:text/csv;base64,...)
      const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanedBase64, 'base64');

      const result = parseFileBuffer(buffer, filename, existingEmails || [], columnMapping);
      res.json(result);
    } catch (err: any) {
      console.error('API /api/import/parse error:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to parse file' });
    }
  });

  // --- Step 4: Run Due Campaigns Job Endpoint ---

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

  app.get('/api/settings', (_req, res) => {
    try {
      const settings = loadLocalSettings();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const updated = saveLocalSettings(req.body.settings || req.body);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Senders Persistence Endpoints ---

  app.get('/api/senders', (_req, res) => {
    try {
      const senders = loadLocalSenders();
      res.json({ success: true, senders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/senders', (req, res) => {
    try {
      const senders = saveLocalSenders(req.body.senders || []);
      res.json({ success: true, senders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Manual Tasks Queue Endpoints ---

  app.get('/api/tasks', (_req, res) => {
    try {
      const tasks = loadLocalTasks();
      res.json({ success: true, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tasks', (req, res) => {
    try {
      const tasks = saveLocalTasks(req.body.tasks || []);
      res.json({ success: true, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tasks/update', (req, res) => {
    try {
      const { taskId, updates } = req.body;
      const task = updateLocalTask(taskId, updates);
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- System Overview & Stats ---

  app.get('/api/system/stats', (_req, res) => {
    try {
      const stats = getSystemStatsSummary();
      res.json({ success: true, stats, trackingEventsCount: events.length });
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

      // Generate tracking pixel URL
      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;
      const trackingPixelHtml = `<img src="${baseUrl}/api/track/open?leadId=${encodeURIComponent(leadId || '')}&stage=${encodeURIComponent(stage || 1)}&campaign=${encodeURIComponent(campaign || 'default')}" width="1" height="1" style="display:none;" alt="" />`;

      const finalHtml = `${htmlBody || ''}\n${trackingPixelHtml}`;

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

  // --- Vite Middleware & Static Serving ---
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Outreach Flow server running on http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });

  // In production on Cloud Run, if PORT is not 3000, also bind port 3000 if available
  if (isProd && PORT !== 3000) {
    try {
      const secondaryServer = app.listen(3000, '0.0.0.0', () => {
        console.log(`Outreach Flow secondary listener running on http://0.0.0.0:3000`);
      });
      secondaryServer.on('error', (e: any) => {
        // Non-fatal if 3000 is occupied or restricted
        console.log('Port 3000 listener note:', e.message);
      });
    } catch {
      // ignore
    }
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
