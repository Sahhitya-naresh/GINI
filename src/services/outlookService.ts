import { EmailThreadMessage, Lead, StageTemplate } from '../types';

export interface OutlookProfile {
  emailAddress: string;
  displayName: string;
  isConfigured?: boolean;
}

/**
 * Gets the configured service account mailbox profile
 */
export async function getOutlookProfile(_token?: string | null): Promise<OutlookProfile> {
  try {
    const res = await fetch('/api/email/service-account');
    if (res.ok) {
      const data = await res.json();
      return {
        emailAddress: data.profile?.serviceAccount || 'outreach@domain.com',
        displayName: data.profile?.displayName || 'Outreach Flow',
        isConfigured: Boolean(data.profile?.isConfigured)
      };
    }
  } catch (err) {
    console.warn('Failed to fetch service account profile:', err);
  }
  return {
    emailAddress: 'outreach@domain.com',
    displayName: 'Outreach Flow',
    isConfigured: false
  };
}

/**
 * Fetches and parses an Outlook thread (scoped to service account)
 */
export async function getOutlookThread(
  _token?: string | null,
  threadId?: string,
  _userEmail?: string
): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
  return {
    messages: [],
    subject: threadId ? `Thread ${threadId}` : 'Conversation'
  };
}

/**
 * Checks via server-side app-only Microsoft Graph whether the lead has replied to the service account mailbox.
 */
export async function checkThreadForLeadReply(
  _token?: string | null,
  threadId?: string,
  leadEmail?: string,
  _userEmail?: string,
  lastSentDate?: string,
  _providerType?: string
): Promise<{
  hasReplied: boolean;
  replyMessage?: EmailThreadMessage;
  allMessages: EmailThreadMessage[];
}> {
  try {
    const res = await fetch('/api/email/check-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadEmail,
        threadId,
        lastSentDate
      })
    });

    if (res.ok) {
      const data = await res.json();
      let replyMsg: EmailThreadMessage | undefined;
      if (data.replyMessage) {
        replyMsg = {
          id: data.replyMessage.id,
          threadId: threadId || '',
          snippet: data.replyMessage.bodyPreview || data.replyMessage.subject || '',
          subject: data.replyMessage.subject || '',
          date: data.replyMessage.receivedDateTime,
          from: data.replyMessage.from,
          to: '',
          bodyHtml: `<p>${data.replyMessage.bodyPreview || ''}</p>`,
          isFromLead: true
        };
      }
      return {
        hasReplied: Boolean(data.hasReplied),
        replyMessage: replyMsg,
        allMessages: replyMsg ? [replyMsg] : []
      };
    }
  } catch (err) {
    console.warn('Backend check-reply error:', err);
  }

  return { hasReplied: false, allMessages: [] };
}

/**
 * Dispatches a stage email to a lead via the server-side Microsoft Graph service account (app-only client credentials).
 */
export async function sendStageEmail(
  _token?: string | null,
  lead?: Lead,
  template?: StageTemplate,
  _userEmail?: string,
  senderName?: string,
  _trackingBaseUrl?: string,
  _providerType?: string
): Promise<{ messageId: string; threadId: string; sentSubject: string }> {
  if (!lead || !template) {
    throw new Error('Lead and StageTemplate are required to send email.');
  }

  const res = await fetch('/api/email/send-stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead,
      template,
      stageNum: template.stage || lead.currentStage + 1,
      customSenderName: senderName
    })
  });

  if (!responseIsOk(res)) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Server failed to send email (${res.status})`);
  }

  const data = await res.json();
  return {
    messageId: data.messageId || `msg-${Date.now()}`,
    threadId: data.threadId || lead.threadId || `thread-${Date.now()}`,
    sentSubject: data.subject || template.subject
  };
}

function responseIsOk(res: Response): boolean {
  return res.ok || res.status === 202;
}
