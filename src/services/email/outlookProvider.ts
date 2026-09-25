import { EmailThreadMessage } from '../../types';
import {
  EmailProvider,
  EmailUserProfile,
  EmailSendParams,
  EmailSendResult,
  EmailCheckReplyParams,
  EmailCheckReplyResult
} from './types';

/**
 * Concrete implementation of EmailProvider for Microsoft Graph API (Outlook / Microsoft 365)
 * using the server-side app-only (client credentials) service account.
 */
export class OutlookProvider implements EmailProvider {
  readonly id = 'outlook';
  readonly displayName = 'Microsoft Outlook (App-Only Service Account)';

  /**
   * Fetches service account profile metadata from server-side Graph configuration
   */
  async getProfile(_token?: string): Promise<EmailUserProfile> {
    try {
      const res = await fetch('/api/email/service-account');
      if (res.ok) {
        const data = await res.json();
        const emailAddress = data.profile?.serviceAccount || 'outreach@domain.com';
        const displayName = data.profile?.displayName || 'Outreach Flow';
        return {
          emailAddress,
          displayName,
          raw: data.profile
        };
      }
    } catch (err) {
      console.warn('[OutlookProvider] Could not load service account profile:', err);
    }

    return {
      emailAddress: 'outreach@domain.com',
      displayName: 'Outreach Flow',
      raw: {}
    };
  }

  /**
   * Fetches messages in thread/conversation scoped to service account
   */
  async getThread(
    _token?: string,
    threadId?: string,
    _userEmail?: string,
    leadEmail?: string
  ): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
    if (!threadId && !leadEmail) {
      return { messages: [], subject: '' };
    }
    try {
      const params = new URLSearchParams();
      if (threadId) params.append('threadId', threadId);
      if (leadEmail) params.append('leadEmail', leadEmail);
      const res = await fetch(`/api/email/thread?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return {
          messages: data.messages || [],
          subject: data.subject || ''
        };
      }
    } catch (err) {
      console.warn('[OutlookProvider] Could not fetch thread messages:', err);
    }
    return {
      messages: [],
      subject: threadId ? `Conversation ${threadId}` : 'Outlook Thread'
    };
  }

  /**
   * Checks whether the lead has replied to the service account mailbox via server-side app-only Graph
   */
  async checkThreadForReply(params: EmailCheckReplyParams): Promise<EmailCheckReplyResult> {
    const { threadId, leadEmail, lastSentDate } = params;

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
      console.warn('[OutlookProvider] checkThreadForReply error:', err);
    }

    return { hasReplied: false, allMessages: [] };
  }

  /**
   * Dispatches stage email through backend app-only Graph POST /users/{serviceAccount}/sendMail
   */
  async sendStageEmail(params: EmailSendParams): Promise<EmailSendResult> {
    const { lead, template, senderName, trackingBaseUrl } = params;

    const res = await fetch('/api/email/send-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead,
        template,
        stageNum: template.stage || lead.currentStage + 1,
        customSenderName: senderName,
        baseUrl: trackingBaseUrl
      })
    });

    if (!res.ok && res.status !== 202) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Microsoft Graph sendMail failed (${res.status})`);
    }

    const data = await res.json();
    return {
      messageId: data.messageId || `msg-${Date.now()}`,
      threadId: data.threadId || lead.threadId || `thread-${Date.now()}`,
      sentSubject: data.subject || template.subject
    };
  }
}

