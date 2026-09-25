import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

export const DEFAULT_MONGODB_URI = 'mongodb+srv://sahhityanaresh_db_user:test12345678@cluster0.zebcge8.mongodb.net/?appName=Cluster0';

// DIAGNOSTIC CHECK: Confirm 'mongodb' package import succeeded
const isMongoPackageLoaded = typeof MongoClient === 'function';
console.log(`[MongoDB Diagnostics] Step 1: Package "mongodb" module import check: ${isMongoPackageLoaded ? 'SUCCESS (MongoClient constructor is loaded)' : 'FAILED'}`);

export const COLLECTIONS = {
  LEADS: 'leads',
  CAMPAIGNS: 'campaigns',
  TASKS: 'tasks',
  SENDERS: 'senders',
  SETTINGS: 'settings',
  TRACKING_EVENTS: 'trackingEvents'
} as const;

export interface MongoStatusInfo {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  database: string;
  source: 'env_uri' | 'memory_server' | 'none';
  counts?: {
    leads: number;
    campaigns: number;
    tasks: number;
    senders: number;
    settings: number;
    trackingEvents: number;
  };
  error?: string;
  diagnostics?: {
    mongoPackageLoaded: boolean;
    hasMongoUri: boolean;
    uriLength?: number;
    nodeEnv?: string;
    isVercel?: boolean;
    errorName?: string;
    errorCode?: string | number;
    errorMessage?: string;
  };
}

