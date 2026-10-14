import { getDb, COLLECTIONS } from '../server/mongodb.ts';

async function main() {
  const db = await getDb();
  await db.collection(COLLECTIONS.LEADS).deleteMany({ leadId: { $in: ['lead-ai-ui-test', 'lead-ai-test-001', 'lead-ai-test-002'] } });
  await db.collection(COLLECTIONS.AI_RATE_LIMITS).deleteMany({ userId: { $regex: '^test-' } });
  await db.collection(COLLECTIONS.AI_AUDIT_LOGS).deleteMany({ userId: { $regex: '^test-' } });
  console.log('Cleaned test data successfully');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
