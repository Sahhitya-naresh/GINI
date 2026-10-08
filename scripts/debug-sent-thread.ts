import dotenv from 'dotenv';
dotenv.config();
import { getAppAccessToken, getGraphConfig } from '../server/msGraphAuth.ts';

async function main() {
  const config = getGraphConfig();
  console.log('Service account:', config.serviceAccount);
  const token = await getAppAccessToken();
  const threadId = 'AAQkAGQ4YWU4YWMyLTFhZmEtNGNjMy04MWYyLTgxOGJjOGFmNTA1NQAQAG6sDwsLCmNKrzSxAnCwVLU=';
  const leadEmail = 'sandeep.gosain@giniminds.com';

  // 1. Check messages in mailFolders/sentitems with conversationId
  console.log('--- Querying sentitems by conversationId ---');
  const sentUrl1 = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$filter=conversationId eq '${encodeURIComponent(threadId)}'&$select=id,conversationId,subject,from,toRecipients,sentDateTime,bodyPreview`;
  const res1 = await fetch(sentUrl1, { headers: { Authorization: `Bearer ${token}` } });
  console.log('sentitems filter status:', res1.status);
  if (res1.ok) {
    const data1 = await res1.json();
    console.log('sentitems by convId count:', data1.value?.length);
    console.log(JSON.stringify(data1.value, null, 2));
  } else {
    console.log('sentitems error:', await res1.text());
  }

  // 2. Check all messages in sentitems recent
  console.log('--- Querying recent sentitems ---');
  const sentUrl2 = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/mailFolders/sentitems/messages?$top=10&$select=id,conversationId,subject,from,toRecipients,sentDateTime,bodyPreview`;
  const res2 = await fetch(sentUrl2, { headers: { Authorization: `Bearer ${token}` } });
  if (res2.ok) {
    const data2 = await res2.json();
    console.log('recent sent items:', data2.value?.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      subject: m.subject,
      to: m.toRecipients?.map((r: any) => r.emailAddress?.address),
      sentDateTime: m.sentDateTime
    })));
  }

  // 3. Check /users/messages by conversationId
  console.log('--- Querying /users/messages by conversationId ---');
  const msgUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(threadId)}'&$select=id,conversationId,subject,from,toRecipients,sentDateTime,receivedDateTime,bodyPreview`;
  const res3 = await fetch(msgUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (res3.ok) {
    const data3 = await res3.json();
    console.log('/messages by convId count:', data3.value?.length);
    console.log(JSON.stringify(data3.value?.map((m: any) => ({
      id: m.id,
      from: m.from?.emailAddress?.address,
      subject: m.subject,
      receivedDateTime: m.receivedDateTime
    })), null, 2));
  }
}

main().catch(console.error);