interface MongoGlobalState {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
  db: Db | null;
  memoryServer?: any;
  uriSource: 'env_uri' | 'memory_server' | 'none';
  isSeeded: boolean;
  lastError?: {
    name: string;
    message: string;
    code?: string | number;
    codeName?: string;
    timestamp: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoGlobalState: MongoGlobalState | undefined;
}

const state: MongoGlobalState = global.__mongoGlobalState || {
  client: null,
  promise: null,
  db: null,
  uriSource: 'none',
  isSeeded: false
};

if (!global.__mongoGlobalState) {
  global.__mongoGlobalState = state;
}

/**
 * Initializes and caches MongoDB connection across hot serverless invocations.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (state.client && state.promise) {
    return state.promise;
  }

  if (state.promise) {
    return state.promise;
  }

  state.promise = (async () => {
    const rawUri = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
    const hasMongoUri = Boolean(rawUri && rawUri.length > 0);
    const uriLength = rawUri.length;

    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const isDevelopment = !isProduction && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.NODE_ENV === 'test');

    console.log('[MongoDB Diagnostics] ==========================================');
    console.log('[MongoDB Diagnostics] Connection attempt started.');
    console.log('[MongoDB Diagnostics] Step 1: Package "mongodb" module loaded:', isMongoPackageLoaded);
    console.log('[MongoDB Diagnostics] Step 2: Runtime environment inspection:', {
      hasMongoUri,
      uriLength,
      NODE_ENV: process.env.NODE_ENV || '(unset)',
      VERCEL: process.env.VERCEL || '(unset)',
      VERCEL_ENV: process.env.VERCEL_ENV || '(unset)',
      isProduction,
      isDevelopment
    });

    let uri = rawUri;
    let source: 'env_uri' | 'memory_server' | 'none' = 'none';

    if (uri) {
      if (/:\s*@/.test(uri)) {
        state.uriSource = 'none';
        const emptyPassErr = new Error('Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/...');
        (emptyPassErr as any).code = 'ERR_EMPTY_PASSWORD';
        state.lastError = {
          name: emptyPassErr.name,
          message: emptyPassErr.message,
          code: 'ERR_EMPTY_PASSWORD',
          timestamp: new Date().toISOString()
        };
        throw emptyPassErr;
      }
      source = 'env_uri';
      console.log(`[MongoDB Diagnostics] MONGODB_URI detected in environment (Length: ${uriLength} chars). Connecting via env URI.`);
    } else if (isDevelopment) {
      // Local development fallback: dynamically imported ONLY when MONGODB_URI is absent
      // and NODE_ENV is development. Never imported, required, or bundled in production.
      console.log('[MongoDB Diagnostics] MONGODB_URI not detected. Local development detected: attempting MongoMemoryServer fallback...');
      try {
        const memPackage = 'mongodb-memory-server';
        const { MongoMemoryServer } = await import(memPackage);
        if (!state.memoryServer) {
          state.memoryServer = await MongoMemoryServer.create({
            instance: { dbName: 'outreach_flow' }
          });
        }
        uri = state.memoryServer.getUri();
        source = 'memory_server';
        console.log(`[MongoDB Diagnostics] Initialized local dev memory server at: ${uri}`);
      } catch (err: any) {
        console.warn('[MongoDB Diagnostics] MongoMemoryServer not available in development:', err.message);
      }
    } else {
      console.error('[MongoDB Diagnostics] CRITICAL: Running in production/Vercel but MONGODB_URI is missing or empty!');
    }

    if (!uri) {
      state.uriSource = 'none';
      const missingUriErr = new Error('MONGODB_URI environment variable is required to connect to MongoDB in production.');
      (missingUriErr as any).code = 'ERR_MISSING_MONGODB_URI';
      state.lastError = {
        name: missingUriErr.name,
        message: missingUriErr.message,
        code: 'ERR_MISSING_MONGODB_URI',
        timestamp: new Date().toISOString()
      };
      throw missingUriErr;
    }

    state.uriSource = source;
    const dbName = process.env.MONGODB_DB_NAME || 'outreach_flow';

    console.log(`[MongoDB Diagnostics] Step 3: Instantiating MongoClient for database: "${dbName}"...`);
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    try {
      console.log('[MongoDB Diagnostics] Step 4: Calling client.connect()...');
      await client.connect();
      state.client = client;
      state.db = client.db(dbName);
      state.lastError = undefined;
      console.log(`[MongoDB Diagnostics] SUCCESS: Connected successfully to MongoDB database: "${dbName}" (source: ${source})`);

      // Ensure indexes and seed data if collections are empty
      await ensureIndexesAndSeed(state.db);

      return client;
    } catch (err: any) {
      console.error('[MongoDB Diagnostics] FAILED: client.connect() encountered an error!');
      console.error('[MongoDB Diagnostics] Error Name:', err?.name);
      console.error('[MongoDB Diagnostics] Error Message:', err?.message);
      console.error('[MongoDB Diagnostics] Error Code:', err?.code);
      console.error('[MongoDB Diagnostics] Error CodeName:', err?.codeName);
      if (err?.stack) {
        console.error('[MongoDB Diagnostics] Stack Trace:', err.stack);
      }
      state.lastError = {
        name: err?.name || 'Error',
        message: err?.message || 'Unknown connection error',
        code: err?.code,
        codeName: err?.codeName,
        timestamp: new Date().toISOString()
      };
      // Reset state.promise so subsequent calls can re-attempt rather than being locked
      state.promise = null;
      throw err;
    } finally {
      console.log('[MongoDB Diagnostics] ==========================================');
    }
  })().catch(err => {
    state.promise = null;
    throw err;
  });

  return state.promise;
}

/**
 * Retrieves the cached Db instance.
 */
export async function getDb(): Promise<Db> {
  if (state.db) {
    return state.db;
  }
  await getMongoClient();
  if (!state.db) {
    throw new Error('Failed to obtain MongoDB Db instance.');
  }
  return state.db;
}

/**
 * Ensures indexes exist on all collections and performs initial seeding if empty.
 */
async function ensureIndexesAndSeed(db: Db): Promise<void> {
  try {
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const tasksCol = db.collection(COLLECTIONS.TASKS);
    const sendersCol = db.collection(COLLECTIONS.SENDERS);
    const settingsCol = db.collection(COLLECTIONS.SETTINGS);
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);

    // 1. Create indexes with unique constraints
    await Promise.all([
      leadsCol.createIndex({ leadId: 1 }, { unique: true, name: 'idx_leads_leadId_unique' }).catch(() => {}),
      leadsCol.createIndex({ email: 1 }, { name: 'idx_leads_email' }).catch(() => {}),
      leadsCol.createIndex({ campaignId: 1 }, { name: 'idx_leads_campaignId' }).catch(() => {}),
      campaignsCol.createIndex({ id: 1 }, { unique: true, name: 'idx_campaigns_id_unique' }).catch(() => {}),
      tasksCol.createIndex({ id: 1 }, { unique: true, name: 'idx_tasks_id_unique' }).catch(() => {}),
      sendersCol.createIndex({ id: 1 }, { unique: true, name: 'idx_senders_id_unique' }).catch(() => {}),
      settingsCol.createIndex({ id: 1 }, { unique: true, name: 'idx_settings_id_unique' }).catch(() => {}),
      eventsCol.createIndex({ id: 1 }, { unique: true, name: 'idx_events_id_unique' }).catch(() => {}),
      eventsCol.createIndex({ leadId: 1 }, { name: 'idx_events_leadId' }).catch(() => {}),
      eventsCol.createIndex({ email: 1 }, { name: 'idx_events_email' }).catch(() => {})
    ]);

    // 2. Perform one-time migration / auto-seeding if collections are empty
    if (!state.isSeeded) {
      await autoSeedFromLocalData(db);
      state.isSeeded = true;
    }
  } catch (err: any) {
    console.error('[MongoDB] Error during index creation or seeding:', err);
  }
}

