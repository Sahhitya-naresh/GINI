import { EmailThreadMessage, Lead } from '../../types';
import { renderEmailMergeTags } from '../../data/defaultTemplates';
import { wrapLinksAndEmbedTrackingPixel, extractCleanEmail } from './gmailProvider';
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
 */
export class OutlookProvider implements EmailProvider {
  readonly id = 'outlook';
  readonly displayName = 'Microsoft Outlook';

  /**
   * Fetches user profile from Microsoft Graph: GET /me
   */
  async getProfile(token: string): Promise<EmailUserProfile> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch Microsoft profile: ${res.statusText}`);
    }

    const data = await res.json();
    const emailAddress = data.mail || data.userPrincipalName || '';
    return {
      emailAddress,
      displayName: data.displayName || emailAddress,
      raw: data
    };
  }

  /**
   * Fetches messages in conversation / thread by conversationId or message ID
   */
  async getThread(
    token: string,
    threadId: string,
    userEmail?: string
  ): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
    if (!threadId) {
      return { messages: [], subject: '' };
    }

    let rawMessages: any[] = [];
    let threadSubject = '';

    // First attempt querying messages filtered by conversationId (Microsoft Graph uses conversationId for threading)
    try {
      const filterUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${encodeURIComponent(threadId)}'&$select=id,conversationId,subject,body,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,internetMessageId&$orderby=receivedDateTime asc`;
      const res = await fetch(filterUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        rawMessages = data.value || [];
      } else {
        // Fallback: If conversationId filter fails or threadId is an individual message ID, fetch the single message
        const singleRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(threadId)}?$select=id,conversationId,subject,body,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,internetMessageId`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        if (singleRes.ok) {
          const singleData = await singleRes.json();
          rawMessages = [singleData];
          if (singleData.conversationId && singleData.conversationId !== threadId) {
            // Fetch the rest of the conversation
            const convRes = await fetch(
              `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${encodeURIComponent(singleData.conversationId)}'&$select=id,conversationId,subject,body,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,internetMessageId&$orderby=receivedDateTime asc`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            if (convRes.ok) {
              const convData = await convRes.json();
              if (Array.isArray(convData.value) && convData.value.length > 0) {
                rawMessages = convData.value;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[OutlookProvider] Error querying thread ${threadId}:`, err);
    }

    const cleanUser = userEmail ? userEmail.trim().toLowerCase() : '';

    const parsedMessages: EmailThreadMessage[] = rawMessages.map(msg => {
      const fromObj = msg.from?.emailAddress || {};
      const from = fromObj.address
        ? (fromObj.name ? `"${fromObj.name}" <${fromObj.address}>` : fromObj.address)
        : '';
      const toRecipients: any[] = msg.toRecipients || [];
      const to = toRecipients.map(r => r.emailAddress?.address || '').filter(Boolean).join(', ');
      const subject = msg.subject || '';
      if (!threadSubject && subject) threadSubject = subject;

      const date = msg.receivedDateTime || msg.sentDateTime || new Date().toISOString();
      const messageIdHeader = msg.internetMessageId || '';

      const cleanSender = extractCleanEmail(from);
      const isFromLead = cleanUser ? cleanSender !== cleanUser : true;

      const bodyHtml = msg.body?.contentType === 'html' ? msg.body?.content : undefined;
      const bodyText = msg.body?.contentType === 'text' ? msg.body?.content : (msg.bodyPreview || '');

      return {
        id: msg.id,
        threadId: msg.conversationId || threadId,
        from,
        to,
        date,
        subject,
        snippet: msg.bodyPreview || '',
        bodyHtml,
        bodyText,
        isFromLead,
        messageIdHeader
      };
    });

    return { messages: parsedMessages, subject: threadSubject };
  }

  /**
   * Checks whether the lead has replied to the thread
   */
  async checkThreadForReply(params: EmailCheckReplyParams): Promise<EmailCheckReplyResult> {
    const { token, threadId, leadEmail, userEmail, lastSentDate } = params;
    if (!threadId) {
      return { hasReplied: false, allMessages: [] };
    }

    const { messages } = await this.getThread(token, threadId, userEmail);
    const cleanLeadEmail = (leadEmail || '').trim().toLowerCase();

    // Find any message sent by the lead
    const leadReplies = messages.filter(m => {
      const cleanSender = extractCleanEmail(m.from);
      const isLeadMatch = cleanLeadEmail ? (cleanSender === cleanLeadEmail || cleanSender.includes(cleanLeadEmail)) : false;
      return isLeadMatch || m.isFromLead;
    });

    if (leadReplies.length === 0) {
      return { hasReplied: false, allMessages: messages };
    }

    const latestReply = leadReplies[leadReplies.length - 1];

    if (lastSentDate) {
      const lastSentTimestamp = new Date(
        lastSentDate.includes('T') ? lastSentDate : lastSentDate + 'T00:00:00'
      ).getTime();
      const replyTimestamp = new Date(latestReply.date).getTime();

      // 60-second margin for clock drift
      if (!isNaN(lastSentTimestamp) && !isNaN(replyTimestamp) && replyTimestamp < lastSentTimestamp - 60000) {
        return { hasReplied: false, allMessages: messages };
      }
    }

    return {
      hasReplied: true,
      replyMessage: latestReply,
      allMessages: messages
    };
  }

  /**
   * Dispatches stage email through Microsoft Graph POST /me/sendMail or POST /me/messages/{id}/reply
   */
  async sendStageEmail(params: EmailSendParams): Promise<EmailSendResult> {
    const { token, lead, template, userEmail, senderName, trackingBaseUrl } = params;

    const renderedSubject = renderEmailMergeTags(template.subject, lead, senderName);
    const rawHtml = renderEmailMergeTags(template.bodyHtml, lead, senderName);

    // Inject tracking pixel and wrap hyperlinks
    const renderedHtml = wrapLinksAndEmbedTrackingPixel(rawHtml, lead, template.stage, trackingBaseUrl);

    let actualSubject = renderedSubject;
    let targetConversationId = lead.threadId || '';

    // If threading into an existing conversation, fetch subject/context
    if (lead.threadId) {
      try {
        const threadData = await this.getThread(token, lead.threadId, userEmail);
        if (threadData.subject) {
          actualSubject = threadData.subject.startsWith('Re:')
            ? threadData.subject
            : `Re: ${threadData.subject}`;
        }
        if (threadData.messages.length > 0) {
          targetConversationId = threadData.messages[0].threadId || lead.threadId;
        }
      } catch (e) {
        console.warn('[OutlookProvider] Could not fetch thread details, sending new message:', e);
      }
    }

    // Construct Microsoft Graph SendMail payload
    const mailPayload: any = {
      message: {
        subject: actualSubject,
        body: {
          contentType: 'HTML',
          content: renderedHtml
        },
        toRecipients: [
          {
            emailAddress: {
              address: lead.email,
              name: lead.name || lead.email
            }
          }
        ]
      },
      saveToSentItems: 'true'
    };

    // If we have an existing threadId, attempt to associate internet message headers for threading
    if (lead.threadId) {
      try {
        const threadData = await this.getThread(token, lead.threadId, userEmail);
        const lastMsg = threadData.messages[threadData.messages.length - 1];
        if (lastMsg && lastMsg.messageIdHeader) {
          mailPayload.message.internetMessageHeaders = [
            {
              name: 'In-Reply-To',
              value: lastMsg.messageIdHeader
            },
            {
              name: 'References',
              value: threadData.messages.map(m => m.messageIdHeader).filter(Boolean).join(' ')
            }
          ];
        }
      } catch {
        // ignore
      }
    }

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailPayload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Outlook sendMail failed: ${res.statusText}`);
    }

    // Microsoft Graph /sendMail returns 202 Accepted without body.
    // We retrieve the sent message from /me/mailFolders/SentItems/messages?$top=1 to capture messageId & conversationId
    let generatedMessageId = `outlook-${Date.now()}`;
    let threadId = targetConversationId || generatedMessageId;

    try {
      const sentRes = await fetch(
        'https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages?$top=1&$select=id,conversationId,subject,sentDateTime',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (sentRes.ok) {
        const sentData = await sentRes.json();
        const latestSent = sentData.value?.[0];
        if (latestSent) {
          generatedMessageId = latestSent.id;
          threadId = latestSent.conversationId || threadId;
        }
      }
    } catch (sentErr) {
      console.warn('[OutlookProvider] Could not inspect SentItems for message ID:', sentErr);
    }

    return {
      messageId: generatedMessageId,
      threadId,
      sentSubject: actualSubject
    };
  }
}
