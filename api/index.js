// server/app.ts
import express from "express";
import { MongoClient as MongoClient2 } from "mongodb";

// server/mongodb.ts
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import dns from "dns";
dotenv.config({ override: true });
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {
}
var DEFAULT_MONGODB_URI = "mongodb+srv://sahhityanaresh_db_user:test12345678@cluster0.zebcge8.mongodb.net/?appName=Cluster0";
var isMongoPackageLoaded = typeof MongoClient === "function";
console.log(`[MongoDB Diagnostics] Step 1: Package "mongodb" module import check: ${isMongoPackageLoaded ? "SUCCESS (MongoClient constructor is loaded)" : "FAILED"}`);
var COLLECTIONS = {
  LEADS: "leads",
  CAMPAIGNS: "campaigns",
  TASKS: "tasks",
  SENDERS: "senders",
  SETTINGS: "settings",
  TRACKING_EVENTS: "trackingEvents",
  GRAPH_SUBSCRIPTIONS: "graph_subscriptions",
  INBOUND_REPLIES: "inbound_replies"
};
var state = global.__mongoGlobalState || {
  client: null,
  promise: null,
  db: null,
  uriSource: "none",
  isSeeded: false
};
if (!global.__mongoGlobalState) {
  global.__mongoGlobalState = state;
}
async function getMongoClient() {
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
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    const isDevelopment = !isProduction && (process.env.NODE_ENV === "development" || !process.env.NODE_ENV || process.env.NODE_ENV === "test");
    console.log("[MongoDB Diagnostics] ==========================================");
    console.log("[MongoDB Diagnostics] Connection attempt started.");
    console.log('[MongoDB Diagnostics] Step 1: Package "mongodb" module loaded:', isMongoPackageLoaded);
    console.log("[MongoDB Diagnostics] Step 2: Runtime environment inspection:", {
      hasMongoUri,
      uriLength,
      NODE_ENV: process.env.NODE_ENV || "(unset)",
      VERCEL: process.env.VERCEL || "(unset)",
      VERCEL_ENV: process.env.VERCEL_ENV || "(unset)",
      isProduction,
      isDevelopment
    });
    let uri = rawUri;
    let source = "none";
    if (uri) {
      if (/:\s*@/.test(uri)) {
        state.uriSource = "none";
        const emptyPassErr = new Error("Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/...");
        emptyPassErr.code = "ERR_EMPTY_PASSWORD";
        state.lastError = {
          name: emptyPassErr.name,
          message: emptyPassErr.message,
          code: "ERR_EMPTY_PASSWORD",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        throw emptyPassErr;
      }
      source = "env_uri";
      console.log(`[MongoDB Diagnostics] MONGODB_URI detected in environment (Length: ${uriLength} chars). Connecting via env URI.`);
    } else if (isDevelopment) {
      console.log("[MongoDB Diagnostics] MONGODB_URI not detected. Local development detected: attempting MongoMemoryServer fallback...");
      try {
        const memPackage = "mongodb-memory-server";
        const { MongoMemoryServer } = await import(memPackage);
        if (!state.memoryServer) {
          state.memoryServer = await MongoMemoryServer.create({
            instance: { dbName: "outreach_flow" }
          });
        }
        uri = state.memoryServer.getUri();
        source = "memory_server";
        console.log(`[MongoDB Diagnostics] Initialized local dev memory server at: ${uri}`);
      } catch (err) {
        console.warn("[MongoDB Diagnostics] MongoMemoryServer not available in development:", err.message);
      }
    } else {
      console.error("[MongoDB Diagnostics] CRITICAL: Running in production/Vercel but MONGODB_URI is missing or empty!");
    }
    if (!uri) {
      state.uriSource = "none";
      const missingUriErr = new Error("MONGODB_URI environment variable is required to connect to MongoDB in production.");
      missingUriErr.code = "ERR_MISSING_MONGODB_URI";
      state.lastError = {
        name: missingUriErr.name,
        message: missingUriErr.message,
        code: "ERR_MISSING_MONGODB_URI",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      throw missingUriErr;
    }
    state.uriSource = source;
    const dbName = process.env.MONGODB_DB_NAME || "outreach_flow";
    console.log(`[MongoDB Diagnostics] Step 3: Instantiating MongoClient for database: "${dbName}"...`);
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5e3,
      connectTimeoutMS: 1e4
    });
    try {
      console.log("[MongoDB Diagnostics] Step 4: Calling client.connect()...");
      await client.connect();
      state.client = client;
      state.db = client.db(dbName);
      state.lastError = void 0;
      console.log(`[MongoDB Diagnostics] SUCCESS: Connected successfully to MongoDB database: "${dbName}" (source: ${source})`);
      await ensureIndexesAndSeed(state.db);
      return client;
    } catch (err) {
      console.error("[MongoDB Diagnostics] FAILED: client.connect() encountered an error!");
      console.error("[MongoDB Diagnostics] Error Name:", err?.name);
      console.error("[MongoDB Diagnostics] Error Message:", err?.message);
      console.error("[MongoDB Diagnostics] Error Code:", err?.code);
      console.error("[MongoDB Diagnostics] Error CodeName:", err?.codeName);
      if (err?.stack) {
        console.error("[MongoDB Diagnostics] Stack Trace:", err.stack);
      }
      state.lastError = {
        name: err?.name || "Error",
        message: err?.message || "Unknown connection error",
        code: err?.code,
        codeName: err?.codeName,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      state.promise = null;
      throw err;
    } finally {
      console.log("[MongoDB Diagnostics] ==========================================");
    }
  })().catch((err) => {
    state.promise = null;
    throw err;
  });
  return state.promise;
}
async function getDb() {
  if (state.db) {
    return state.db;
  }
  await getMongoClient();
  if (!state.db) {
    throw new Error("Failed to obtain MongoDB Db instance.");
  }
  return state.db;
}
async function ensureIndexesAndSeed(db) {
  try {
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
    const tasksCol = db.collection(COLLECTIONS.TASKS);
    const sendersCol = db.collection(COLLECTIONS.SENDERS);
    const settingsCol = db.collection(COLLECTIONS.SETTINGS);
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    await Promise.all([
      leadsCol.createIndex({ leadId: 1 }, { unique: true, name: "idx_leads_leadId_unique" }).catch(() => {
      }),
      leadsCol.createIndex({ email: 1 }, { name: "idx_leads_email" }).catch(() => {
      }),
      leadsCol.createIndex({ campaignId: 1 }, { name: "idx_leads_campaignId" }).catch(() => {
      }),
      campaignsCol.createIndex({ id: 1 }, { unique: true, name: "idx_campaigns_id_unique" }).catch(() => {
      }),
      tasksCol.createIndex({ id: 1 }, { unique: true, name: "idx_tasks_id_unique" }).catch(() => {
      }),
      sendersCol.createIndex({ id: 1 }, { unique: true, name: "idx_senders_id_unique" }).catch(() => {
      }),
      settingsCol.createIndex({ id: 1 }, { unique: true, name: "idx_settings_id_unique" }).catch(() => {
      }),
      eventsCol.createIndex({ id: 1 }, { unique: true, name: "idx_events_id_unique" }).catch(() => {
      }),
      eventsCol.createIndex({ leadId: 1 }, { name: "idx_events_leadId" }).catch(() => {
      }),
      eventsCol.createIndex({ email: 1 }, { name: "idx_events_email" }).catch(() => {
      })
    ]);
    if (!state.isSeeded) {
      await autoSeedFromLocalData(db);
      state.isSeeded = true;
    }
  } catch (err) {
    console.error("[MongoDB] Error during index creation or seeding:", err);
  }
}
async function autoSeedFromLocalData(db) {
  const result = {
    leads: 0,
    campaigns: 0,
    tasks: 0,
    senders: 0,
    settings: 0,
    trackingEvents: 0
  };
  const dataDir = path.join(process.cwd(), "data_store");
  const trackingFile = path.join(process.cwd(), "tracking-events.json");
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const existingCampaignsCount = await campaignsCol.countDocuments();
  if (existingCampaignsCount === 0) {
    const campFile = path.join(dataDir, "campaigns.json");
    if (fs.existsSync(campFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(campFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((c) => ({
            updateOne: {
              filter: { id: c.id },
              update: {
                $set: {
                  ...c,
                  is_active: Boolean(c.is_active ?? c.isActive),
                  workflow_graph: c.workflow_graph || { nodes: c.nodes || [], edges: c.edges || [] },
                  updated_date: c.updated_date || (/* @__PURE__ */ new Date()).toISOString()
                }
              },
              upsert: true
            }
          }));
          await campaignsCol.bulkWrite(ops);
          result.campaigns = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} campaigns from data_store/campaigns.json`);
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse campaigns.json for seeding:", e.message);
      }
    }
  }
  const sendersCol = db.collection(COLLECTIONS.SENDERS);
  const existingSendersCount = await sendersCol.countDocuments();
  if (existingSendersCount === 0) {
    const sendersFile = path.join(dataDir, "senders.json");
    if (fs.existsSync(sendersFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(sendersFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((s) => ({
            updateOne: {
              filter: { id: s.id },
              update: {
                $set: {
                  ...s,
                  provider: s.provider || "outlook"
                  // Default email provider is Outlook
                }
              },
              upsert: true
            }
          }));
          await sendersCol.bulkWrite(ops);
          result.senders = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} senders from data_store/senders.json`);
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse senders.json for seeding:", e.message);
      }
    }
  }
  const tasksCol = db.collection(COLLECTIONS.TASKS);
  const existingTasksCount = await tasksCol.countDocuments();
  if (existingTasksCount === 0) {
    const tasksFile = path.join(dataDir, "tasks.json");
    if (fs.existsSync(tasksFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tasksFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((t) => ({
            updateOne: {
              filter: { id: t.id },
              update: { $set: t },
              upsert: true
            }
          }));
          await tasksCol.bulkWrite(ops);
          result.tasks = raw.length;
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse tasks.json for seeding:", e.message);
      }
    }
  }
  const settingsCol = db.collection(COLLECTIONS.SETTINGS);
  const existingSettingsCount = await settingsCol.countDocuments();
  if (existingSettingsCount === 0) {
    const settingsFile = path.join(dataDir, "settings.json");
    let settingsDoc = {
      id: "app_settings",
      spreadsheetId: "",
      spreadsheetName: "Outreach Flow CRM",
      spreadsheetUrl: "",
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: "Outreach Flow",
      senderEmail: "connect@giniiris.ai",
      appName: "Outreach Flow",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (fs.existsSync(settingsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
        settingsDoc = { ...settingsDoc, ...raw, id: "app_settings" };
      } catch {
      }
    }
    await settingsCol.updateOne(
      { id: "app_settings" },
      { $set: settingsDoc },
      { upsert: true }
    );
    result.settings = 1;
  }
  const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
  const existingEventsCount = await eventsCol.countDocuments();
  if (existingEventsCount === 0 && fs.existsSync(trackingFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(trackingFile, "utf-8"));
      if (Array.isArray(raw) && raw.length > 0) {
        const ops = raw.map((ev) => ({
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
    } catch (e) {
      console.warn("[MongoDB] Failed to parse tracking-events.json for seeding:", e.message);
    }
  }
  return { seeded: true, counts: result };
}
async function getMongoStatus() {
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
      status: "connected",
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
        isVercel: Boolean(process.env.VERCEL === "1")
      }
    };
  } catch (err) {
    const effectiveUri = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();
    const hasMongoUri = Boolean(effectiveUri.length > 0);
    return {
      connected: false,
      status: "error",
      database: "",
      source: state.uriSource,
      error: err.message || "Unable to connect to MongoDB",
      diagnostics: {
        mongoPackageLoaded: isMongoPackageLoaded,
        hasMongoUri,
        uriLength: effectiveUri.length,
        nodeEnv: process.env.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL === "1"),
        errorName: err?.name || state.lastError?.name,
        errorCode: err?.code || state.lastError?.code,
        errorMessage: err?.message || state.lastError?.message
      }
    };
  }
}
async function updateMongoUri(newUri) {
  const trimmed = newUri.trim();
  if (!trimmed) {
    return { success: false, error: "URI cannot be empty" };
  }
  if (/:\s*@/.test(trimmed)) {
    return {
      success: false,
      error: "Password cannot be empty. Please include your database user password: mongodb+srv://<username>:<password>@cluster0.zebcge8.mongodb.net/..."
    };
  }
  const testClient = new MongoClient(trimmed, {
    serverSelectionTimeoutMS: 5e3,
    connectTimeoutMS: 5e3
  });
  try {
    await testClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || "outreach_flow";
    const testDb = testClient.db(dbName);
    await testDb.command({ ping: 1 });
    await testDb.collection("settings").findOne({});
    if (state.client) {
      try {
        await state.client.close();
      } catch {
      }
    }
    state.client = testClient;
    state.db = testDb;
    state.promise = Promise.resolve(testClient);
    state.uriSource = "env_uri";
    state.lastError = void 0;
    process.env.MONGODB_URI = trimmed;
    try {
      const envPath = path.join(process.cwd(), ".env");
      fs.writeFileSync(envPath, `MONGODB_URI="${trimmed}"
MONGODB_DB_NAME="${dbName}"
`, "utf-8");
    } catch (e) {
      console.warn("Could not write to .env:", e);
    }
    await ensureIndexesAndSeed(testDb);
    return { success: true, database: dbName };
  } catch (err) {
    try {
      await testClient.close();
    } catch {
    }
    return {
      success: false,
      error: err.message || "Connection failed",
      code: err.code
    };
  }
}

