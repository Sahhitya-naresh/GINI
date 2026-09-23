import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('--- Starting MongoDB One-Time Migration ---');

  let uri = process.env.MONGODB_URI;
  let memoryServer: any = null;

  if (!uri) {
    console.log('MONGODB_URI not provided in environment. Attempting local MongoMemoryServer for migration testing...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'outreach_flow' }
      });
      uri = memoryServer.getUri();
      console.log(`Connected to memory server at ${uri}`);
    } catch (e: any) {
      console.error('Error starting MongoMemoryServer:', e.message);
    }
  }

  if (!uri) {
    console.error('Fatal: No MongoDB URI available. Please specify MONGODB_URI.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'outreach_flow';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Successfully connected to MongoDB database: "${dbName}"`);

    const dataDir = path.join(process.cwd(), 'data_store');
    const trackingFile = path.join(process.cwd(), 'tracking-events.json');

    // 1. Migrate Leads
    const leadsFile = path.join(dataDir, 'leads.json');
    let leadsToMigrate: any[] = [];
    if (fs.existsSync(leadsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
        if (Array.isArray(raw)) leadsToMigrate = raw;
      } catch (e: any) {
        console.warn('Failed reading data_store/leads.json:', e.message);
      }
    }

    // Optional: Fetch from Google Sheet if credentials supplied
    const sheetId = process.env.SPREADSHEET_ID;
    const sheetToken = process.env.GOOGLE_ACCESS_TOKEN;
    if (sheetId && sheetToken) {
      console.log(`Fetching remote leads from Google Sheet "${sheetId}"...`);
      try {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Leads!A1:W1000`, {
          headers: { Authorization: `Bearer ${sheetToken}` }
        });
        if (res.ok) {
          const sheetData = await res.json();
          const rows = sheetData.values || [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r && r[0]) {
              const leadId = String(r[0]).trim();
              const existingIdx = leadsToMigrate.findIndex(l => l.leadId === leadId || (l.email && l.email.toLowerCase() === String(r[2] || '').toLowerCase()));
              const sheetLead = {
                leadId,
                name: String(r[1] || 'Prospect').trim(),
                email: String(r[2] || '').trim(),
                company: String(r[3] || '').trim(),
                painPoint: String(r[4] || '').trim(),
                currentStage: parseInt(String(r[5] || '0'), 10) || 0,
                status: String(r[6] || 'Active').trim(),
                lastEmailSentDate: String(r[7] || '').trim(),
                nextSendDate: String(r[8] || '').trim(),
                threadId: String(r[9] || '').trim(),
                notes: String(r[10] || '').trim(),
                campaign: String(r[16] || 'Default').trim()
              };
              if (existingIdx >= 0) {
                leadsToMigrate[existingIdx] = { ...leadsToMigrate[existingIdx], ...sheetLead };
              } else {
                leadsToMigrate.push(sheetLead);
              }
            }
          }
          console.log(`Successfully merged leads from Google Sheet. Total leads: ${leadsToMigrate.length}`);
        }
      } catch (err: any) {
        console.warn('Google Sheet fetch note:', err.message);
      }
    }

    if (leadsToMigrate.length > 0) {
      const leadsCol = db.collection('leads');
      const ops = leadsToMigrate.map(l => ({
        updateOne: {
          filter: { leadId: l.leadId },
          update: { $set: { ...l, updatedAt: new Date().toISOString() } },
          upsert: true
        }
      }));
      const res = await leadsCol.bulkWrite(ops);
      console.log(`[Leads] Migrated ${leadsToMigrate.length} leads (upserted: ${res.upsertedCount}, modified: ${res.modifiedCount})`);
    }

    // 2. Migrate Campaigns
    const campFile = path.join(dataDir, 'campaigns.json');
    if (fs.existsSync(campFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(campFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const campCol = db.collection('campaigns');
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
          const res = await campCol.bulkWrite(ops);
          console.log(`[Campaigns] Migrated ${raw.length} campaigns (upserted: ${res.upsertedCount}, modified: ${res.modifiedCount})`);
        }
      } catch (e: any) {
        console.warn('Failed migrating campaigns:', e.message);
      }
    }

    // 3. Migrate Senders
    const sendersFile = path.join(dataDir, 'senders.json');
    if (fs.existsSync(sendersFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(sendersFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const sendersCol = db.collection('senders');
          const ops = raw.map(s => ({
            updateOne: {
              filter: { id: s.id },
              update: {
                $set: {
                  ...s,
                  provider: s.provider || 'gmail'
                }
              },
              upsert: true
            }
          }));
          const res = await sendersCol.bulkWrite(ops);
          console.log(`[Senders] Migrated ${raw.length} senders (upserted: ${res.upsertedCount}, modified: ${res.modifiedCount})`);
        }
      } catch (e: any) {
        console.warn('Failed migrating senders:', e.message);
      }
    }

    // 4. Migrate Tasks
    const tasksFile = path.join(dataDir, 'tasks.json');
    if (fs.existsSync(tasksFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const tasksCol = db.collection('tasks');
          const ops = raw.map(t => ({
            updateOne: {
              filter: { id: t.id },
              update: { $set: t },
              upsert: true
            }
          }));
          const res = await tasksCol.bulkWrite(ops);
          console.log(`[Tasks] Migrated ${raw.length} tasks (upserted: ${res.upsertedCount})`);
        }
      } catch (e: any) {
        console.warn('Failed migrating tasks:', e.message);
      }
    }

    // 5. Migrate Settings
    const settingsFile = path.join(dataDir, 'settings.json');
    let settingsDoc: any = {
      id: 'app_settings',
      spreadsheetName: 'Outreach Flow CRM',
      defaultGapDays: 3,
      stageGapDays: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 7 },
      skipWeekends: true,
      senderName: 'Outreach Flow',
      senderEmail: 'connect@giniiris.ai',
      appName: 'Outreach Flow'
    };
    if (fs.existsSync(settingsFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
        settingsDoc = { ...settingsDoc, ...raw, id: 'app_settings' };
      } catch {
        // ignore
      }
    }
    const settingsCol = db.collection('settings');
    await settingsCol.updateOne(
      { id: 'app_settings' },
      { $set: settingsDoc },
      { upsert: true }
    );
    console.log('[Settings] Migrated app_settings document');

    // 6. Migrate Tracking Events
    if (fs.existsSync(trackingFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          const eventsCol = db.collection('trackingEvents');
          const ops = raw.map(ev => ({
            updateOne: {
              filter: { id: ev.id },
              update: { $set: ev },
              upsert: true
            }
          }));
          const res = await eventsCol.bulkWrite(ops);
          console.log(`[TrackingEvents] Migrated ${raw.length} tracking events (upserted: ${res.upsertedCount})`);
        }
      } catch (e: any) {
        console.warn('Failed migrating tracking events:', e.message);
      }
    }

    console.log('--- MongoDB Migration Completed Successfully! ---');
  } catch (err: any) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
    if (memoryServer) {
      await memoryServer.stop();
    }
  }
}

runMigration().catch(err => {
  console.error('Fatal error in migration script:', err);
  process.exit(1);
});
