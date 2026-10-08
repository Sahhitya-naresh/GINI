import { getDb, COLLECTIONS } from '../server/mongodb.ts';
import { validatePhrase, clearKeywordCache, DEFAULT_KEYWORD_LISTS } from '../server/replyRules.ts';

const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('======================================================================');
  console.log('REPLY CLASSIFIER KEYWORDS & UI TEST SUITE VERIFICATION');
  console.log('======================================================================\n');

  const db = await getDb();
  const leadsCol = db.collection(COLLECTIONS.LEADS);
  const settingsCol = db.collection(COLLECTIONS.SETTINGS);

  // Setup a test lead to verify requirement (f)
  const testLeadId = 'LEAD-TEST-HISTORY-SAFE';
  await leadsCol.deleteOne({ leadId: testLeadId });
  const initialLeadDoc = {
    leadId: testLeadId,
    name: 'Robert Historian',
    email: 'robert@historian.org',
    company: 'History Archives',
    status: 'Replied',
    replySentiment: 'neutral',
    replyClassifiedBy: 'auto',
    notes: 'Existing lead notes prior to keyword customization',
    updatedAt: new Date().toISOString()
  };
  await leadsCol.insertOne(initialLeadDoc);
  console.log(`Created baseline test lead [${testLeadId}]: status="${initialLeadDoc.status}", replySentiment="${initialLeadDoc.replySentiment}"\n`);

  // -------------------------------------------------------------------------
  // (a) Add "we already have a vendor" -> Negative -> Remove -> Neutral
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------------');
  console.log('(a) ADD PHRASE "we already have a vendor", TEST CLASSIFIER, THEN REMOVE');
  console.log('----------------------------------------------------------------------\n');

  // 1. Get current lists
  const initialRes = await fetch(`${BASE_URL}/api/reply-rules`);
  const initialData = await initialRes.json();
  const currentNegatives: string[] = initialData.lists.negativePhrases;

  // Add "we already have a vendor"
  const phraseToAdd = 'we already have a vendor';
  const updatedNegatives = [...currentNegatives.filter(p => p !== phraseToAdd), phraseToAdd];

  console.log(`1. Adding phrase "${phraseToAdd}" to negative list...`);
  const addRes = await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ negativePhrases: updatedNegatives })
  });
  const addJson = await addRes.json();
  console.log(`Add response success: ${addJson.success}. Negative phrases count: ${addJson.lists.negativePhrases.length}`);

  // Test reply with newly added phrase
  const sampleReply = 'Hello, thanks for reaching out, but we already have a vendor handling this for our team.';
  console.log(`\n2. Testing sample reply with Test Box: "${sampleReply}"`);
  const testRes1 = await fetch(`${BASE_URL}/api/reply-rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sampleReply })
  });
  const testJson1 = await testRes1.json();
  console.log('Test Result 1 (With phrase added):');
  console.log(`- Sentiment: "${testJson1.classification.sentiment}"`);
  console.log(`- Matched Phrases: [${testJson1.classification.matchedPhrases.map((p: string) => `"${p}"`).join(', ')}]`);
  console.log(`- Reason: "${testJson1.classification.reason}"`);

  // Remove the phrase
  console.log(`\n3. Removing phrase "${phraseToAdd}" from negative list...`);
  const cleanNegatives = updatedNegatives.filter(p => p !== phraseToAdd);
  const removeRes = await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ negativePhrases: cleanNegatives })
  });
  const removeJson = await removeRes.json();
  console.log(`Remove response success: ${removeJson.success}. Negative phrases count: ${removeJson.lists.negativePhrases.length}`);

  // Test reply again
  console.log(`\n4. Re-testing the same sample reply after removal:`);
  const testRes2 = await fetch(`${BASE_URL}/api/reply-rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sampleReply })
  });
  const testJson2 = await testRes2.json();
  console.log('Test Result 2 (After phrase removed):');
  console.log(`- Sentiment: "${testJson2.classification.sentiment}"`);
  console.log(`- Matched Phrases: [${testJson2.classification.matchedPhrases.map((p: string) => `"${p}"`).join(', ')}]`);
  console.log(`- Reason: "${testJson2.classification.reason}"`);

  // -------------------------------------------------------------------------
  // (b) Reload / Server Restart Persistence Verification
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(b) PERSISTENCE ACROSS SERVER RESTART & RELOAD IN MONGODB');
  console.log('----------------------------------------------------------------------\n');

  console.log(`Saving custom phrase "${phraseToAdd}" to negative list...`);
  await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ negativePhrases: [...cleanNegatives, phraseToAdd] })
  });

  console.log('Simulating server restart / cache eviction: clearing local in-memory cache...');
  clearKeywordCache();

  // Query MongoDB document directly to prove persistence in database collection
  const mongoDoc = await settingsCol.findOne({ id: 'reply_keywords' });
  const isPersistedInMongo = Array.isArray(mongoDoc?.negativePhrases) && mongoDoc.negativePhrases.includes(phraseToAdd);
  console.log(`MongoDB document check directly from DB:`);
  console.log(`- Document ID: "${mongoDoc?.id}"`);
  console.log(`- Updated At: "${mongoDoc?.updatedAt}"`);
  console.log(`- Contains "${phraseToAdd}": ${isPersistedInMongo}`);

  // Fetch via clean API call
  const reloadRes = await fetch(`${BASE_URL}/api/reply-rules`);
  const reloadJson = await reloadRes.json();
  const isPresentInReload = reloadJson.lists.negativePhrases.includes(phraseToAdd);
  console.log(`Fresh API fetch after cache clear contains phrase: ${isPresentInReload}`);

  // -------------------------------------------------------------------------
  // (c) Add single word "no", verify warning & boundary matching on "know"
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(c) COMMON WORD WARNING ("no") & WORD BOUNDARY CHECK (DOES NOT MATCH "know")');
  console.log('----------------------------------------------------------------------\n');

  console.log('1. Validating single word "no":');
  const validationResultNo = validatePhrase('no', []);
  console.log(`- Valid: ${validationResultNo.valid}`);
  console.log(`- Normalized: "${validationResultNo.normalized}"`);
  console.log(`- Warning generated: "${validationResultNo.warning}"`);

  console.log('\n2. Adding single word "no" to negative list in MongoDB...');
  const currentNegsRes = await fetch(`${BASE_URL}/api/reply-rules`);
  const currentNegsData = await currentNegsRes.json();
  const negsWithNo = [...currentNegsData.lists.negativePhrases.filter((p: string) => p !== 'no'), 'no'];
  await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ negativePhrases: negsWithNo })
  });

  // Test that "know" is NOT matched when "no" is in the negative list
  console.log('\n3. Testing reply containing word "know" (checking boundary matching):');
  const knowSentence = 'I know that your service is great, but tell me more about enterprise.';
  const testResKnow = await fetch(`${BASE_URL}/api/reply-rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: knowSentence })
  });
  const testJsonKnow = await testResKnow.json();
  const matchedKnowPhrases: string[] = testJsonKnow.classification.matchedPhrases;
  console.log(`Sentence: "${knowSentence}"`);
  console.log(`- Result sentiment: "${testJsonKnow.classification.sentiment}"`);
  console.log(`- Matched phrases: [${matchedKnowPhrases.join(', ')}]`);
  console.log(`- Did "no" falsely match "know"? ${matchedKnowPhrases.includes('no') ? 'FAIL (matched substring)' : 'PASS (boundary respected, "no" did NOT match "know")'}`);

  // Test that standalone "No." DOES match
  console.log('\n4. Testing reply with standalone "No." word:');
  const noSentence = 'No. Please leave me alone.';
  const testResNo = await fetch(`${BASE_URL}/api/reply-rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: noSentence })
  });
  const testJsonNo = await testResNo.json();
  console.log(`Sentence: "${noSentence}"`);
  console.log(`- Result sentiment: "${testJsonNo.classification.sentiment}"`);
  console.log(`- Matched phrases: [${testJsonNo.classification.matchedPhrases.join(', ')}]`);
  console.log(`- Did "no" match as standalone word? ${testJsonNo.classification.matchedPhrases.includes('no') ? 'PASS (whole word matched)' : 'FAIL'}`);

  // Clean up "no"
  await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ negativePhrases: negsWithNo.filter((p: string) => p !== 'no') })
  });

  // -------------------------------------------------------------------------
  // (d) Duplicate with different capitalization is rejected
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(d) DUPLICATE WITH DIFFERENT CAPITALIZATION REJECTION');
  console.log('----------------------------------------------------------------------\n');

  console.log('Testing adding duplicate "WE ALREADY HAVE A VENDOR" (different case):');
  const validationDup = validatePhrase('WE ALREADY HAVE A VENDOR', ['we already have a vendor']);
  console.log(`- Function validation: valid=${validationDup.valid}, error="${validationDup.error}"`);

  const dupRes = await fetch(`${BASE_URL}/api/reply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      negativePhrases: [...cleanNegatives, phraseToAdd, 'WE ALREADY HAVE A VENDOR']
    })
  });
  const dupJson = await dupRes.json();
  console.log(`- API Response HTTP Status: ${dupRes.status}`);
  console.log(`- API Response Error: "${dupJson.error}"`);

  // -------------------------------------------------------------------------
  // (e) Reset to defaults restores the original list
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(e) RESET TO DEFAULTS RESTORES ORIGINAL LIST');
  console.log('----------------------------------------------------------------------\n');

  console.log('Calling POST /api/reply-rules/reset for negativePhrases...');
  const resetRes = await fetch(`${BASE_URL}/api/reply-rules/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'negativePhrases' })
  });
  const resetJson = await resetRes.json();
  console.log(`- Reset success: ${resetJson.success}`);
  const hasAddedAfterReset = resetJson.lists.negativePhrases.includes(phraseToAdd);
  console.log(`- Does negativePhrases still contain "${phraseToAdd}"? ${hasAddedAfterReset ? 'YES (Failed)' : 'NO (Successfully removed)'}`);
  console.log(`- Restored default length matches: ${resetJson.lists.negativePhrases.length === resetJson.defaults.negativePhrases.length}`);

  // -------------------------------------------------------------------------
  // (f) Existing lead status is unchanged after editing lists
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('(f) HISTORY SAFETY: EXISTING LEADS UNCHANGED AFTER LIST EDITS');
  console.log('----------------------------------------------------------------------\n');

  const leadAfterEdits = await leadsCol.findOne({ leadId: testLeadId });
  console.log(`Checking lead [${testLeadId}] in database:`);
  console.log(`- Status: "${leadAfterEdits?.status}" (Expected: "${initialLeadDoc.status}")`);
  console.log(`- Reply Sentiment: "${leadAfterEdits?.replySentiment}" (Expected: "${initialLeadDoc.replySentiment}")`);
  console.log(`- Notes: "${leadAfterEdits?.notes}" (Expected: "${initialLeadDoc.notes}")`);
  const isHistoryUntouched =
    leadAfterEdits?.status === initialLeadDoc.status &&
    leadAfterEdits?.replySentiment === initialLeadDoc.replySentiment &&
    leadAfterEdits?.notes === initialLeadDoc.notes;
  console.log(`- History preservation check: ${isHistoryUntouched ? 'PASS (100% untouched)' : 'FAIL'}`);

  // Clean up test lead
  await leadsCol.deleteOne({ leadId: testLeadId });
  console.log(`\nCleaned up test lead [${testLeadId}].`);

  console.log('\n======================================================================');
  console.log('ALL TESTS (a) THROUGH (f) COMPLETED WITH COMPLETE EVIDENCE!');
  console.log('======================================================================');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
