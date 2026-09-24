// server/app.ts
import express from "express";
import { MongoClient as MongoClient2 } from "mongodb";

// server/mongodb.ts
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import "dotenv/config";
var DEFAULT_MONGODB_URI = "mongodb+srv://sahhityanaresh_db_user:test12345678@cluster0.zebcge8.mongodb.net/?appName=Cluster0";
var isMongoPackageLoaded = typeof MongoClient === "function";
console.log(`[MongoDB Diagnostics] Step 1: Package "mongodb" module import check: ${isMongoPackageLoaded ? "SUCCESS (MongoClient constructor is loaded)" : "FAILED"}`);
var COLLECTIONS = {
  LEADS: "leads",
  CAMPAIGNS: "campaigns",
  TASKS: "tasks",
  SENDERS: "senders",
  SETTINGS: "settings",
  TRACKING_EVENTS: "trackingEvents"
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
  const existingLeadsCount = await leadsCol.countDocuments();
  if (existingLeadsCount === 0) {
    const leadsFile = path.join(dataDir, "leads.json");
    if (fs.existsSync(leadsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(leadsFile, "utf-8"));
        if (Array.isArray(raw) && raw.length > 0) {
          const ops = raw.map((l) => ({
            updateOne: {
              filter: { leadId: l.leadId },
              update: { $set: { ...l, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
              upsert: true
            }
          }));
          await leadsCol.bulkWrite(ops);
          result.leads = raw.length;
          console.log(`[MongoDB] Auto-seeded ${raw.length} leads from data_store/leads.json`);
        }
      } catch (e) {
        console.warn("[MongoDB] Failed to parse leads.json for seeding:", e.message);
      }
    }
  }
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
                  provider: s.provider || "gmail"
                  // Default email provider is Gmail
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
  return leads;
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
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await col.updateOne({ leadId: existing.leadId }, { $set: updatedDoc });
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
  const result = await col.deleteOne({ leadId: leadId.trim() });
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
  const db = await getDb();
  const senders = await db.collection(COLLECTIONS.SENDERS).find({}, { projection: { _id: 0 } }).toArray();
  return senders.map((s) => ({
    ...s,
    provider: s.provider || "gmail"
  }));
}
async function saveLocalSenders(senders) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.SENDERS);
  const normalized = senders.map((s) => ({
    ...s,
    provider: s.provider || "gmail"
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

// server/runnerBackend.ts
async function checkLeadForReply(lead, token, userEmail) {
  if (lead.status === "Replied") {
    return { hasReplied: true, reason: "Status already marked Replied" };
  }
  if (lead.hasReplied === true || lead.hasUnreadReply === true || lead.lastReplyReceivedDate) {
    return { hasReplied: true, reason: "Incoming reply flag detected on lead record" };
  }
  if (token && lead.threadId) {
    try {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${lead.threadId}?format=metadata`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const messages = data.messages || [];
        const cleanLeadEmail = (lead.email || "").trim().toLowerCase();
        const cleanUserEmail = (userEmail || "").trim().toLowerCase();
        for (const msg of messages) {
          const headers = msg.payload?.headers || [];
          const fromHeader = (headers.find((h) => h.name?.toLowerCase() === "from")?.value || "").toLowerCase();
          if (cleanLeadEmail && fromHeader.includes(cleanLeadEmail)) {
            return { hasReplied: true, reason: `Lead response message detected in thread (${fromHeader})` };
          }
          if (cleanUserEmail && !fromHeader.includes(cleanUserEmail) && messages.length > 1) {
            return { hasReplied: true, reason: `Counterpart reply detected in Gmail thread (${fromHeader})` };
          }
        }
      }
    } catch (err) {
      console.warn(`Error checking Gmail thread for reply on lead ${lead.email}:`, err);
    }
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
      if (l.status === "Paused" || l.status === "Completed" || l.status === "Broke Up") {
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
      const replyCheck = await checkLeadForReply(lead, token, userEmail);
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
        tasksCreated++;
        logs.push(`Generated Manual Task for ${lead.name}: "${currentNode.data?.label || currentNode.data?.taskTitle || "Manual Review / Call"}"`);
        const localTasks = await loadLocalTasks();
        const newTask = {
          id: `task-${Date.now()}-${lead.leadId}`,
          leadId: lead.leadId,
          leadName: lead.name,
          leadCompany: lead.company,
          campaignId: campaign.id,
          nodeId: currentNode.id,
          title: currentNode.data?.taskTitle || currentNode.data?.label || "Manual Task",
          instruction: currentNode.data?.taskDescription || "Review lead profile and follow up",
          type: currentNode.data?.taskType || "call",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isCompleted: false
        };
        localTasks.push(newTask);
        await saveLocalTasks(localTasks);
        const outgoingEdge2 = edges.find((e) => e.source === currentNode.id);
        if (outgoingEdge2) {
          const nextNode = nodes.find((n) => n.id === outgoingEdge2.target);
          if (nextNode) {
            lead.currentNodeId = nextNode.id;
            lead.nodeEnteredDate = todayStr;
            advancedCount++;
          }
        }
        await updateLead(lead, token, spreadsheetId);
        continue;
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
var handleOpenTracking = async (req, res) => {
  const leadId = (req.query.leadId || req.params.leadId || "").toString().trim();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const stage = parseInt((req.query.stage || req.params.stage || "1").toString(), 10) || 1;
  const campaign = (req.query.campaign || "default").toString();
  if (leadId || email) {
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
    recordTrackingEvent(newEvent).catch((err) => console.warn("Failed to record open event:", err));
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
  if (leadId || email) {
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
    recordTrackingEvent(newEvent).catch((err) => console.warn("Failed to record click event:", err));
  }
  res.redirect(302, targetUrl);
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
app.all(["/api/leads/list", "/api/leads/local"], async (_req, res) => {
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
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const baseUrl = `${protocol}://${host}`;
    const trackingPixelHtml = `<img src="${baseUrl}/api/track/open?leadId=${encodeURIComponent(leadId || "")}&stage=${encodeURIComponent(stage || 1)}&campaign=${encodeURIComponent(campaign || "default")}" width="1" height="1" style="display:none;" alt="" />`;
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

// server/api-entry.ts
var api_entry_default = app;
export {
  api_entry_default as default
};