// server/mongoBackend.ts
async function listLeads(token, spreadsheetId) {
  const db = await getDb();
  const leads = await db.collection(COLLECTIONS.LEADS).find({}, { projection: { _id: 0 } }).toArray();
  return leads.map((l) => ({
    ...l,
    campaign: l.campaign && l.campaign.trim() ? l.campaign.trim() : "Default",
    campaignId: l.campaignId || ""
  }));
}
async function getNextLeadId() {
  const db = await getDb();
  const leads = await db.collection(COLLECTIONS.LEADS).find({}, { projection: { leadId: 1 } }).toArray();
  let maxNum = 100;
  for (const l of leads) {
    const match = String(l.leadId || "").match(/LEAD-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return `LEAD-${maxNum + 1}`;
}
async function createLead(leadData) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const cleanEmail = (leadData.email || "").trim().toLowerCase();
  const rawId = (leadData.leadId || "").trim();
  if (cleanEmail) {
    const existing = await col.findOne({ email: cleanEmail }, { projection: { _id: 0 } });
    if (existing) {
      const updatedDoc = {
        ...existing,
        ...leadData,
        leadId: existing.leadId,
        currentStage: typeof leadData.currentStage === "number" ? leadData.currentStage : 0,
        status: leadData.status || "Active",
        lastEmailSentDate: leadData.lastEmailSentDate || "",
        nextSendDate: leadData.nextSendDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        threadId: leadData.threadId || "",
        opensCount: typeof leadData.opensCount === "number" ? leadData.opensCount : 0,
        clicksCount: typeof leadData.clicksCount === "number" ? leadData.clicksCount : 0,
        firstOpenedDate: leadData.firstOpenedDate || "",
        lastOpenedDate: leadData.lastOpenedDate || "",
        firstClickedDate: leadData.firstClickedDate || "",
        lastClickedDate: leadData.lastClickedDate || "",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await col.updateOne({ leadId: existing.leadId }, { $set: updatedDoc });
      try {
        await db.collection(COLLECTIONS.TASKS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { leadEmail: { $regex: `^${cleanEmail}$`, $options: "i" } }
          ]
        });
        await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({
          $or: [
            { leadId: existing.leadId },
            { email: { $regex: `^${cleanEmail}$`, $options: "i" } }
          ]
        });
      } catch (_) {
      }
      return updatedDoc;
    }
  }
  let finalLeadId = rawId;
  if (!finalLeadId || finalLeadId.includes("NaN") || finalLeadId.includes("undefined")) {
    finalLeadId = await getNextLeadId();
  }
  const existingById = await col.findOne({ leadId: finalLeadId });
  if (existingById) {
    finalLeadId = await getNextLeadId();
  }
  if (cleanEmail || finalLeadId) {
    try {
      const taskOr = [];
      const trackOr = [];
      if (finalLeadId) {
        taskOr.push({ leadId: finalLeadId });
        trackOr.push({ leadId: finalLeadId });
      }
      if (cleanEmail) {
        taskOr.push({ leadEmail: { $regex: `^${cleanEmail}$`, $options: "i" } });
        trackOr.push({ email: { $regex: `^${cleanEmail}$`, $options: "i" } });
      }
      if (taskOr.length > 0) await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskOr });
      if (trackOr.length > 0) await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackOr });
    } catch (_) {
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newLead = {
    leadId: finalLeadId,
    name: (leadData.name || "Prospect").trim(),
    email: (leadData.email || "").trim(),
    company: (leadData.company || "").trim(),
    painPoint: leadData.painPoint || "",
    currentStage: typeof leadData.currentStage === "number" ? leadData.currentStage : 0,
    status: leadData.status || "Active",
    lastEmailSentDate: leadData.lastEmailSentDate || "",
    nextSendDate: leadData.nextSendDate || now.split("T")[0],
    threadId: leadData.threadId || "",
    notes: leadData.notes || "",
    firstName: leadData.firstName || (leadData.name ? leadData.name.split(" ")[0] : ""),
    lastName: leadData.lastName || (leadData.name ? leadData.name.split(" ").slice(1).join(" ") : ""),
    jobTitle: leadData.jobTitle || "",
    linkedinUrl: leadData.linkedinUrl || "",
    industry: leadData.industry || "",
    campaign: leadData.campaign || "Default",
    opensCount: leadData.opensCount || 0,
    firstOpenedDate: leadData.firstOpenedDate || "",
    lastOpenedDate: leadData.lastOpenedDate || "",
    clicksCount: leadData.clicksCount || 0,
    firstClickedDate: leadData.firstClickedDate || "",
    lastClickedDate: leadData.lastClickedDate || "",
    currentNodeId: leadData.currentNodeId || "",
    campaignId: leadData.campaignId || "",
    nodeEnteredDate: leadData.nodeEnteredDate || "",
    senderUsed: leadData.senderUsed || "",
    createdAt: now,
    updatedAt: now
  };
  if (!newLead.campaignId && newLead.campaign && newLead.campaign !== "Default") {
    const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
      name: { $regex: new RegExp(`^${newLead.campaign.trim()}$`, "i") }
    });
    if (matchedCamp && (matchedCamp.id || matchedCamp._id)) {
      newLead.campaignId = matchedCamp.id || String(matchedCamp._id);
    }
  }
  await col.insertOne({ ...newLead });
  return newLead;
}
async function updateLead(leadData, token, spreadsheetId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  if (!leadData.leadId) {
    throw new Error("updateLead requires leadId");
  }
  const existing = await col.findOne({ leadId: leadData.leadId }, { projection: { _id: 0 } });
  if (!existing) {
    if (leadData.email) {
      const byEmail = await col.findOne({ email: leadData.email.trim().toLowerCase() }, { projection: { _id: 0 } });
      if (byEmail) {
        const merged = {
          ...byEmail,
          ...leadData,
          leadId: byEmail.leadId,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await col.updateOne({ leadId: byEmail.leadId }, { $set: merged });
        return merged;
      }
    }
    return createLead(leadData);
  }
  const updated = {
    ...existing,
    ...leadData,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await col.updateOne({ leadId: leadData.leadId }, { $set: updated });
  return updated;
}
async function deleteLead(leadId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const cleanId = leadId.trim();
  const existing = await col.findOne({ leadId: cleanId });
  const leadEmail = existing?.email?.trim().toLowerCase();
  const result = await col.deleteOne({ leadId: cleanId });
  try {
    const taskFilters = [
      { leadId: cleanId },
      { id: { $regex: cleanId, $options: "i" } }
    ];
    if (leadEmail) {
      taskFilters.push({ leadEmail: { $regex: `^${leadEmail}$`, $options: "i" } });
    }
    await db.collection(COLLECTIONS.TASKS).deleteMany({ $or: taskFilters });
  } catch (_) {
  }
  try {
    const trackingFilters = [
      { leadId: cleanId }
    ];
    if (leadEmail) {
      trackingFilters.push({ email: { $regex: `^${leadEmail}$`, $options: "i" } });
    }
    await db.collection(COLLECTIONS.TRACKING_EVENTS).deleteMany({ $or: trackingFilters });
  } catch (_) {
  }
  return result.deletedCount > 0;
}
async function batchCreateLeads(leadsData) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.LEADS);
  const createdOrUpdated = [];
  const allLeads = await col.find({}, { projection: { leadId: 1, email: 1 } }).toArray();
  let maxNum = 100;
  const existingEmailMap = /* @__PURE__ */ new Map();
  for (const l of allLeads) {
    if (l.email) existingEmailMap.set(l.email.trim().toLowerCase(), l.leadId);
    const m = String(l.leadId || "").match(/LEAD-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of leadsData) {
    const cleanEmail = (item.email || "").trim().toLowerCase();
    const existingLeadId = cleanEmail ? existingEmailMap.get(cleanEmail) : void 0;
    let targetLeadId = existingLeadId || (item.leadId || "").trim();
    if (!targetLeadId || targetLeadId.includes("NaN") || targetLeadId.includes("undefined")) {
      maxNum++;
      targetLeadId = `LEAD-${maxNum}`;
    }
    const leadDoc = {
      leadId: targetLeadId,
      name: (item.name || "Prospect").trim(),
      email: (item.email || "").trim(),
      company: (item.company || "").trim(),
      painPoint: item.painPoint || "",
      currentStage: typeof item.currentStage === "number" ? item.currentStage : 0,
      status: item.status || "Active",
      lastEmailSentDate: item.lastEmailSentDate || "",
      nextSendDate: item.nextSendDate || now.split("T")[0],
      threadId: item.threadId || "",
      notes: item.notes || "",
      firstName: item.firstName || (item.name ? item.name.split(" ")[0] : ""),
      lastName: item.lastName || (item.name ? item.name.split(" ").slice(1).join(" ") : ""),
      jobTitle: item.jobTitle || "",
      linkedinUrl: item.linkedinUrl || "",
      industry: item.industry || "",
      campaign: item.campaign || "Default",
      opensCount: item.opensCount || 0,
      firstOpenedDate: item.firstOpenedDate || "",
      lastOpenedDate: item.lastOpenedDate || "",
      clicksCount: item.clicksCount || 0,
      firstClickedDate: item.firstClickedDate || "",
      lastClickedDate: item.lastClickedDate || "",
      currentNodeId: item.currentNodeId || "",
      campaignId: item.campaignId || "",
      nodeEnteredDate: item.nodeEnteredDate || "",
      senderUsed: item.senderUsed || "",
      updatedAt: now
    };
    if (!leadDoc.campaignId && leadDoc.campaign && leadDoc.campaign !== "Default") {
      const matchedCamp = await db.collection(COLLECTIONS.CAMPAIGNS).findOne({
        name: { $regex: new RegExp(`^${leadDoc.campaign.trim()}$`, "i") }
      });
      if (matchedCamp && (matchedCamp.id || matchedCamp._id)) {
        leadDoc.campaignId = matchedCamp.id || String(matchedCamp._id);
      }
    }
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
async function listCampaigns(token, spreadsheetId) {
  const db = await getDb();
  const campaigns = await db.collection(COLLECTIONS.CAMPAIGNS).find({}, { projection: { _id: 0 } }).toArray();
  return campaigns;
}
async function saveCampaign(campaign) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  if (!campaign.id) {
    throw new Error("saveCampaign requires campaign id");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const doc = {
    id: campaign.id,
    name: campaign.name || "Untitled Campaign",
    description: campaign.description || "",
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
async function deleteCampaign(campaignId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const result = await col.deleteOne({ id: campaignId.trim() });
  return result.deletedCount > 0;
}
async function toggleCampaignActive(campaignId, isActive) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CAMPAIGNS);
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
async function loadLocalSenders() {
  const serviceAccount = (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || "").trim();
  const displayName = (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || "Microsoft Graph Service Mailbox").trim();
  const db = await getDb();
  let senders = await db.collection(COLLECTIONS.SENDERS).find({}, { projection: { _id: 0 } }).toArray();
  if (senders.length === 0) {
    const defaultSender = {
      id: "sender-primary",
      name: displayName,
      email: serviceAccount || "service-account@domain.com",
      avatarUrl: "",
      status: "connected",
      isPrimary: true,
      dailySendLimit: 500,
      sendsToday: 0,
      provider: "outlook",
      lastUsedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await db.collection(COLLECTIONS.SENDERS).insertOne(defaultSender);
    return [defaultSender];
  }
  if (serviceAccount) {
    return senders.map((s, idx) => {
      if (s.isPrimary || idx === 0) {
        return {
          ...s,
          name: displayName || s.name,
          email: serviceAccount,
          provider: "outlook",
          status: "connected"
        };
      }
      return {
        ...s,
        provider: s.provider || "outlook"
      };
    });
  }
  return senders.map((s) => ({
    ...s,
    provider: s.provider || "outlook"
  }));
}
async function saveLocalSenders(senders) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SENDERS);
  const normalized = senders.map((s) => ({
    ...s,
    provider: s.provider || "outlook"
  }));
  if (normalized.length > 0) {
    const ops = normalized.map((s) => ({
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
async function loadLocalTasks() {
  const db = await getDb();
  const tasks = await db.collection(COLLECTIONS.TASKS).find({}, { projection: { _id: 0 } }).toArray();
  return tasks;
}
async function saveLocalTasks(tasks) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  if (tasks.length > 0) {
    const ops = tasks.map((t) => ({
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
async function updateLocalTask(taskId, updates) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  await col.updateOne({ id: taskId }, { $set: updates });
  const updated = await col.findOne({ id: taskId }, { projection: { _id: 0 } });
  return updated;
}
async function deleteLocalTask(taskId) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TASKS);
  const result = await col.deleteOne({ id: taskId });
  return result.deletedCount > 0;
}
async function loadLocalSettings() {
  const db = await getDb();
  const settings = await db.collection(COLLECTIONS.SETTINGS).findOne({ id: "app_settings" }, { projection: { _id: 0 } });
  if (!settings) {
    return {
      id: "app_settings",
      spreadsheetName: "Outreach Flow CRM",
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: "Outreach Flow",
      senderEmail: "connect@giniiris.ai",
      appName: "Outreach Flow"
    };
  }
  return settings;
}
async function saveLocalSettings(settings) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SETTINGS);
  const doc = {
    ...settings,
    id: "app_settings",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await col.updateOne(
    { id: "app_settings" },
    { $set: doc },
    { upsert: true }
  );
  return doc;
}
async function loadTrackingEvents() {
  const db = await getDb();
  const events = await db.collection(COLLECTIONS.TRACKING_EVENTS).find({}, { projection: { _id: 0 } }).toArray();
  return events;
}
async function recordTrackingEvent(event) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TRACKING_EVENTS);
  await col.updateOne(
    { id: event.id },
    { $set: event },
    { upsert: true }
  );
  try {
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const filterConditions = [];
    if (event.leadId && event.leadId !== "TEST") {
      filterConditions.push({ leadId: event.leadId });
    }
    if (event.email) {
      filterConditions.push({ email: event.email });
    }
    if (filterConditions.length > 0) {
      const updateDoc = {
        $set: {
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...event.type === "open" ? { lastOpenedDate: event.timestamp } : { lastClickedDate: event.timestamp }
        },
        $inc: {
          ...event.type === "open" ? { opensCount: 1 } : { clicksCount: 1 }
        }
      };
      await leadsCol.updateOne({ $or: filterConditions }, updateDoc);
    }
  } catch (leadUpdateErr) {
    console.warn("Could not update lead engagement counters on tracking event:", leadUpdateErr);
  }
  return event;
}
async function clearAllTrackingEvents() {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.TRACKING_EVENTS);
  await col.deleteMany({});
  return true;
}
async function getSystemStatsSummary() {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const campaignsCol = db.collection(COLLECTIONS.CAMPAIGNS);
  const tasksCol = db.collection(COLLECTIONS.TASKS);
  const sendersCol = db.collection(COLLECTIONS.SENDERS);
  const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
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
    leadsCol.countDocuments({ status: "Active" }),
    leadsCol.countDocuments({ status: "Replied" }),
    campaignsCol.countDocuments(),
    campaignsCol.countDocuments({ is_active: true }),
    tasksCol.countDocuments(),
    tasksCol.countDocuments({ isCompleted: false }),
    sendersCol.countDocuments(),
    eventsCol.countDocuments({ type: "open" }),
    eventsCol.countDocuments({ type: "click" })
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
async function applyLeadReply(params) {
  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const cleanEmail = (params.leadEmail || params.from || "").trim().toLowerCase();
  const cleanThreadId = (params.threadId || "").trim();
  let matchedLead = null;
  if (cleanThreadId && !cleanThreadId.startsWith("graph-conv-")) {
    matchedLead = await leadsCol.findOne({ threadId: cleanThreadId }, { projection: { _id: 0 } });
  }
  if (!matchedLead && cleanEmail) {
    matchedLead = await leadsCol.findOne(
      { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      { projection: { _id: 0 } }
    );
  }
  const replyId = params.messageId || `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const receivedAt = params.receivedDateTime || (/* @__PURE__ */ new Date()).toISOString();
  const replyDoc = {
    id: replyId,
    leadEmail: cleanEmail || matchedLead?.email || "",
    leadId: matchedLead?.leadId,
    threadId: cleanThreadId || matchedLead?.threadId || "",
    from: params.from || cleanEmail,
    subject: params.subject || "Re: Outreach Flow follow-up",
    body: params.body || "",
    receivedDateTime: receivedAt,
    source: params.source || "Webhook"
  };
  try {
    const repliesCol = db.collection(COLLECTIONS.INBOUND_REPLIES);
    await repliesCol.updateOne(
      { id: replyId },
      { $set: replyDoc },
      { upsert: true }
    );
  } catch (err) {
    console.warn("[MongoDB] Could not persist inbound reply document:", err);
  }
  if (!matchedLead) {
    return {
      success: true,
      applied: false,
      reply: replyDoc,
      message: `No lead matched email "${cleanEmail}" or thread "${cleanThreadId}". Inbound reply stored.`
    };
  }
  const existingNotes = matchedLead.notes || "";
  const noteTag = `[Reply detected${params.source ? ` via ${params.source}` : ""}]`;
  const updatedNotes = existingNotes.includes(noteTag) ? existingNotes : existingNotes ? `${existingNotes} | ${noteTag}` : noteTag;
  const updateFields = {
    status: "Replied",
    hasReplied: true,
    hasUnreadReply: true,
    lastReplyReceivedDate: receivedAt,
    notes: updatedNotes,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await leadsCol.updateOne({ leadId: matchedLead.leadId }, { $set: updateFields });
  return {
    success: true,
    applied: true,
    lead: { ...matchedLead, ...updateFields },
    reply: replyDoc
  };
}

// server/importBackend.ts
import * as XLSX from "xlsx";
function normalizeHeader(h) {
  return String(h || "").toLowerCase().replace(/[_\-\s\.\(\)\/]+/g, "").trim();
}
function parseFileBuffer(buffer, filename, existingEmails = [], customMapping) {
  const existingSet = new Set(existingEmails.map((e) => e.trim().toLowerCase()));
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file does not contain any readable sheets.");
  }
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (!rawRows || rawRows.length < 2) {
    throw new Error("The uploaded file has no data rows (header or data missing).");
  }
  let headerIndex = 0;
  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const rowStr = rawRows[r].map((c) => normalizeHeader(String(c))).join(" ");
    if (rowStr.includes("email") || rowStr.includes("mail") || rowStr.includes("contact") || rowStr.includes("name") || rowStr.includes("lead")) {
      headerIndex = r;
      break;
    }
  }
  const headerRow = rawRows[headerIndex] || [];
  const rawHeaders = headerRow.map((col, idx) => {
    const str = String(col ?? "").trim();
    return str || `Column_${idx + 1}`;
  });
  const rawRowsObjects = [];
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c) => !c || String(c).trim() === "")) {
      continue;
    }
    const rowObj = {};
    rawHeaders.forEach((h, colIdx) => {
      rowObj[h] = r[colIdx] !== void 0 ? String(r[colIdx]).trim() : "";
    });
    rawRowsObjects.push(rowObj);
  }
  const colMap = {};
  const detectedHeadersDisplay = {};
  if (customMapping && Object.keys(customMapping).length > 0) {
    Object.entries(customMapping).forEach(([targetKey, mappedHeader]) => {
      if (!mappedHeader) return;
      const idx = rawHeaders.indexOf(mappedHeader);
      if (idx !== -1) {
        colMap[targetKey] = idx;
        detectedHeadersDisplay[targetKey] = mappedHeader;
        if (targetKey === "first_name") colMap["firstName"] = idx;
        if (targetKey === "firstName") colMap["first_name"] = idx;
        if (targetKey === "last_name") colMap["lastName"] = idx;
        if (targetKey === "lastName") colMap["last_name"] = idx;
        if (targetKey === "job_title") colMap["jobTitle"] = idx;
        if (targetKey === "jobTitle") colMap["job_title"] = idx;
        if (targetKey === "linkedin_url") colMap["linkedinUrl"] = idx;
        if (targetKey === "linkedinUrl") colMap["linkedin_url"] = idx;
        if (targetKey === "pain_point") colMap["painPoint"] = idx;
        if (targetKey === "painPoint") colMap["pain_point"] = idx;
      }
    });
  } else {
    headerRow.forEach((col, idx) => {
      const orig = String(col || "").trim();
      const norm = normalizeHeader(orig);
      if (["email", "emailaddress", "mail", "workemail", "contactemail", "e-mail", "electronicmail", "useremail"].includes(norm)) {
        if (colMap.email === void 0) {
          colMap.email = idx;
          detectedHeadersDisplay.email = orig;
        }
      } else if (["firstname", "first", "givenname", "fname"].includes(norm)) {
        if (colMap.firstName === void 0) {
          colMap.firstName = idx;
          detectedHeadersDisplay.firstName = orig;
        }
      } else if (["lastname", "last", "surname", "lname"].includes(norm)) {
        if (colMap.lastName === void 0) {
          colMap.lastName = idx;
          detectedHeadersDisplay.lastName = orig;
        }
      } else if (["name", "fullname", "contactname", "leadname", "prospect", "person", "prospectname"].includes(norm)) {
        if (colMap.name === void 0) {
          colMap.name = idx;
          detectedHeadersDisplay.name = orig;
        }
      } else if (["company", "companyname", "organization", "org", "business", "account", "firm", "targetfirm", "clientcompany"].includes(norm)) {
        if (colMap.company === void 0) {
          colMap.company = idx;
          detectedHeadersDisplay.company = orig;
        }
      } else if (["jobtitle", "title", "position", "role", "designation", "job"].includes(norm)) {
        if (colMap.jobTitle === void 0) {
          colMap.jobTitle = idx;
          detectedHeadersDisplay.jobTitle = orig;
        }
      } else if (["painpoint", "painpoints", "problem", "challenge", "challenges", "friction", "frictionpoint", "bottleneck", "issues"].includes(norm)) {
        if (colMap.painPoint === void 0) {
          colMap.painPoint = idx;
          detectedHeadersDisplay.painPoint = orig;
        }
      } else if (["linkedin", "linkedinurl", "linkedinprofile", "profileurl", "social"].includes(norm)) {
        if (colMap.linkedinUrl === void 0) {
          colMap.linkedinUrl = idx;
          detectedHeadersDisplay.linkedinUrl = orig;
        }
      } else if (["industry", "sector", "vertical", "domain"].includes(norm)) {
        if (colMap.industry === void 0) {
          colMap.industry = idx;
          detectedHeadersDisplay.industry = orig;
        }
      } else if (["campaign", "campaignname", "list", "tag", "tags"].includes(norm)) {
        if (colMap.campaign === void 0) {
          colMap.campaign = idx;
          detectedHeadersDisplay.campaign = orig;
        }
      } else if (["notes", "note", "comments", "comment", "description", "memo"].includes(norm)) {
        if (colMap.notes === void 0) {
          colMap.notes = idx;
          detectedHeadersDisplay.notes = orig;
        }
      }
    });
  }
  const missingRequired = [];
  if (colMap.email === void 0) {
    missingRequired.push("email");
  }
  const autoMapped = missingRequired.length === 0;
  const parsedRows = [];
  const seenInBatch = /* @__PURE__ */ new Set();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || r.length === 0 || r.every((c) => !c || String(c).trim() === "")) {
      continue;
    }
    const getVal = (field) => {
      if (colMap[field] !== void 0 && r[colMap[field]] !== void 0) {
        return String(r[colMap[field]]).trim();
      }
      return "";
    };
    let email = getVal("email").toLowerCase();
    let firstName = getVal("firstName");
    let lastName = getVal("lastName");
    let fullName = getVal("name");
    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && !firstName && !lastName) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
    const company = getVal("company") || "Prospective Company";
    const jobTitle = getVal("jobTitle");
    const linkedinUrl = getVal("linkedinUrl");
    const painPoint = getVal("painPoint") || "Optimizing team outreach & qualification";
    const industry = getVal("industry");
    const notes = getVal("notes");
    const campaign = getVal("campaign") || "Direct Inbound";
    let isValid = true;
    let validationError = void 0;
    let isDuplicate = false;
    let duplicateReason = void 0;
    if (colMap.email === void 0) {
      isValid = false;
      validationError = 'Required column "Email Address" not detected in file headers (manual mapping required)';
    } else if (!email) {
      isValid = false;
      validationError = "Missing email address";
    } else if (!emailRegex.test(email)) {
      isValid = false;
      validationError = `Invalid email syntax: "${email}"`;
    } else if (existingSet.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Already exists in Leads database (${email})`;
    } else if (seenInBatch.has(email)) {
      isDuplicate = true;
      isValid = false;
      duplicateReason = `Duplicate within this file (${email})`;
    } else {
      seenInBatch.add(email);
    }
    parsedRows.push({
      rowNumber: i + 1,
      firstName,
      lastName,
      name: fullName || "Prospect",
      email,
      company,
      jobTitle,
      linkedinUrl,
      painPoint,
      industry,
      notes,
      campaign,
      isValid,
      validationError,
      isDuplicate,
      duplicateReason
    });
  }
  const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
  const duplicateRows = parsedRows.filter((r) => r.isDuplicate);
  const errorRows = parsedRows.filter((r) => !r.isValid && !r.isDuplicate);
  return {
    success: true,
    filename,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    duplicateCount: duplicateRows.length,
    errorCount: errorRows.length,
    rawHeaders,
    rawRows: rawRowsObjects,
    headersDetected: detectedHeadersDisplay,
    detectedHeaderList: rawHeaders,
    missingRequired,
    autoMapped,
    preview: parsedRows.slice(0, 15),
    leads: parsedRows,
    allRows: parsedRows,
    validRows,
    duplicateRows,
    errorRows,
    invalidRows: errorRows
  };
}

// server/msGraphAuth.ts
function getGraphConfig() {
  return {
    tenantId: (process.env.MICROSOFT_GRAPH_TENANT_ID || "").trim(),
    clientId: (process.env.MICROSOFT_GRAPH_CLIENT_ID || "").trim(),
    clientSecret: (process.env.MICROSOFT_GRAPH_CLIENT_SECRET || "").trim(),
    serviceAccount: (process.env.MICROSOFT_GRAPH_SERVICE_ACCOUNT || "").trim(),
    displayName: (process.env.MICROSOFT_GRAPH_DISPLAY_NAME || "Outreach Flow").trim()
  };
}
var cachedToken = null;
var tokenFetchPromise = null;
async function getAppAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now + 3e5) {
    return cachedToken.accessToken;
  }
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }
  tokenFetchPromise = (async () => {
    try {
      const config = getGraphConfig();
      if (!config.tenantId) {
        throw new Error("MICROSOFT_GRAPH_TENANT_ID environment variable is missing.");
      }
      if (!config.clientId) {
        throw new Error("MICROSOFT_GRAPH_CLIENT_ID environment variable is missing.");
      }
      if (!config.clientSecret) {
        throw new Error("MICROSOFT_GRAPH_CLIENT_SECRET environment variable is missing.");
      }
      const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", config.clientId);
      params.append("client_secret", config.clientSecret);
      params.append("scope", "https://graph.microsoft.com/.default");
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { error_description: errorText };
        }
        const errorMsg = parsedError.error_description || parsedError.error || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`Microsoft Graph OAuth client credentials failed (${response.status}): ${errorMsg}`);
      }
      const data = await response.json();
      const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3599;
      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error("No access_token returned by Microsoft identity platform.");
      }
      cachedToken = {
        accessToken,
        expiresAt: Date.now() + expiresInSec * 1e3
      };
      return accessToken;
    } finally {
      tokenFetchPromise = null;
    }
  })();
  return tokenFetchPromise;
}
async function getAuthDiagnostics() {
  const config = getGraphConfig();
  const now = Date.now();
  const configured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );
  const tokenExpiresInSec = cachedToken && cachedToken.expiresAt > now ? Math.round((cachedToken.expiresAt - now) / 1e3) : 0;
  return {
    configured,
    tenantId: config.tenantId ? `${config.tenantId.substring(0, 8)}...` : "",
    clientId: config.clientId ? `${config.clientId.substring(0, 8)}...` : "",
    hasClientSecret: Boolean(config.clientSecret),
    serviceAccount: config.serviceAccount,
    displayName: config.displayName,
    hasCachedToken: Boolean(cachedToken && cachedToken.expiresAt > now),
    tokenExpiresInSec
  };
}

