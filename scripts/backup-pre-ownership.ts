import fs from 'fs';
import path from 'path';
import { getDb, COLLECTIONS } from '../server/mongodb.ts';

async function backupCollections() {
  const db = await getDb();
  const timestamp = Date.now();
  const filename = `pre-ownership-${timestamp}.json`;
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilePath = path.join(backupDir, filename);

  const collections = {
    leads: db.collection(COLLECTIONS.LEADS),
    campaigns: db.collection(COLLECTIONS.CAMPAIGNS),
    tasks: db.collection(COLLECTIONS.TASKS),
    trackingEvents: db.collection(COLLECTIONS.TRACKING_EVENTS),
    users: db.collection(COLLECTIONS.USERS)
  };

  const counts: Record<string, number> = {};
  const data: Record<string, any[]> = {};

  for (const [name, col] of Object.entries(collections)) {
    const docs = await col.find({}).toArray();
    counts[name] = docs.length;
    data[name] = docs;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    epoch: timestamp,
    counts,
    data
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`Backup written to: ${backupFilePath}`);
  console.log('Confirmed collection counts:', JSON.stringify(counts, null, 2));
}

backupCollections()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
