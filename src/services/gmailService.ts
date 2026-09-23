import { EmailThreadMessage, Lead, StageTemplate } from '../types';
import { getEmailProvider } from './email';

export { extractCleanEmail, wrapLinksAndEmbedTrackingPixel } from './email/gmailProvider';

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Gets the authenticated user's Gmail profile to obtain sender email
 */
export async function getGmailProfile(token: string): Promise<GmailProfile> {
  const provider = getEmailProvider('gmail');
  const profile = await provider.getProfile(token);
  return {
    emailAddress: profile.emailAddress,
    messagesTotal: profile.messagesTotal || 0,
    threadsTotal: profile.threadsTotal || 0,
    historyId: profile.raw?.historyId || ''
  };
}

/**
 * Fetches and parses an entire Gmail thread
 */
export async function getGmailThread(
  token: string,
  threadId: string,
  userEmail?: string
): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
  const provider = getEmailProvider('gmail');
  return provider.getThread(token, threadId, userEmail);
}

/**
 * Checks via email provider whether the lead has replied to the thread since last send.
 */
export async function checkThreadForLeadReply(
  token: string,
  threadId: string,
  leadEmail: string,
  userEmail: string,
  lastSentDate?: string
): Promise<{
  hasReplied: boolean;
  replyMessage?: EmailThreadMessage;
  allMessages: EmailThreadMessage[];
}> {
  const provider = getEmailProvider('gmail');
  return provider.checkThreadForReply({
    token,
    threadId,
    leadEmail,
    userEmail,
    lastSentDate
  });
}

/**
 * Sends a stage email to a lead using the configured EmailProvider (default: Gmail).
 */
export async function sendStageEmail(
  token: string,
  lead: Lead,
  template: StageTemplate,
  userEmail: string,
  senderName: string,
  trackingBaseUrl?: string,
  providerType?: string
): Promise<{ messageId: string; threadId: string; sentSubject: string }> {
  const provider = getEmailProvider(providerType || 'gmail');
  return provider.sendStageEmail({
    token,
    lead,
    template,
    userEmail,
    senderName,
    trackingBaseUrl
  });
}