// src/data/defaultTemplates.ts
var DEFAULT_STAGE_TEMPLATES = [
  {
    stage: 1,
    name: "Introduction",
    purpose: "Who we are, company name, and what we do",
    defaultGapDays: 3,
    subject: "Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I noticed your work leading initiatives at {{company}}. I'm reaching out because we help growing teams resolve {{pain_point}} without hiring extra overhead or changing existing workflows.</p>
      <p style="margin: 0 0 14px 0;">Are you open to a brief 5-minute sync later this week to see how this compares to your current setup?</p>
      <p style="margin: 0 0 4px 0;">Best regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 2,
    name: "Value Proposition",
    purpose: "Why this email is worth reading",
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Following up on my note earlier. When companies tackle {{pain_point}}, they usually face two friction points: slow turnaround cycles and fragmented execution.</p>
      <p style="margin: 0 0 14px 0;">We created an automated framework that eliminates both within 14 days, saving teams roughly 12 hours every week per team member.</p>
      <p style="margin: 0 0 14px 0;">Would Tuesday or Thursday morning work for a quick walkthrough?</p>
      <p style="margin: 0 0 4px 0;">Cheers,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 3,
    name: "Proof & Case Study",
    purpose: "Case study / one-pager / deck, includes a hyperlink",
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Rather than just talking features, here is how a team facing {{pain_point}} solved it in practice:</p>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <tr>
          <td style="padding: 14px 18px;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #0f172a;">Customer Story: 3.4x faster resolution</p>
            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">How Apex Systems automated their bottleneck in under 3 weeks.</p>
            <a href="https://example.com/case-study" target="_blank" style="display: inline-block; color: #2563eb; text-decoration: underline; font-weight: 500; font-size: 14px;">View 1-Page Summary &rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0;">Would you find value in reviewing similar benchmarks for {{company}}?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 4,
    name: "Solution",
    purpose: "Addresses the lead's specific pain point(s)",
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">Thinking specifically about {{company}} and {{pain_point}} \u2014 here is how our tailored solution targets this challenge directly:</p>
      <p style="margin: 0 0 10px 0; padding-left: 10px; border-left: 3px solid #2563eb; color: #334155;">
        <strong>Direct Remediation:</strong> Automates routine verification, flags anomalies before delivery, and synchronizes updates in real time.
      </p>
      <p style="margin: 0 0 14px 0;">It plugs right into what you already use with no engineering lift needed on your side.</p>
      <p style="margin: 0 0 14px 0;">Does this align with your priorities this quarter?</p>
      <p style="margin: 0 0 4px 0;">Warm regards,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 5,
    name: "Pricing & Scope",
    purpose: 'High-level, framed as "to be discussed"',
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">A common question at this stage is investment and structure. We keep our engagement model flexible and tied directly to measurable outcomes.</p>
      <p style="margin: 0 0 14px 0;">Depending on the rollout scale for {{company}}, pricing is modular and can be shaped around your target ROI \u2014 to be discussed once we verify exact fit.</p>
      <p style="margin: 0 0 14px 0;">Do you have 10 minutes next Wednesday to review numbers and options together?</p>
      <p style="margin: 0 0 4px 0;">Best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 6,
    name: "Follow-up",
    purpose: "Re-references stages 1\u20133, for leads who've gone quiet",
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I know how packed schedules get. Circling back to my earlier notes on addressing {{pain_point}} at {{company}}.</p>
      <p style="margin: 0 0 14px 0;">Between the workflow automation we discussed and the verified results in our case study, I'm confident we could free up substantial bandwidth for your team.</p>
      <p style="margin: 0 0 14px 0;">If timing is tight right now, just let me know if next month is better.</p>
      <p style="margin: 0 0 4px 0;">Thanks,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  },
  {
    stage: 7,
    name: "Break-up",
    purpose: "Polite close-out, door left open for future contact",
    defaultGapDays: 3,
    subject: "Re: Quick question regarding {{company}}",
    bodyHtml: `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.5;">
  <tr>
    <td style="padding: 24px 28px;">
      <p style="margin: 0 0 14px 0;">Hi {{first_name}},</p>
      <p style="margin: 0 0 14px 0;">I haven't heard back, so I assume tackling {{pain_point}} isn't a priority for {{company}} right now \u2014 totally understandable.</p>
      <p style="margin: 0 0 14px 0;">This will be my last email. If things change down the road or you'd ever like to reconnect, my door is always open.</p>
      <p style="margin: 0 0 14px 0;">Wishing you and {{company}} continued success!</p>
      <p style="margin: 0 0 4px 0;">All the best,</p>
      <p style="margin: 0; font-weight: 600; color: #0f172a;">{{sender_name}}</p>
    </td>
  </tr>
</table>`
  }
];
function extractFirstName(fullName) {
  if (!fullName) return "there";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "there";
}
function renderEmailMergeTags(templateString, lead, senderName = "Our Team") {
  const firstName = lead.firstName || extractFirstName(lead.name || "");
  const lastName = lead.lastName || (lead.name ? lead.name.split(" ").slice(1).join(" ") : "");
  const company = lead.company || "your company";
  const painPoint = lead.painPoint || "workflow efficiency bottlenecks";
  const name = lead.name || (firstName ? `${firstName} ${lastName}`.trim() : "there");
  const jobTitle = lead.jobTitle || "team lead";
  const industry = lead.industry || "your industry";
  const linkedinUrl = lead.linkedinUrl || "";
  const campaign = lead.campaign || "";
  return templateString.replace(/\{\{\s*first_name\s*\}\}/gi, firstName).replace(/\{\{\s*last_name\s*\}\}/gi, lastName).replace(/\{\{\s*name\s*\}\}/gi, name).replace(/\{\{\s*company\s*\}\}/gi, company).replace(/\{\{\s*job_title\s*\}\}/gi, jobTitle).replace(/\{\{\s*industry\s*\}\}/gi, industry).replace(/\{\{\s*pain_point\s*\}\}/gi, painPoint).replace(/\{\{\s*linkedin_url\s*\}\}/gi, linkedinUrl).replace(/\{\{\s*campaign\s*\}\}/gi, campaign).replace(/\{\{\s*sender_name\s*\}\}/gi, senderName);
}

