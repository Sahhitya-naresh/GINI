/**
 * scripts/backup-pre-templates.ts
 *
 * Backs up settings, campaigns collections and any stored templates to
 * backups/pre-templates-{timestamp}.json.
 */

import fs from 'fs';
import path from 'path';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { DEFAULT_STAGE_TEMPLATES } from '../src/data/defaultTemplates.ts';

async function runBackup() {
  console.log('--- Step 0: Starting Backup ---');
  const db = await getDb();
  const timestamp = Date.now();

  const settingsDocs = await db.collection(COLLECTIONS.SETTINGS).find({}).toArray();
  const campaignsDocs = await db.collection(COLLECTIONS.CAMPAIGNS).find({}).toArray();
  
  // Check if templateSets or any templates collection already exists in MongoDB
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  let templateSetsDocs: any[] = [];
  if (colNames.includes('templateSets')) {
    templateSetsDocs = await db.collection('templateSets').find({}).toArray();
  }

  const backupData = {
    backupTimestamp: timestamp,
    backupDate: new Date(timestamp).toISOString(),
    collections: {
      settings: settingsDocs,
      campaigns: campaignsDocs,
      templateSets: templateSetsDocs
    },
    codeDefaultStageTemplates: DEFAULT_STAGE_TEMPLATES
  };

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const backupFilePath = path.join(backupsDir, `pre-templates-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`[Backup Success] Wrote pre-templates backup to: ${backupFilePath}`);
  console.log(`- Settings docs count: ${settingsDocs.length}`);
  console.log(`- Campaigns docs count: ${campaignsDocs.length}`);
  console.log(`- TemplateSets docs count: ${templateSetsDocs.length}`);
  console.log(`- Code Stage Templates count: ${DEFAULT_STAGE_TEMPLATES.length}`);
}

runBackup().catch(err => {
  console.error('[Backup Error]:', err);
  process.exit(1);
});
