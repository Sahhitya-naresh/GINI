import { EmailThreadMessage, Lead, StageTemplate } from '../types';
import { getEmailProvider } from './email';

export interface OutlookProfile {
  emailAddress: string;
  displayName: string;
}

/**
 * Gets the authenticated user's Outlook profile to obtain sender email
 */
export async function getOutlookProfile(token: string): Promise<OutlookProfile> {
  const provider = getEmailProvider('outlook');
  const profile = await provider.getProfile(token);
  return {
    emailAddress: profile.emailAddress,
    displayName: profile.displayName || profile.emailAddress
  };
}

/**
 * Fetches and parses an entire Outlook thread
 */
export async function getOutlookThread(
  token: string,
  threadId: string,
  userEmail?: string
): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
  const provider = getEmailProvider('outlook');
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
  lastSentDate?: string,
  providerType?: string
): Promise<{
  hasReplied: boolean;
  replyMessage?: EmailThreadMessage;
  allMessages: EmailThreadMessage[];
}> {
  const provider = getEmailProvider(providerType || 'outlook');
  return provider.checkThreadForReply({
    token,
    threadId,
    leadEmail,
    userEmail,
    lastSentDate
  });
}

/**
 * Sends a stage email to a lead using the configured EmailProvider (default: Outlook).
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
  const provider = getEmailProvider(providerType || 'outlook');
  return provider.sendStageEmail({
    token,
    lead,
    template,
    userEmail,
    senderName,
    trackingBaseUrl
  });
}