// server/urlHelper.ts
function getPublicBaseUrl(req) {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  const isProduction = process.env.NODE_ENV === "production" || isVercel;
  const envAppUrl = process.env.APP_URL?.trim();
  if (envAppUrl) {
    let clean = envAppUrl.replace(/\/+$/, "");
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    if (isProduction && clean.startsWith("http://")) {
      clean = clean.replace(/^http:\/\//, "https://");
    }
    return clean;
  }
  const vercelProjectProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProjectProd) {
    const clean = vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    return `https://${clean}`;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (isVercel && vercelUrl) {
    const clean = vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "");
    return `https://${clean}`;
  }
  if (req) {
    const forwardedHost = req.headers["x-forwarded-host"] || "";
    const hostHeader = req.get("host") || "";
    const host = forwardedHost.split(",")[0].trim() || hostHeader;
    if (isVercel && (!host || host.includes("localhost") || host.includes("127.0.0.1"))) {
      if (vercelProjectProd) {
        return `https://${vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
      }
      if (vercelUrl) {
        return `https://${vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
      }
    }
    if (host) {
      const forwardedProto = req.headers["x-forwarded-proto"] || "";
      const isHttps = isProduction || forwardedProto === "https" || req.protocol === "https";
      const proto = isHttps ? "https" : "http";
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }
  if (isVercel || isProduction) {
    if (vercelProjectProd) {
      return `https://${vercelProjectProd.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
    }
    if (vercelUrl) {
      return `https://${vercelUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "")}`;
    }
  }
  return "http://localhost:3000";
}

// server/msGraphService.ts
import crypto from "crypto";
function wrapLinksAndEmbedTrackingPixel(htmlContent, lead, stage, baseUrl) {
  const cleanBase = (baseUrl || getPublicBaseUrl()).replace(/\/+$/, "");
  const campaign = encodeURIComponent(lead.campaign || "Default");
  const leadId = encodeURIComponent(lead.leadId || "");
  const leadEmail = encodeURIComponent(lead.email || "");
  let modifiedHtml = htmlContent.replace(
    /<a\s+([^>]*?)href\s*=\s*(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
    (_match, pre, quote, originalUrl, post) => {
      if (originalUrl.includes("/api/track/click")) return _match;
      const clickTrackUrl = `${cleanBase}/api/track/click?url=${encodeURIComponent(originalUrl)}&leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}`;
      return `<a ${pre}href=${quote}${clickTrackUrl}${quote}${post}>`;
    }
  );
  const openTrackUrl = `${cleanBase}/api/track/open?leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}&t=${Date.now()}`;
  const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;
  if (modifiedHtml.includes("</body>")) {
    modifiedHtml = modifiedHtml.replace("</body>", `${pixelTag}</body>`);
  } else {
    modifiedHtml += `
${pixelTag}`;
  }
  return modifiedHtml;
}
async function sendAppEmail(params) {
  const config = getGraphConfig();
  const stage = params.stageNum || params.template.stage || 1;
  const effectiveSenderName = params.senderDisplayName || config.displayName || "Outreach Flow";
  const renderedSubject = renderEmailMergeTags(params.template.subject, params.lead, effectiveSenderName);
  const renderedBody = renderEmailMergeTags(params.template.bodyHtml, params.lead, effectiveSenderName);
  const finalHtmlBody = wrapLinksAndEmbedTrackingPixel(renderedBody, params.lead, stage, params.baseUrl);
  if (!config.serviceAccount || !config.tenantId || !config.clientId) {
    console.warn(
      `[MS Graph] Notice: Microsoft Graph credentials not configured in environment. Using development simulated send for ${params.lead.email}.`
    );
    const simulatedMsgId = `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const simulatedThreadId = params.lead.threadId || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      messageId: simulatedMsgId,
      threadId: simulatedThreadId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      to: params.lead.email,
      subject: renderedSubject,
      statusCode: 200
    };
  }
  const token = await getAppAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;
  const emailMessage = {
    message: {
      subject: renderedSubject,
      body: {
        contentType: "HTML",
        content: finalHtmlBody
      },
      toRecipients: [
        {
          emailAddress: {
            address: params.lead.email.trim(),
            name: params.lead.name || params.lead.firstName || params.lead.email.split("@")[0]
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: effectiveSenderName
        }
      }
    },
    saveToSentItems: true
  };
  if (params.lead.threadId && !params.lead.threadId.startsWith("graph-conv-")) {
    try {
      const threadCheckUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(params.lead.threadId)}'&$top=1&$orderby=sentDateTime desc&$select=id,internetMessageId,subject`;
      const threadRes = await fetch(threadCheckUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        const prevMsg = threadData.value?.[0];
        if (prevMsg?.internetMessageId) {
          emailMessage.message.internetMessageHeaders = [
            { name: "In-Reply-To", value: prevMsg.internetMessageId },
            { name: "References", value: prevMsg.internetMessageId }
          ];
        }
      }
    } catch (e) {
      console.warn("[MS Graph] Could not fetch previous message in conversation for threading headers:", e);
    }
  }
  const sendStartTime = new Date(Date.now() - 5e3);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(emailMessage)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { error: { message: errorText } };
    }
    const msg = parsedErr.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${msg}`);
  }
  const cleanLeadEmail = params.lead.email.trim().toLowerCase();
  let realMessageId = null;
  let realConversationId = null;
  async function querySentItems(attempt = 1) {
    try {
      const sinceISO = sendStartTime.toISOString();
      const queryUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$filter=sentDateTime ge ${encodeURIComponent(sinceISO)}&$orderby=sentDateTime desc&$top=5&$select=id,conversationId,subject,sentDateTime,toRecipients`;
      const sentRes = await fetch(queryUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const sentMessages = sentData.value || [];
        const exactMatch = sentMessages.find((msg) => {
          const recs = msg.toRecipients || [];
          const matchesTo = recs.some((r) => (r.emailAddress?.address || "").trim().toLowerCase() === cleanLeadEmail);
          const cleanSubject = (msg.subject || "").trim().toLowerCase();
          const cleanTarget = renderedSubject.trim().toLowerCase();
          return matchesTo && (cleanSubject === cleanTarget || cleanSubject.includes(cleanTarget) || cleanTarget.includes(cleanSubject));
        });
        if (exactMatch && exactMatch.conversationId) {
          realMessageId = exactMatch.id;
          realConversationId = exactMatch.conversationId;
          return;
        }
        const recipientMatch = sentMessages.find((msg) => {
          const recs = msg.toRecipients || [];
          return recs.some((r) => (r.emailAddress?.address || "").trim().toLowerCase() === cleanLeadEmail);
        });
        if (recipientMatch && recipientMatch.conversationId) {
          realMessageId = recipientMatch.id;
          realConversationId = recipientMatch.conversationId;
          return;
        }
      }
    } catch (err) {
      console.warn(`[MS Graph] Error querying Sent Items (attempt ${attempt}):`, err);
    }
    if (attempt === 1) {
      await new Promise((r) => setTimeout(r, 1500));
      await querySentItems(2);
    }
  }
  await querySentItems(1);
  const existingRealThreadId = params.lead.threadId && !params.lead.threadId.startsWith("graph-conv-") ? params.lead.threadId : null;
  let threadId = realConversationId || existingRealThreadId;
  let messageId = realMessageId;
  if (!threadId) {
    console.warn(
      `[MS Graph] Warning: Could not locate real conversationId in Sent Items for lead ${params.lead.email} ("${renderedSubject}"). Falling back to secondary sender-email reply matching.`
    );
    threadId = existingRealThreadId || `graph-conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
  if (!messageId) {
    messageId = `graph-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
  return {
    success: true,
    messageId,
    threadId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    to: params.lead.email,
    subject: renderedSubject,
    statusCode: response.status
  };
}
async function checkAppThreadForReply(params) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    return { hasReplied: false, reason: "Service account mailbox not configured" };
  }
  const cleanLeadEmail = (params.leadEmail || "").trim().toLowerCase();
  if (!cleanLeadEmail) {
    return { hasReplied: false, reason: "Missing lead email" };
  }
  const token = await getAppAccessToken();
  const serviceAccount = config.serviceAccount;
  if (params.threadId && !params.threadId.startsWith("graph-conv-")) {
    try {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(params.threadId)}'&$top=25&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const messages = data.value || [];
        messages.sort((a, b) => new Date(b.receivedDateTime || 0).getTime() - new Date(a.receivedDateTime || 0).getTime());
        for (const msg of messages) {
          const senderEmail = (msg.from?.emailAddress?.address || "").toLowerCase().trim();
          if (senderEmail === serviceAccount.toLowerCase()) {
            continue;
          }
          if (senderEmail === cleanLeadEmail || senderEmail.includes(cleanLeadEmail) || cleanLeadEmail.includes(senderEmail)) {
            if (params.lastSentDate) {
              const msgDate = new Date(msg.receivedDateTime).getTime();
              const sentDate = params.lastSentDate.includes("T") ? new Date(params.lastSentDate).getTime() : (/* @__PURE__ */ new Date(`${params.lastSentDate}T00:00:00Z`)).getTime();
              if (!isNaN(sentDate) && !isNaN(msgDate) && msgDate < sentDate - 6e4) {
                continue;
              }
            }
            return {
              hasReplied: true,
              reason: `Reply received from ${cleanLeadEmail} in conversation ${params.threadId}`,
              replyMessage: {
                id: msg.id,
                from: msg.from?.emailAddress?.address || cleanLeadEmail,
                subject: msg.subject || "",
                receivedDateTime: msg.receivedDateTime,
                bodyPreview: msg.bodyPreview
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn("[MS Graph] Conversation reply check failed:", err);
    }
  }
  try {
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=from/emailAddress/address eq '${encodeURIComponent(cleanLeadEmail)}'&$top=5&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const messages = data.value || [];
      for (const msg of messages) {
        if (params.lastSentDate) {
          const msgDate = new Date(msg.receivedDateTime).getTime();
          const sentDate = new Date(params.lastSentDate).getTime();
          if (msgDate < sentDate - 6e4) {
            continue;
          }
        }
        return {
          hasReplied: true,
          reason: `Reply message detected from prospect ${cleanLeadEmail}`,
          replyMessage: {
            id: msg.id,
            from: msg.from?.emailAddress?.address || cleanLeadEmail,
            subject: msg.subject || "",
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview
          }
        };
      }
    }
  } catch (err) {
    console.warn("[MS Graph] Direct sender reply check failed:", err);
  }
  return { hasReplied: false };
}
async function getAppConversationThread(threadId, leadEmail) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    return { messages: [], subject: "" };
  }
  const token = await getAppAccessToken();
  const serviceAccount = config.serviceAccount;
  const cleanLeadEmail = (leadEmail || "").trim().toLowerCase();
  let rawMessages = [];
  let threadSubject = "";
  if (threadId && !threadId.startsWith("graph-conv-")) {
    try {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(threadId)}'&$top=50&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,body,internetMessageId`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        rawMessages = data.value || [];
      } else {
        console.warn(`[MS Graph] Failed to query conversation messages for ${threadId}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("[MS Graph] Conversation messages query error:", err);
    }
  }
  if (rawMessages.length === 0 && cleanLeadEmail) {
    try {
      const fromUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=from/emailAddress/address eq '${encodeURIComponent(cleanLeadEmail)}'&$top=20&$select=id,conversationId,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,body,internetMessageId`;
      const fromRes = await fetch(fromUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (fromRes.ok) {
        const fromData = await fromRes.json();
        rawMessages = fromData.value || [];
      }
    } catch (err) {
      console.warn("[MS Graph] Fallback messages query error:", err);
    }
  }
  rawMessages.sort((a, b) => {
    const timeA = new Date(a.receivedDateTime || a.sentDateTime || 0).getTime();
    const timeB = new Date(b.receivedDateTime || b.sentDateTime || 0).getTime();
    return timeA - timeB;
  });
  const parsedMessages = rawMessages.map((msg) => {
    const fromAddress = (msg.from?.emailAddress?.address || "").trim();
    const fromName = msg.from?.emailAddress?.name || fromAddress;
    const fromFormatted = fromAddress ? fromName && fromName.toLowerCase() !== fromAddress.toLowerCase() ? `"${fromName}" <${fromAddress}>` : fromAddress : "";
    const toRecipients = msg.toRecipients || [];
    const toFormatted = toRecipients.map((r) => {
      const addr = r.emailAddress?.address || "";
      const name = r.emailAddress?.name || addr;
      return addr ? name && name.toLowerCase() !== addr.toLowerCase() ? `"${name}" <${addr}>` : addr : "";
    }).filter(Boolean).join(", ");
    const subject = msg.subject || "";
    if (!threadSubject && subject) threadSubject = subject;
    const date = msg.receivedDateTime || msg.sentDateTime || (/* @__PURE__ */ new Date()).toISOString();
    const cleanSender = fromAddress.toLowerCase();
    const isServiceAccount = cleanSender === serviceAccount.toLowerCase();
    const isFromLead = cleanLeadEmail ? cleanSender === cleanLeadEmail || !isServiceAccount : !isServiceAccount;
    const bodyHtml = msg.body?.contentType === "html" ? msg.body?.content : void 0;
    const bodyText = msg.body?.contentType === "text" ? msg.body?.content : msg.bodyPreview || "";
    return {
      id: msg.id,
      threadId: msg.conversationId || threadId || "",
      from: fromFormatted,
      to: toFormatted,
      date,
      subject,
      snippet: msg.bodyPreview || "",
      bodyHtml,
      bodyText,
      isFromLead,
      messageIdHeader: msg.internetMessageId || ""
    };
  });
  return {
    messages: parsedMessages,
    subject: threadSubject || (threadId ? `Conversation ${threadId}` : "Email Thread")
  };
}
function getServiceAccountProfile() {
  const config = getGraphConfig();
  const isConfigured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );
  return {
    serviceAccount: config.serviceAccount,
    displayName: config.displayName || "Service Account Mailbox",
    isConfigured,
    provider: "outlook"
  };
}
async function sendDirectTestEmail(to, customSubject, customBody) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    throw new Error("MICROSOFT_GRAPH_SERVICE_ACCOUNT environment variable is not configured.");
  }
  const token = await getAppAccessToken();
  const subject = customSubject || `Outreach Flow Test: App-Only Microsoft Graph Service Account [${(/* @__PURE__ */ new Date()).toLocaleTimeString()}]`;
  const bodyContent = customBody || `
    <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #2563eb;">Outreach Flow - Microsoft Graph Service Account Test</h2>
      <p>This email confirms that application-only (client credentials) authentication and mailbox sending are working properly.</p>
      <ul>
        <li><strong>Sending Mailbox:</strong> ${config.serviceAccount}</li>
        <li><strong>Display Name:</strong> ${config.displayName}</li>
        <li><strong>Timestamp:</strong> ${(/* @__PURE__ */ new Date()).toISOString()}</li>
      </ul>
      <p style="color: #64748b; font-size: 13px;">Sent automatically via Microsoft Graph POST /users/{serviceAccount}/sendMail.</p>
    </div>
  `;
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;
  const emailMessage = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: bodyContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: to.trim()
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: config.displayName
        }
      }
    },
    saveToSentItems: true
  };
  const sendStartTime = new Date(Date.now() - 5e3);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(emailMessage)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(`Test email failed (${response.status}): ${parsed.error?.message || errorText}`);
  }
  let capturedMessageId = null;
  let capturedConversationId = null;
  try {
    const queryUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$filter=sentDateTime ge ${encodeURIComponent(sendStartTime.toISOString())}&$orderby=sentDateTime desc&$top=3&$select=id,conversationId,subject,sentDateTime,toRecipients`;
    const sentRes = await fetch(queryUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (sentRes.ok) {
      const sentData = await sentRes.json();
      const match = (sentData.value || []).find(
        (m) => (m.toRecipients || []).some((r) => (r.emailAddress?.address || "").toLowerCase() === to.trim().toLowerCase())
      );
      if (match) {
        capturedMessageId = match.id;
        capturedConversationId = match.conversationId;
      }
    }
  } catch (lookupErr) {
    console.warn("[MS Graph] Direct test email SentItems lookup skipped:", lookupErr);
  }
  return {
    success: true,
    statusCode: response.status,
    sentTo: to,
    from: config.serviceAccount,
    messageId: capturedMessageId || void 0,
    conversationId: capturedConversationId || void 0,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getWebhookClientState() {
  return (process.env.MICROSOFT_GRAPH_CLIENT_STATE || process.env.GRAPH_WEBHOOK_CLIENT_STATE || "gini_graph_webhook_secret_key_2026").trim();
}
function verifyWebhookClientState(provided, expected) {
  const secret = expected || getWebhookClientState();
  if (!provided || !secret) return false;
  const bufProvided = Buffer.from(provided);
  const bufSecret = Buffer.from(secret);
  if (bufProvided.length !== bufSecret.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufSecret);
}
async function createGraphWebhookSubscription(customBaseUrl) {
  const config = getGraphConfig();
  const clientState = getWebhookClientState();
  const publicBase = (customBaseUrl || getPublicBaseUrl()).replace(/\/+$/, "");
  const notificationUrl = `${publicBase}/api/webhooks/graph`;
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1e3).toISOString();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.serviceAccount) {
    const mockSub = {
      id: `mock-sub-${Date.now()}`,
      subscriptionId: `mock-sub-${Date.now()}`,
      resource: `users/${config.serviceAccount || "service@example.com"}/mailFolders('Inbox')/messages`,
      changeType: "created",
      clientState,
      notificationUrl,
      expirationDateTime,
      createdAt: now,
      updatedAt: now,
      isMock: true
    };
    const db2 = await getDb().catch(() => null);
    if (db2) {
      await db2.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
        { id: mockSub.id },
        { $set: mockSub },
        { upsert: true }
      );
    }
    return mockSub;
  }
  const token = await getAppAccessToken();
  const endpoint = "https://graph.microsoft.com/v1.0/subscriptions";
  const subPayload = {
    changeType: "created",
    notificationUrl,
    resource: `users/${encodeURIComponent(config.serviceAccount)}/mailFolders('Inbox')/messages`,
    expirationDateTime,
    clientState
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(subPayload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(`Failed to create Microsoft Graph webhook subscription (${response.status}): ${parsed.error?.message || errorText}`);
  }
  const createdSub = await response.json();
  const record = {
    id: createdSub.id,
    subscriptionId: createdSub.id,
    resource: createdSub.resource,
    changeType: createdSub.changeType,
    notificationUrl: createdSub.notificationUrl,
    expirationDateTime: createdSub.expirationDateTime,
    clientState,
    createdAt: now,
    updatedAt: now
  };
  const db = await getDb().catch(() => null);
  if (db) {
    await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
      { id: record.id },
      { $set: record },
      { upsert: true }
    );
  }
  return record;
}
async function renewExpiringGraphSubscriptions(customBaseUrl) {
  const config = getGraphConfig();
  const hasCreds = Boolean(config.tenantId && config.clientId && config.clientSecret && config.serviceAccount);
  const db = await getDb().catch(() => null);
  const renewThresholdMs = 24 * 60 * 60 * 1e3;
  const now = Date.now();
  const newExpiration = new Date(now + 4200 * 60 * 1e3).toISOString();
  let storedSubs = [];
  if (db) {
    storedSubs = await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).find({}).toArray();
  }
  const renewedList = [];
  if (hasCreds) {
    try {
      const token = await getAppAccessToken();
      const listRes = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const liveSubs = listData.value || [];
        for (const sub of liveSubs) {
          const expTime = new Date(sub.expirationDateTime).getTime();
          if (expTime - now < renewThresholdMs) {
            const patchRes = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(sub.id)}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ expirationDateTime: newExpiration })
            });
            if (patchRes.ok) {
              const updated = await patchRes.json();
              renewedList.push({ ...updated, renewed: true });
              if (db) {
                await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne(
                  { id: sub.id },
                  { $set: { ...updated, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
                  { upsert: true }
                );
              }
            } else {
              console.warn(`[MS Graph] Failed to renew subscription ${sub.id}: HTTP ${patchRes.status}`);
            }
          } else {
            renewedList.push({ ...sub, renewed: false, reason: "Not yet nearing expiration" });
          }
        }
        if (liveSubs.length === 0) {
          const fresh = await createGraphWebhookSubscription(customBaseUrl);
          renewedList.push({ ...fresh, created: true });
        }
      }
    } catch (err) {
      console.warn("[MS Graph] Subscription renewal API call failed:", err);
    }
  } else {
    for (const sub of storedSubs) {
      const expTime = new Date(sub.expirationDateTime).getTime();
      if (expTime - now < renewThresholdMs) {
        const updated = { ...sub, expirationDateTime: newExpiration, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        if (db) {
          await db.collection(COLLECTIONS.GRAPH_SUBSCRIPTIONS).updateOne({ id: sub.id }, { $set: updated });
        }
        renewedList.push({ ...updated, renewed: true });
      } else {
        renewedList.push({ ...sub, renewed: false, reason: "Not yet nearing expiration" });
      }
    }
    if (storedSubs.length === 0) {
      const fresh = await createGraphWebhookSubscription(customBaseUrl);
      renewedList.push({ ...fresh, created: true });
    }
  }
  return renewedList;
}
async function fetchGraphMessageDetails(messageId) {
  const config = getGraphConfig();
  if (!config.serviceAccount) return null;
  try {
    const token = await getAppAccessToken();
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,body`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("[MS Graph] Failed to fetch message details for", messageId, err);
  }
  return null;
}
async function processGraphWebhookNotification(notification) {
  const expectedSecret = getWebhookClientState();
  if (!verifyWebhookClientState(notification.clientState, expectedSecret)) {
    throw new Error("Unauthorized: clientState does not match expected secret.");
  }
  let messageId = notification.resourceData?.id;
  if (!messageId && notification.resource) {
    const parts = notification.resource.split("/");
    messageId = parts[parts.length - 1];
  }
  let fromEmail = "";
  let fromName = "";
  let subject = notification.subject || "";
  let bodyPreview = notification.bodyPreview || "";
  let conversationId = notification.conversationId || "";
  let receivedDateTime = notification.receivedDateTime || (/* @__PURE__ */ new Date()).toISOString();
  if (notification.leadEmail || notification.from) {
    fromEmail = (notification.from || notification.leadEmail || "").trim().toLowerCase();
    subject = notification.subject || subject;
    bodyPreview = notification.body || notification.bodyPreview || bodyPreview;
    conversationId = notification.threadId || notification.conversationId || conversationId;
  } else if (messageId) {
    const msg = await fetchGraphMessageDetails(messageId);
    if (msg) {
      fromEmail = (msg.from?.emailAddress?.address || "").trim().toLowerCase();
      fromName = msg.from?.emailAddress?.name || "";
      subject = msg.subject || "";
      bodyPreview = msg.bodyPreview || (msg.body?.content ? msg.body.content.replace(/<[^>]+>/g, " ") : "");
      conversationId = msg.conversationId || "";
      receivedDateTime = msg.receivedDateTime || receivedDateTime;
    }
  }
  const config = getGraphConfig();
  if (config.serviceAccount && fromEmail.toLowerCase() === config.serviceAccount.toLowerCase()) {
    return { skipped: true, reason: "Outbound email sent by service account" };
  }
  const replyResult = await applyLeadReply({
    leadEmail: fromEmail,
    threadId: conversationId,
    messageId: messageId || `graph-msg-${Date.now()}`,
    subject,
    body: bodyPreview,
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
    receivedDateTime,
    source: "Microsoft Graph Webhook"
  });
  return replyResult;
}

