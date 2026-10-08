import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { cleanLeadNotes } from '../server/mongoBackend.ts';

async function cleanup() {
  const db = await getDb();
  console.log('Connected to MongoDB for deduplication cleanup.');

  // 1. Clean inbound_replies duplicates
  const repliesCol = db.collection('inbound_replies');
  const allReplies = await repliesCol.find({}).toArray();
  console.log(`Total inbound replies currently in DB: ${allReplies.length}`);

  const seenKeys = new Set<string>();
  const toDeleteIds: string[] = [];

  // Sort so authentic Graph IDs (or earliest) come first
  allReplies.sort((a: any, b: any) => {
    const aIsGraph = a.id && !a.id.startsWith('inbound-') ? 1 : 0;
    const bIsGraph = b.id && !b.id.startsWith('inbound-') ? 1 : 0;
    if (aIsGraph !== bIsGraph) return bIsGraph - aIsGraph;
    return new Date(a.receivedDateTime || a.createdAt || 0).getTime() - new Date(b.receivedDateTime || b.createdAt || 0).getTime();
  });

  for (const r of allReplies) {
    const email = (r.leadEmail || r.from || '').toLowerCase().trim();
    const cleanBody = (r.body || r.snippet || '').trim().replace(/\s+/g, ' ').toLowerCase().substring(0, 80);
    const key = `${email}:::${cleanBody}`;

    if (cleanBody && seenKeys.has(key)) {
      toDeleteIds.push(r.id);
    } else if (cleanBody) {
      seenKeys.add(key);
    }
  }

  console.log(`Found ${toDeleteIds.length} duplicate inbound reply records to remove.`);
  if (toDeleteIds.length > 0) {
    const delRes = await repliesCol.deleteMany({ id: { $in: toDeleteIds } });
    console.log(`Successfully deleted ${delRes.deletedCount} duplicate inbound replies.`);
  }

  const remainingReplies = await repliesCol.find({}).toArray();
  console.log(`Remaining inbound replies: ${remainingReplies.length}`);
  for (const rem of remainingReplies) {
    console.log(`- [${rem.id}] ${rem.leadEmail}: ${rem.subject} (${(rem.body || '').substring(0, 40)}...)`);
  }

  // 2. Clean leads notes in MongoDB
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const leadsWithNotes = await leadsCol.find({ notes: { $exists: true, $ne: '' } }).toArray();
  console.log(`Leads with notes to check: ${leadsWithNotes.length}`);

  for (const lead of leadsWithNotes) {
    const cleaned = cleanLeadNotes(lead.notes);
    if (cleaned !== lead.notes) {
      console.log(`Cleaning notes for ${lead.name} (${lead.leadId}):`);
      console.log(`  BEFORE (${lead.notes.length} chars): ${lead.notes.substring(0, 100)}...`);
      console.log(`  AFTER  (${cleaned.length} chars): ${cleaned}`);
      await leadsCol.updateOne({ leadId: lead.leadId }, { $set: { notes: cleaned } });
    }
  }

  console.log('Cleanup completed successfully.');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