/**
 * Automatically seeds MongoDB collections from existing data_store JSON files if empty.
 */
export async function autoSeedFromLocalData(db: Db): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  const result: Record<string, number> = {
    leads: 0,
    campaigns: 0,
    tasks: 0,
    senders: 0,
    settings: 0,
    trackingEvents: 0
  };

  const dataDir = path.join(process.cwd(), 'data_store');
  const trackingFile = path.join(process.cwd(), 'tracking-events.json');

  // Leads
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const existingLeadsCount = await leadsCol.countDocuments();
  if (existingLeadsCount === 0) {
    const leadsFile = path.join(dataDir, 'leads.json');
    if (fs.existsSync(leadsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map(l => ({
            updateOne: {
              filter: { leadId: l.leadId },
              update: { $set: { ...l, updatedAt: new Date().toISOString() } },
              upsert: true
            }
          }));
          await leadsCol.bulkWrite(ops);
          result.leads = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} leads from data_store/leads.json`);
        }
      } catch (e: any) {
        console.warn('[MongoDB] Failed to parse leads.json for seeding:', e.message);
      }
    }
  }

  // Campaigns
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const existingCampaignsCount = await campaignsCol.countDocuments();
  if (existingCampaignsCount === 0) {
    const campFile = path.join(dataDir, 'campaigns.json');
    if (fs.existsSync(campFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(campFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map(c => ({
            updateOne: {
              filter: { id: c.id },
              update: {
                $set: {
                  ...c,
                  is_active: Boolean(c.is_active ?? c.isActive),
                  workflow_graph: c.workflow_graph || { nodes: c.nodes || [], edges: c.edges || [] },
                  updated_date: c.updated_date || new Date().toISOString()
                }
              },
              upsert: true
            }
          }));
          await campaignsCol.bulkWrite(ops);
          result.campaigns = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} campaigns from data_store/campaigns.json`);
        }
      } catch (e: any) {
        console.warn('[MongoDB] Failed to parse campaigns.json for seeding:', e.message);
      }
    }
  }

  // Senders
  const sendersCol = db.collection(COLLECTIONS.SENDERS);
  const existingSendersCount = await sendersCol.countDocuments();
  if (existingSendersCount === 0) {
    const sendersFile = path.join(dataDir, 'senders.json');
    if (fs.existsSync(sendersFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(sendersFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map(s => ({
            updateOne: {
              filter: { id: s.id },
              update: {
                $set: {
                  ...s,
                  provider: s.provider || 'outlook' // Default email provider is Outlook
                }
              },
              upsert: true
            }
          }));
          await sendersCol.bulkWrite(ops);
          result.senders = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} senders from data_store/senders.json`);
        }
      } catch (e: any) {
        console.warn('[MongoDB] Failed to parse senders.json for seeding:', e.message);
      }
    }
  }

  // Tasks
  const tasksCol = db.collection(COLLECTIONS.TASKS);
  const existingTasksCount = await tasksCol.countDocuments();
  if (existingTasksCount === 0) {
    const tasksFile = path.join(dataDir, 'tasks.json');
    if (fs.existsSync(tasksFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map(t => ({
            updateOne: {
              filter: { id: t.id },
              update: { $set: t },
              upsert: true
            }
          }));
          await tasksCol.bulkWrite(ops);
          result.tasks = raw.length;
        }
      } catch (e: any) {
        console.warn('[MongoDB] Failed to parse tasks.json for seeding:', e.message);
      }
    }
  }

  // Settings
  const settingsCol = db.collection(COLLECTIONS.SETTINGS);
  const existingSettingsCount = await settingsCol.countDocuments();
  if (existingSettingsCount === 0) {
    const settingsFile = path.join(dataDir, 'settings.json');
    let settingsDoc = {
      id: 'app_settings',
      spreadsheetId: '',
      spreadsheetName: 'Outreach Flow CRM',
      spreadsheetUrl: '',
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: 'Outreach Flow',
      senderEmail: 'connect@giniiris.ai',
      appName: 'Outreach Flow',
      updatedAt: new Date().toISOString()
    };

    if (fs.existsSync(settingsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
        settingsDoc = { ...settingsDoc, ...raw, id: 'app_settings' };
      } catch {
        // ignore
      }
    }

    await settingsCol.updateOne(
      { id: 'app_settings' },
      { $set: settingsDoc },
      { upsert: true }
    );
    result.settings = 1;
  }

  // Tracking Events
  const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
  const existingEventsCount = await eventsCol.countDocuments();
  if (existingEventsCount === 0 && fs.existsSync(trackingFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
      if (Array.isArray(raw) && raw.length > 0) {
        const ops = raw.map(ev => ({
          updateOne: {
            filter: { id: ev.id },
            update: { $set: ev },
            upsert: true
          }
        }));
        await eventsCol.bulkWrite(ops);
        result.trackingEvents = raw.length;
        console.log(`[MongoDB] Auto-seeded ${raw.length} tracking events from tracking-events.json`);
      }
    } catch (e: any) {
      console.warn('[MongoDB] Failed to parse tracking-events.json for seeding:', e.message);
    }
  }

  return { seeded: true, counts: result };
}

/**
 * Returns connection diagnostic status for UI indicator and health monitoring.
 */
export async function getMongoStatus(): Promise<MongoStatusInfo> {
  try {
    const db = await getDb();
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const tasksCol = db.collection(COLLECTIONS.TASKS);
    const sendersCol = db.collection(COLLECTIONS.SENDERS);
    const settingsCol = db.collection(COLLECTIONS.SETTINGS);
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);

    const [leads, campaigns, tasks, senders, settings, trackingEvents] = await Promise.all([
      leadsCol.countDocuments().catch(() => 0),
      campaignsCol.countDocuments().catch(() => 0),
      tasksCol.countDocuments().catch(() => 0),
      sendersCol.countDocuments().catch(() => 0),
      settingsCol.countDocuments().catch(() => 0),
      eventsCol.countDocuments().catch(() => 0)
    ]);

    return {
      connected: true,
      status: 'connected',
      database: db.databaseName,
      source: state.uriSource,
      counts: {
        leads,
        campaigns,
        tasks,
        senders,
        settings,
        trackingEvents
      },
      diagnostics: {
        mongoPackageLoaded: isMongoPackageLoaded,
        hasMongoUri: Boolean((process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim().length > 0),
        uriLength: (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim().length,
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL === '1')
      }
    };
  } catch (err: any) {
    const effectiveUri = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
    const hasMongoUri = Boolean(effectiveUri.length > 0);
    return {
      connected: false,
      status: 'error',
      database: '',
      source: state.uriSource,
      error: err.message || 'Unable to connect to MongoDB',
      diagnostics: {
        mongoPackageLoaded: isMongoPackageLoaded,
        hasMongoUri,
        uriLength: effectiveUri.length,
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL === '1'),
        errorName: err?.name || state.lastError?.name,
        errorCode: err?.code || state.lastError?.code,
        errorMessage: err?.message || state.lastError?.message
      }
    };
  }
}

/**
 * Dynamically tests and updates the active MongoDB connection URI.
 */
export async function updateMongoUri(newUri: string): Promise<{ success: boolean; error?: string; database?: string; code?: any }> {
  const trimmed = newUri.trim();
  if (!trimmed) {
    return { success: false, error: 'URI cannot be empty' };
  }

  // Check for empty password pattern e.g. :@ in URI
  if (/:\s*@/.test(trimmed)) {
    return { 
      success: false, 
      error: 'Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/...' 
    };
  }

  const testClient = new MongoClient(trimmed, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    await testClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'outreach_flow';
    const testDb = testClient.db(dbName);
    await testDb.command({ ping: 1 });
    
    // Verify read/write permission on actual collection
    await testDb.collection('settings').findOne({});

    // Close previous client if any
    if (state.client) {
      try { await state.client.close(); } catch {}
    }

    state.client = testClient;
    state.db = testDb;
    state.promise = Promise.resolve(testClient);
    state.uriSource = 'env_uri';
    state.lastError = undefined;

    process.env.MONGODB_URI = trimmed;

    try {
      const envPath = path.join(process.cwd(), '.env');
      fs.writeFileSync(envPath, `MONGODB_URI="${trimmed}"\nMONGODB_DB_NAME="${dbName}"\n`, 'utf-8');
    } catch (e) {
      console.warn('Could not write to .env:', e);
    }

    await ensureIndexesAndSeed(testDb);

    return { success: true, database: dbName };
  } catch (err: any) {
    try { await testClient.close(); } catch {}
    return {
      success: false,
      error: err.message || 'Connection failed',
      code: err.code
    };
  }
}