// server/runnerBackend.ts
async function checkLeadForReply(lead, _token, _userEmail, _sender) {
  if (lead.status === "Replied") {
    return { hasReplied: true, reason: "Status already marked Replied" };
  }
  if (lead.hasReplied === true || lead.hasUnreadReply === true || lead.lastReplyReceivedDate) {
    return { hasReplied: true, reason: "Incoming reply flag detected on lead record" };
  }
  try {
    const res = await checkAppThreadForReply({
      leadEmail: lead.email,
      threadId: lead.threadId,
      lastSentDate: lead.lastEmailSentDate
    });
    if (res.hasReplied) {
      const fromInfo = res.replyMessage?.from ? ` (${res.replyMessage.from})` : "";
      return {
        hasReplied: true,
        reason: `Lead reply detected in Microsoft Graph service account mailbox${fromInfo}`
      };
    }
  } catch (err) {
    console.warn(`Error checking thread for reply on lead ${lead.email} via Graph:`, err);
  }
  return { hasReplied: false };
}
function isWithinSendingSchedule(schedule) {
  if (!schedule) return { allowed: true };
  const now = /* @__PURE__ */ new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const allowedDays = schedule.allowedDays || schedule.days;
  if (Array.isArray(allowedDays) && allowedDays.length > 0) {
    if (!allowedDays.includes(currentDay)) {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        allowed: false,
        reason: `Current day is ${dayNames[currentDay]}, which is outside allowed days [${allowedDays.map((d) => dayNames[d] || d).join(", ")}]`
      };
    }
  }
  if (typeof schedule.startHour === "number" && currentHour < schedule.startHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is earlier than allowed start hour (${schedule.startHour}:00)`
    };
  }
  if (typeof schedule.endHour === "number" && currentHour >= schedule.endHour) {
    return {
      allowed: false,
      reason: `Current hour (${currentHour}:00) is at or past allowed end hour (${schedule.endHour}:00)`
    };
  }
  return { allowed: true };
}
async function runDueCampaignsJob(targetCampaignId, token, spreadsheetId, userEmail) {
  const campaigns = await listCampaigns(token, spreadsheetId);
  const leads = await listLeads(token, spreadsheetId);
  const senders = await loadLocalSenders();
  const logs = [];
  let processedCount = 0;
  let emailsSent = 0;
  let tasksCreated = 0;
  let advancedCount = 0;
  const activeCampaigns = campaigns.filter((c) => {
    const isActive = Boolean(c.is_active ?? c.isActive);
    if (!isActive) {
      if (targetCampaignId && c.id === targetCampaignId) {
        logs.push(`Campaign "${c.name}" (ID: ${c.id}) is marked Inactive. Inactive campaigns are NEVER touched by this job.`);
      }
      return false;
    }
    if (targetCampaignId) return c.id === targetCampaignId;
    return true;
  });
  const inactiveCount = campaigns.filter((c) => !Boolean(c.is_active ?? c.isActive)).length;
  logs.push(`Found ${activeCampaigns.length} active campaign(s) to process. (${inactiveCount} inactive campaign(s) skipped).`);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const nowMs = Date.now();
  for (const campaign of activeCampaigns) {
    logs.push(`--- Evaluating Campaign: "${campaign.name}" (ID: ${campaign.id}) ---`);
    const graph = campaign.workflow_graph || { nodes: [], edges: [] };
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    if (nodes.length === 0) {
      logs.push(`Campaign "${campaign.name}" has no nodes configured in workflow canvas.`);
      continue;
    }
    const startNode = nodes.find((n) => n.data?.nodeType === "start" || n.type === "start" || n.type === "startNode");
    const campaignLeads = leads.filter((l) => {
      if (l.status === "Paused" || l.status === "Completed" || l.status === "Broke Up" || l.status === "Replied") {
        return false;
      }
      return l.campaignId === campaign.id || l.campaign === campaign.name;
    });
    logs.push(`Assigned leads found for "${campaign.name}": ${campaignLeads.length}`);
    for (const lead of campaignLeads) {
      processedCount++;
      let currentNode = nodes.find((n) => n.id === lead.currentNodeId);
      if (!currentNode) {
        if (startNode) {
          const firstEdge = edges.find((e) => e.source === startNode.id);
          if (firstEdge) {
            currentNode = nodes.find((n) => n.id === firstEdge.target);
          } else {
            currentNode = startNode;
          }
        } else if (nodes.length > 0) {
          currentNode = nodes[0];
        }
        if (currentNode) {
          lead.campaignId = campaign.id;
          lead.campaign = campaign.name;
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = todayStr;
          await updateLead(lead, token, spreadsheetId);
          logs.push(`Initialized lead ${lead.name} into node "${currentNode.data?.label || currentNode.id}".`);
        }
      }
      if (!currentNode) continue;
      let rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
      if (rawNodeType.endsWith("Node")) {
        rawNodeType = rawNodeType.replace("Node", "");
      }
      if (rawNodeType === "wait") {
        const waitDuration = currentNode.data?.waitDuration ?? currentNode.data?.waitDays ?? 1;
        const waitUnit = currentNode.data?.waitUnit || "days";
        const enteredDate = lead.nodeEnteredDate ? new Date(lead.nodeEnteredDate).getTime() : nowMs;
        let elapsed = 0;
        if (waitUnit === "hours") {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60 * 60));
        } else if (waitUnit === "minutes") {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60));
        } else {
          elapsed = Math.floor((nowMs - enteredDate) / (1e3 * 60 * 60 * 24));
        }
        if (elapsed >= waitDuration) {
          const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
          if (outgoingEdge2) {
            const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
            if (nextNode) {
              logs.push(
                `Wait period satisfied (${elapsed}/${waitDuration} ${waitUnit} elapsed) for ${lead.name}. Advancing from "${currentNode.data?.label || currentNode.id}" to next node: "${nextNode.data?.label || nextNode.id}".`
              );
              lead.currentNodeId = nextNode.id;
              lead.nodeEnteredDate = todayStr;
              currentNode = nextNode;
              rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
              if (rawNodeType.endsWith("Node")) {
                rawNodeType = rawNodeType.replace("Node", "");
              }
              advancedCount++;
            } else {
              logs.push(`Wait node "${currentNode.id}" has invalid target node. Halting.`);
              continue;
            }
          } else {
            logs.push(`Wait node "${currentNode.id}" has no outgoing edge. Halting.`);
            continue;
          }
        } else {
          logs.push(
            `Lead ${lead.name} is waiting in "${currentNode.data?.label || "Wait"}" (${elapsed}/${waitDuration} ${waitUnit} elapsed).`
          );
          continue;
        }
      }
      const leadSender = senders.find((s) => s.email === lead.senderUsed || s.id === lead.senderUsed) || senders.find((s) => s.isPrimary) || senders[0];
      const replyCheck = await checkLeadForReply(lead, token, userEmail, leadSender);
      if (replyCheck.hasReplied) {
        lead.status = "Replied";
        lead.notes = lead.notes ? `${lead.notes} | [Reply detected on ${todayStr}: ${replyCheck.reason}]` : `Reply detected on ${todayStr}: ${replyCheck.reason}`;
        await updateLead(lead, token, spreadsheetId);
        logs.push(
          `Reply check for lead ${lead.name} (${lead.email}): Reply detected! Pulled lead to "Needs Reply" (status: Replied) instead of sending.`
        );
        continue;
      }
      if (rawNodeType === "condition") {
        const conditionType = currentNode.data?.conditionType || "has_replied";
        let conditionMet = false;
        if (conditionType === "has_replied") {
          conditionMet = lead.status === "Replied";
        } else if (conditionType === "email_opened") {
          conditionMet = (lead.opensCount || 0) > 0;
        } else if (conditionType === "link_clicked") {
          conditionMet = (lead.clicksCount || 0) > 0;
        }
        const handleId = conditionMet ? "yes" : "no";
        const branchEdge = edges.find(
          (e) => e.source === currentNode.id && (e.sourceHandle === handleId || !e.sourceHandle)
        );
        if (branchEdge) {
          const nextNode = nodes.find((n) => n.id === branchEdge.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            await updateLead(lead, token, spreadsheetId);
            advancedCount++;
            logs.push(
              `Condition "${conditionType}" evaluated to ${conditionMet ? "YES" : "NO"} for ${lead.name}. Routed to "${nextNode.data?.label || nextNode.id}".`
            );
          }
        }
        continue;
      }
      if (rawNodeType === "manual_task" || rawNodeType === "manualTask") {
        const localTasks = await loadLocalTasks();
        const existingTask = localTasks.find(
          (t) => t.nodeId === currentNode.id && (t.leadId === lead.leadId || !t.leadId && t.leadEmail && lead.email && t.leadEmail.toLowerCase() === lead.email.toLowerCase())
        );
        if (!existingTask) {
          tasksCreated++;
          const firstName = lead.firstName || lead.name?.split(" ")[0] || lead.name || "prospect";
          const rawTitle = currentNode.data?.taskTitle || currentNode.data?.label || "Call {{first_name}}";
          const rawDesc = currentNode.data?.taskDescription || "Direct outreach call regarding {{pain_point}}";
          const title = rawTitle.replace(/\{\{first_name\}\}/gi, firstName).replace(/\{\{name\}\}/gi, lead.name || "").replace(/\{\{company\}\}/gi, lead.company || "").replace(/\{\{pain_point\}\}/gi, lead.painPoint || "");
          const instruction = rawDesc.replace(/\{\{first_name\}\}/gi, firstName).replace(/\{\{name\}\}/gi, lead.name || "").replace(/\{\{company\}\}/gi, lead.company || "").replace(/\{\{pain_point\}\}/gi, lead.painPoint || "");
          const newTask = {
            id: `task-${Date.now()}-${lead.leadId}`,
            leadId: lead.leadId,
            leadName: lead.name,
            leadEmail: lead.email,
            leadCompany: lead.company,
            campaignId: campaign.id,
            nodeId: currentNode.id,
            title,
            instruction,
            type: currentNode.data?.taskType || "call",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isCompleted: false
          };
          localTasks.push(newTask);
          await saveLocalTasks(localTasks);
          lead.currentNodeId = currentNode.id;
          lead.nodeEnteredDate = todayStr;
          await updateLead(lead, token, spreadsheetId);
          logs.push(`Generated Manual Task for ${lead.name}: "${title}". Sequence paused until completed in Tasks tab.`);
          continue;
        }
        if (!existingTask.isCompleted) {
          logs.push(`Waiting for manual task completion: "${existingTask.title}" for ${lead.name}. Sequence paused.`);
          continue;
        }
        const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge2) {
          const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            advancedCount++;
            logs.push(`Manual Task "${existingTask.title}" completed. Advanced ${lead.name} to "${nextNode.data?.label || nextNode.id}".`);
            await updateLead(lead, token, spreadsheetId);
            currentNode = nextNode;
            rawNodeType = currentNode.data?.nodeType || currentNode.type || "";
            if (rawNodeType.endsWith("Node")) {
              rawNodeType = rawNodeType.replace("Node", "");
            }
          }
        }
      }
      if (rawNodeType === "email") {
        const senderId = startNode?.data?.senderId || currentNode.data?.senderId || currentNode.data?.senderEmail || "sender-primary";
        const sender = senders.find((s) => s.id === senderId || s.email === senderId) || senders.find((s) => s.isPrimary) || senders[0];
        if (sender) {
          const dailyLimit = typeof sender.dailySendLimit === "number" ? sender.dailySendLimit : 150;
          const sendsToday = typeof sender.sendsToday === "number" ? sender.sendsToday : 0;
          if (sendsToday >= dailyLimit) {
            logs.push(
              `Connected sender "${sender.name}" (${sender.email}) has reached daily send limit (${sendsToday}/${dailyLimit}). Postponing send for ${lead.name}.`
            );
            continue;
          }
        }
        const allowedSchedule = startNode?.data?.schedule;
        const scheduleCheck = isWithinSendingSchedule(allowedSchedule);
        if (!scheduleCheck.allowed) {
          logs.push(
            `Outside Schedule node's window for campaign "${campaign.name}": ${scheduleCheck.reason}. Postponing send for ${lead.name}.`
          );
          continue;
        }
        if (lead.lastEmailSentDate === todayStr) {
          logs.push(`Lead ${lead.name} already received an email today (${todayStr}). Skipping duplicate send.`);
          continue;
        }
        const stageNum = currentNode.data?.templateStage || lead.currentStage + 1;
        const sendFromAccount = sender ? sender.email : currentNode.data?.senderEmail || userEmail || "Default Inbox";
        const template = DEFAULT_STAGE_TEMPLATES.find((t) => t.stage === stageNum) || DEFAULT_STAGE_TEMPLATES[0];
        const baseUrl = getPublicBaseUrl();
        try {
          const sendResult = await sendAppEmail({
            lead,
            template,
            stageNum,
            senderDisplayName: sender?.name,
            baseUrl
          });
          lead.threadId = sendResult.threadId;
        } catch (sendErr) {
          logs.push(`Email dispatch to ${lead.name} failed via Graph: ${sendErr.message}. Skipping advance.`);
          continue;
        }
        if (sender) {
          sender.sendsToday = (sender.sendsToday || 0) + 1;
          sender.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
          await saveLocalSenders(senders);
        }
        emailsSent++;
        lead.lastEmailSentDate = todayStr;
        lead.senderUsed = sendFromAccount;
        lead.currentStage = stageNum;
        const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge2) {
          const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            advancedCount++;
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}) from "${sender?.name || sendFromAccount}". Advanced to next node: "${nextNode.data?.label || nextNode.id}".`
            );
          } else {
            lead.status = "Completed";
            logs.push(
              `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
            );
          }
        } else {
          lead.status = "Completed";
          logs.push(
            `Dispatched Email Stage ${stageNum} to ${lead.name} (${lead.email}). End of sequence reached; marked "Completed".`
          );
        }
        await updateLead(lead, token, spreadsheetId);
        continue;
      }
      const outgoingEdge = edges.find((e) => e.source === currentNode.id);
      if (outgoingEdge) {
        const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
        if (nextNode) {
          lead.currentNodeId = nextNode.id;
          lead.nodeEnteredDate = todayStr;
          await updateLead(lead, token, spreadsheetId);
          advancedCount++;
          logs.push(`Transitioned ${lead.name} from "${currentNode.data?.label || currentNode.id}" to "${nextNode.data?.label || nextNode.id}".`);
        }
      }
    }
  }
  return {
    success: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    activeCampaignsCount: activeCampaigns.length,
    processedLeadsCount: processedCount,
    emailsSentCount: emailsSent,
    tasksCreatedCount: tasksCreated,
    advancedNodesCount: advancedCount,
    logs
  };
}

// server/app.ts
var app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var TRANSPARENT_GIF_1X1 = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);
function computeStatsByLead(evts) {
  const stats = {};
  for (const ev of evts) {
    if (!ev.leadId && !ev.email) continue;
    const primaryKey = ev.leadId || ev.email || "";
    if (!stats[primaryKey]) {
      stats[primaryKey] = {
        opensCount: 0,
        clicksCount: 0,
        events: []
      };
    }
    const item = stats[primaryKey];
    item.events.push(ev);
    if (ev.type === "open") {
      item.opensCount++;
      if (!item.firstOpenedDate || new Date(ev.timestamp) < new Date(item.firstOpenedDate)) {
        item.firstOpenedDate = ev.timestamp;
      }
      if (!item.lastOpenedDate || new Date(ev.timestamp) > new Date(item.lastOpenedDate)) {
        item.lastOpenedDate = ev.timestamp;
      }
    } else if (ev.type === "click") {
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
var getAuth = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
  const spreadsheetId = req.headers["x-spreadsheet-id"] || req.body?.spreadsheetId || req.query?.spreadsheetId;
  return { token, spreadsheetId };
};
app.get("/api/health", async (_req, res) => {
  const mongo = await getMongoStatus();
  res.json({
    status: "ok",
    database: "mongodb",
    connected: mongo.connected,
    mongo
  });
});
app.get("/api/mongodb/status", async (_req, res) => {
  try {
    const status = await getMongoStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});
app.get("/api/mongodb/test-atlas", async (req, res) => {
  const customUri = req.query.uri || "";
  const variations = customUri ? [{ name: "custom", uri: customUri }] : [
    {
      name: "Original with appName",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?appName=Cluster0"
    },
    {
      name: "With dbName in path (outreach_flow)",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/outreach_flow?retryWrites=true&w=majority&appName=Cluster0"
    },
    {
      name: "With authSource=admin",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&appName=Cluster0"
    },
    {
      name: "With authMechanism=SCRAM-SHA-1",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-1"
    },
    {
      name: "With authMechanism=SCRAM-SHA-256",
      uri: "mongodb+srv://sahhityanaresh_db_user:outreachconnect@cluster0.zebcge8.mongodb.net/?authSource=admin&authMechanism=SCRAM-SHA-256"
    }
  ];
  const results = [];
  for (const item of variations) {
    const testClient = new MongoClient2(item.uri, {
      serverSelectionTimeoutMS: 3e3,
      connectTimeoutMS: 3e3
    });
    try {
      await testClient.connect();
      const ping = await testClient.db("admin").command({ ping: 1 });
      results.push({
        name: item.name,
        success: true,
        ping
      });
      await testClient.close();
      break;
    } catch (e) {
      results.push({
        name: item.name,
        success: false,
        error: e.message,
        code: e.code,
        codeName: e.codeName
      });
      try {
        await testClient.close();
      } catch {
      }
    }
  }
  res.json({ results });
});
app.post("/api/mongodb/update-uri", async (req, res) => {
  const { uri } = req.body || {};
  if (!uri || typeof uri !== "string") {
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
app.post("/api/mongodb/migrate", async (_req, res) => {
  try {
    const db = await getDb();
    const result = await autoSeedFromLocalData(db);
    const status = await getMongoStatus();
    res.json({ success: true, result, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function isInternalAppRequest(req) {
  const referer = (req.headers["referer"] || req.headers["referrer"] || "").toString().toLowerCase();
  const origin = (req.headers["origin"] || "").toString().toLowerCase();
  const source = referer || origin;
  if (!source) return false;
  const host = (req.headers["host"] || "").toString().toLowerCase();
  const xForwardedHost = (req.headers["x-forwarded-host"] || "").toString().toLowerCase();
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
    } catch (_) {
    }
  }
  if (source.includes("localhost") || source.includes("127.0.0.1")) {
    return true;
  }
  return false;
}
var handleOpenTracking = async (req, res) => {
  const leadId = (req.query.leadId || req.params.leadId || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || req.params.stage || "1").toString(), 10) || 1;
  const campaign = (req.query.campaign || "default").toString();
  const isInternal = isInternalAppRequest(req);
  if (!isInternal && (leadId || email)) {
    const newEvent = {
      id: `open-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "open",
      leadId: leadId || email,
      email: email || void 0,
      stage,
      campaign,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || ""
    };
    try {
      await recordTrackingEvent(newEvent);
    } catch (err) {
      console.error("Failed to record open event:", err);
    }
  }
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF_1X1.length.toString(),
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });
  res.end(TRANSPARENT_GIF_1X1);
};
app.get("/api/track/open", handleOpenTracking);
app.get("/api/track/open/:leadId", handleOpenTracking);
app.get("/api/track/open/:leadId/:stage", handleOpenTracking);
app.get("/api/track/click", async (req, res) => {
  const targetUrl = (req.query.url || "https://example.com").toString();
  const leadId = (req.query.leadId || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || "1").toString(), 10) || 1;
  const campaign = (req.query.campaign || "default").toString();
  const isInternal = isInternalAppRequest(req);
  if (!isInternal && (leadId || email)) {
    const newEvent = {
      id: `click-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: "click",
      leadId: leadId || email,
      email: email || void 0,
      stage,
      campaign,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      targetUrl,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || ""
    };
    try {
      await recordTrackingEvent(newEvent);
    } catch (err) {
      console.error("Failed to record click event:", err);
    }
  }
  res.redirect(302, targetUrl);
});
app.post("/api/track/reset-lead", async (req, res) => {
  try {
    const { leadId, email } = req.body;
    if (!leadId && !email) {
      return res.status(400).json({ success: false, error: "leadId or email is required" });
    }
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanLeadId = (leadId || "").toString().trim();
    const db = await getDb();
    const eventsCol = db.collection(COLLECTIONS.TRACKING_EVENTS);
    const leadsCol = db.collection(COLLECTIONS.LEADS);
    const filter = [];
    if (cleanLeadId) {
      filter.push({ leadId: cleanLeadId });
    }
    if (cleanEmail) {
      const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      filter.push({ email: emailRegex });
      filter.push({ leadId: emailRegex });
    }
    const deletedEvents = await eventsCol.deleteMany({ $or: filter });
    const updatedLeads = await leadsCol.updateMany(
      { $or: filter },
      {
        $set: {
          opensCount: 0,
          clicksCount: 0,
          firstOpenedDate: "",
          lastOpenedDate: "",
          firstClickedDate: "",
          lastClickedDate: "",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    res.json({
      success: true,
      message: "Tracking reset successfully for lead",
      deletedEvents: deletedEvents.deletedCount,
      updatedLeads: updatedLeads.modifiedCount
    });
  } catch (err) {
    console.error("API /api/track/reset-lead error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/track/debug", async (req, res) => {
  try {
    const leadId = (req.query.leadId || "").toString().trim();
    if (!leadId) {
      return res.status(400).json({ success: false, error: "leadId is required" });
    }
    const allEvents = await loadTrackingEvents();
    const leadEvents = allEvents.filter(
      (e) => e.leadId === leadId || e.email && e.email.toLowerCase() === leadId.toLowerCase()
    );
    leadEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latest20 = leadEvents.slice(0, 20).map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      userAgent: e.userAgent || ""
    }));
    res.json({
      success: true,
      leadId,
      totalEvents: leadEvents.length,
      events: latest20
    });
  } catch (err) {
    console.error("API /api/track/debug error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/track/events", async (_req, res) => {
  try {
    const events = await loadTrackingEvents();
    const statsByLead = computeStatsByLead(events);
    res.json({
      success: true,
      totalOpens: events.filter((e) => e.type === "open").length,
      totalClicks: events.filter((e) => e.type === "click").length,
      events,
      statsByLead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/track/event", async (req, res) => {
  try {
    const { type, leadId, stage, campaign, targetUrl } = req.body;
    if (!type || !leadId) {
      return res.status(400).json({ error: "Missing type or leadId" });
    }
    const newEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: type === "click" ? "click" : "open",
      leadId,
      stage: stage || 1,
      campaign: campaign || "default",
      targetUrl,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userAgent: req.headers["user-agent"] || "manual"
    };
    const saved = await recordTrackingEvent(newEvent);
    res.json({ success: true, event: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/track/clear", async (_req, res) => {
  try {
    await clearAllTrackingEvents();
    res.json({ success: true, message: "All tracking events cleared" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all(["/api/leads", "/api/leads/list", "/api/leads/local"], async (_req, res) => {
  try {
    const leads = await listLeads();
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    console.error("API /api/leads/list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/create", async (req, res) => {
  try {
    const leadData = req.body.lead;
    if (!leadData) {
      return res.status(400).json({ success: false, error: "Missing lead object in request body" });
    }
    const created = await createLead(leadData);
    res.json({ success: true, lead: created });
  } catch (err) {
    console.error("API /api/leads/create error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/update", async (req, res) => {
  try {
    const leadData = req.body.lead;
    if (!leadData || !leadData.leadId) {
      return res.status(400).json({ success: false, error: "Missing lead object or leadId" });
    }
    const updated = await updateLead(leadData);
    res.json({ success: true, lead: updated });
  } catch (err) {
    console.error("API /api/leads/update error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/batch", async (req, res) => {
  try {
    const leadsData = req.body.leads;
    if (!Array.isArray(leadsData)) {
      return res.status(400).json({ success: false, error: "Expected leads array" });
    }
    const created = await batchCreateLeads(leadsData);
    res.json({ success: true, count: created.length, leads: created });
  } catch (err) {
    console.error("API /api/leads/batch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leads/delete", async (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: "Missing leadId" });
    }
    const deleted = await deleteLead(leadId);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("API /api/leads/delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all(["/api/campaigns", "/api/campaigns/list"], async (_req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    console.error("API /api/campaigns error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/save", async (req, res) => {
  try {
    const campaign = req.body.campaign;
    if (!campaign || !campaign.id) {
      return res.status(400).json({ success: false, error: "Missing campaign or campaign.id" });
    }
    const saved = await saveCampaign(campaign);
    res.json({ success: true, campaign: saved });
  } catch (err) {
    console.error("API /api/campaigns/save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/delete", async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ success: false, error: "Missing campaignId" });
    }
    const deleted = await deleteCampaign(campaignId);
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("API /api/campaigns/delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/campaigns/toggle-active", async (req, res) => {
  try {
    const { campaignId, isActive } = req.body;
    if (!campaignId || isActive === void 0) {
      return res.status(400).json({ success: false, error: "Missing campaignId or isActive" });
    }
    const updated = await toggleCampaignActive(campaignId, Boolean(isActive));
    res.json({ success: true, campaign: updated });
  } catch (err) {
    console.error("API /api/campaigns/toggle-active error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/import/parse", async (req, res) => {
  try {
    const { filename, fileBase64, existingEmails, columnMapping } = req.body;
    if (!filename || !fileBase64) {
      return res.status(400).json({ success: false, error: "Missing filename or fileBase64" });
    }
    const cleanedBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanedBase64, "base64");
    const result = parseFileBuffer(buffer, filename, existingEmails || [], columnMapping);
    res.json(result);
  } catch (err) {
    console.error("API /api/import/parse error:", err);
    res.status(400).json({ success: false, error: err.message || "Failed to parse file" });
  }
});
app.post("/api/campaigns/run-due", async (req, res) => {
  try {
    const { token, spreadsheetId } = getAuth(req);
    const { campaignId, userEmail } = req.body;
    const result = await runDueCampaignsJob(campaignId, token, spreadsheetId, userEmail);
    res.json(result);
  } catch (err) {
    console.error("API /api/campaigns/run-due error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/settings", async (_req, res) => {
  try {
    const settings = await loadLocalSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/settings", async (req, res) => {
  try {
    const updated = await saveLocalSettings(req.body.settings || req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/senders", async (_req, res) => {
  try {
    const senders = await loadLocalSenders();
    res.json({ success: true, senders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/senders", async (req, res) => {
  try {
    const senders = await saveLocalSenders(req.body.senders || []);
    res.json({ success: true, senders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/tasks", async (_req, res) => {
  try {
    const tasks = await loadLocalTasks();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks", async (req, res) => {
  try {
    const tasks = await saveLocalTasks(req.body.tasks || []);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/update", async (req, res) => {
  try {
    const { taskId, updates } = req.body;
    const task = await updateLocalTask(taskId, updates);
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks/delete", async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: "Missing taskId" });
    }
    const deleted = await deleteLocalTask(taskId);
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/system/stats", async (_req, res) => {
  try {
    const stats = await getSystemStatsSummary();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/emails/send", async (req, res) => {
  try {
    const { to, subject, htmlBody, leadId, stage, campaign, senderEmail } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, error: 'Recipient "to" and "subject" are required' });
    }
    const baseUrl = getPublicBaseUrl(req);
    const trackingPixelHtml = `<img src="${baseUrl}/api/track/open?leadId=${encodeURIComponent(leadId || "")}&stage=${encodeURIComponent(stage || 1)}&campaign=${encodeURIComponent(campaign || "default")}" width="1" height="1" alt="" style="border:0;width:1px;height:1px;" />`;
    res.json({
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      to,
      subject,
      leadId,
      stage: stage || 1,
      senderEmail,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      trackingPixelUrl: `${baseUrl}/api/track/open?leadId=${leadId}&stage=${stage}`
    });
  } catch (err) {
    console.error("API /api/emails/send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/email/service-account", async (_req, res) => {
  try {
    const profile = getServiceAccountProfile();
    const diagnostics = await getAuthDiagnostics();
    res.json({ success: true, profile, diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/send-stage", async (req, res) => {
  try {
    const { lead, template, stageNum, customSenderName } = req.body;
    if (!lead || !lead.email) {
      return res.status(400).json({ success: false, error: "Lead with email is required" });
    }
    if (!template || !template.subject || !template.bodyHtml) {
      return res.status(400).json({ success: false, error: "Stage template is required" });
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
  } catch (err) {
    console.error("API /api/email/send-stage error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
var inMemoryInboundReplies = [];
app.get("/api/email/thread", async (req, res) => {
  try {
    const threadId = req.query.threadId;
    const leadEmail = req.query.leadEmail;
    const result = await getAppConversationThread(threadId, leadEmail);
    const cleanEmail = (leadEmail || "").trim().toLowerCase();
    let matchingInbound = inMemoryInboundReplies.filter(
      (r) => cleanEmail && r.leadEmail === cleanEmail || threadId && r.threadId === threadId
    );
    const db = await getDb().catch(() => null);
    if (db) {
      try {
        const query = {};
        if (cleanEmail && threadId) {
          query.$or = [{ leadEmail: cleanEmail }, { threadId }];
        } else if (cleanEmail) {
          query.leadEmail = cleanEmail;
        } else if (threadId) {
          query.threadId = threadId;
        }
        const dbReplies = await db.collection("inbound_replies").find(query).toArray();
        for (const r of dbReplies) {
          if (!matchingInbound.some((m) => m.id === r.id)) {
            matchingInbound.push(r);
          }
        }
      } catch (_) {
      }
    }
    if (matchingInbound.length > 0) {
      const messages = [...result.messages];
      for (const inb of matchingInbound) {
        if (!messages.some((m) => m.id === inb.id)) {
          messages.push({
            id: inb.id,
            threadId: inb.threadId || threadId || "",
            from: inb.from || cleanEmail,
            to: "",
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
  } catch (err) {
    console.error("API /api/email/thread error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/check-reply", async (req, res) => {
  try {
    const { leadEmail, threadId, lastSentDate } = req.body;
    if (!leadEmail) {
      return res.status(400).json({ success: false, error: "leadEmail is required" });
    }
    const result = await checkAppThreadForReply({
      leadEmail,
      threadId,
      lastSentDate
    });
    if (result.hasReplied) {
      return res.json({ success: true, ...result });
    }
    if (process.env.NODE_ENV !== "production") {
      const cleanEmail = leadEmail.trim().toLowerCase();
      let reply = inMemoryInboundReplies.find(
        (r) => r.leadEmail === cleanEmail || threadId && r.threadId === threadId
      );
      if (!reply) {
        const db = await getDb().catch(() => null);
        if (db) {
          try {
            const query = { $or: [{ leadEmail: cleanEmail }] };
            if (threadId) query.$or.push({ threadId });
            const dbReply = await db.collection("inbound_replies").findOne(query);
            if (dbReply) reply = dbReply;
          } catch (_) {
          }
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
  } catch (err) {
    console.error("API /api/email/check-reply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/webhooks/graph", async (req, res) => {
  try {
    const validationToken = req.query.validationToken || req.body?.validationToken;
    if (validationToken) {
      console.log("[Graph Webhook] Validation handshake received, returning token as plain text.");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(200).send(validationToken);
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const notifications = req.body?.value;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: "Bad Request: Missing notification value array" });
    }
    const expectedSecret = getWebhookClientState();
    const results = [];
    for (const item of notifications) {
      const providedClientState = item.clientState || "";
      if (!verifyWebhookClientState(providedClientState, expectedSecret)) {
        console.warn("[Graph Webhook] SECURITY REJECTION: Invalid or spoofed clientState:", providedClientState);
        return res.status(401).json({ error: "Unauthorized: clientState validation failed" });
      }
      const result = await processGraphWebhookNotification(item);
      results.push(result);
    }
    return res.status(202).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error("[Graph Webhook] Processing error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/cron/renew-subscriptions", async (req, res) => {
  try {
    console.log("[Cron] Running daily Microsoft Graph webhook subscription renewal...");
    const renewed = await renewExpiringGraphSubscriptions();
    res.json({
      success: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      subscriptions: renewed
    });
  } catch (err) {
    console.error("[Cron] Subscription renewal error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/webhooks/graph/subscribe", async (req, res) => {
  try {
    const sub = await createGraphWebhookSubscription();
    res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error("API /api/webhooks/graph/subscribe error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/email/test-send", async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient "to" email address is required' });
    }
    const result = await sendDirectTestEmail(to, subject, body);
    res.json(result);
  } catch (err) {
    console.error("API /api/email/test-send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// server/api-entry.ts
var api_entry_default = app;
export {
  api_entry_default as default
};
