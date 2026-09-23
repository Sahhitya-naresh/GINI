import { EmailThreadMessage, Lead } from '../../types';
import { renderEmailMergeTags } from '../../data/defaultTemplates';
import {
  EmailProvider,
  EmailUserProfile,
  EmailSendParams,
  EmailSendResult,
  EmailCheckReplyParams,
  EmailCheckReplyResult
} from './types';

/**
 * Encodes string to RFC 4648 Base64URL
 */
function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes RFC 4648 Base64URL to utf-8 string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return atob(base64);
  }
}

/**
 * Helper to extract email address from a header like "John Doe <john@example.com>"
 */
export function extractCleanEmail(headerValue: string): string {
  if (!headerValue) return '';
  const match = headerValue.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return headerValue.trim().toLowerCase();
}

/**
 * Recursively extracts HTML or plain text body from a Gmail payload
 */
function extractBodyFromPayload(payload: any): { html?: string; text?: string } {
  if (!payload) return {};

  let htmlBody = '';
  let textBody = '';

  if (payload.body && payload.body.data) {
    const decoded = base64UrlDecode(payload.body.data);
    if (payload.mimeType === 'text/html') {
      htmlBody = decoded;
    } else {
      textBody = decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const nested = extractBodyFromPayload(part);
      if (nested.html && !htmlBody) htmlBody = nested.html;
      if (nested.text && !textBody) textBody = nested.text;
    }
  }

  return { html: htmlBody, text: textBody };
}

/**
 * Wraps all hyperlinks with click tracking redirects and appends a 1x1 transparent tracking pixel
 */
export function wrapLinksAndEmbedTrackingPixel(
  htmlContent: string,
  lead: Lead,
  stage: number,
  baseUrl?: string
): string {
  const cleanBase = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!cleanBase) return htmlContent;

  const cleanBaseUrl = cleanBase.replace(/\/+$/, '');
  const campaign = encodeURIComponent(lead.campaign || 'Default');
  const leadId = encodeURIComponent(lead.leadId || '');
  const leadEmail = encodeURIComponent(lead.email || '');

  // 1. Wrap hyperlinks
  let modifiedHtml = htmlContent.replace(
    /<a\s+([^>]*?)href=(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
    (_match, pre, quote, originalUrl, post) => {
      if (originalUrl.includes('/api/track/click')) return _match;
      const clickTrackUrl = `${cleanBaseUrl}/api/track/click?url=${encodeURIComponent(originalUrl)}&leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}`;
      return `<a ${pre}href=${quote}${clickTrackUrl}${quote}${post}>`;
    }
  );

  // 2. Embed 1x1 transparent tracking pixel
  const openTrackUrl = `${cleanBaseUrl}/api/track/open?leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}&t=${Date.now()}`;
  const pixelTag = `<div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;"><img src="${openTrackUrl}" width="1" height="1" border="0" alt="" style="display:none !important;width:1px;height:1px;border:0;" /></div>`;

  if (modifiedHtml.includes('</body>')) {
    modifiedHtml = modifiedHtml.replace('</body>', `${pixelTag}</body>`);
  } else {
    modifiedHtml += `\n${pixelTag}`;
  }

  return modifiedHtml;
}

/**
 * Concrete implementation of EmailProvider for Google Gmail API
 */
export class GmailProvider implements EmailProvider {
  readonly id = 'gmail';
  readonly displayName = 'Google Gmail';

  async getProfile(token: string): Promise<EmailUserProfile> {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch Gmail profile');
    }
    const data = await res.json();
    return {
      emailAddress: data.emailAddress,
      messagesTotal: data.messagesTotal,
      threadsTotal: data.threadsTotal,
      raw: data
    };
  }

  async getThread(
    token: string,
    threadId: string,
    userEmail?: string
  ): Promise<{ messages: EmailThreadMessage[]; subject: string }> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch thread ${threadId}`);
    }

    const data = await res.json();
    const rawMessages: any[] = data.messages || [];
    let threadSubject = '';

    const parsedMessages: EmailThreadMessage[] = rawMessages.map(msg => {
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) => {
        const h = headers.find((item: any) => item.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };

      const from = getHeader('From');
      const to = getHeader('To');
      const subject = getHeader('Subject');
      if (!threadSubject && subject) threadSubject = subject;
      const date = getHeader('Date') || new Date(parseInt(msg.internalDate || '0', 10)).toISOString();
      const messageIdHeader = getHeader('Message-ID') || getHeader('Message-Id');

      const cleanSender = extractCleanEmail(from);
      const cleanUser = userEmail ? userEmail.trim().toLowerCase() : '';
      const isFromLead = cleanUser ? cleanSender !== cleanUser : !cleanSender.includes(cleanUser);

      const bodies = extractBodyFromPayload(msg.payload);

      return {
        id: msg.id,
        threadId: msg.threadId || threadId,
        from,
        to,
        date,
        subject,
        snippet: msg.snippet || '',
        bodyHtml: bodies.html,
        bodyText: bodies.text,
        isFromLead,
        messageIdHeader
      };
    });

    return { messages: parsedMessages, subject: threadSubject };
  }

  async checkThreadForReply(params: EmailCheckReplyParams): Promise<EmailCheckReplyResult> {
    const { token, threadId, leadEmail, userEmail, lastSentDate } = params;
    if (!threadId) {
      return { hasReplied: false, allMessages: [] };
    }

    const { messages } = await this.getThread(token, threadId, userEmail);
    const cleanLeadEmail = leadEmail.trim().toLowerCase();

    // Find any message sent by the lead
    const leadReplies = messages.filter(m => {
      const cleanSender = extractCleanEmail(m.from);
      const isLeadMatch = cleanSender === cleanLeadEmail || cleanSender.includes(cleanLeadEmail);
      return isLeadMatch || m.isFromLead;
    });

    if (leadReplies.length === 0) {
      return { hasReplied: false, allMessages: messages };
    }

    // If lastSentDate is provided, verify reply came after or at that date
    const latestReply = leadReplies[leadReplies.length - 1];

    if (lastSentDate) {
      const lastSentTimestamp = new Date(lastSentDate.includes('T') ? lastSentDate : lastSentDate + 'T00:00:00').getTime();
      const replyTimestamp = new Date(latestReply.date).getTime();

      // Give 60-second margin for clock discrepancies
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

  async sendStageEmail(params: EmailSendParams): Promise<EmailSendResult> {
    const { token, lead, template, userEmail, senderName, trackingBaseUrl } = params;

    const renderedSubject = renderEmailMergeTags(template.subject, lead, senderName);
    const rawHtml = renderEmailMergeTags(template.bodyHtml, lead, senderName);

    // Inject tracking pixel and wrap hyperlinks
    const renderedHtml = wrapLinksAndEmbedTrackingPixel(rawHtml, lead, template.stage, trackingBaseUrl);

    let inReplyToHeader = '';
    let referencesHeader = '';
    let actualSubject = renderedSubject;

    // If there's an existing thread, fetch message headers to properly thread the reply
    if (lead.threadId) {
      try {
        const threadData = await this.getThread(token, lead.threadId, userEmail);
        if (threadData.messages.length > 0) {
          const lastMessage = threadData.messages[threadData.messages.length - 1];
          if (lastMessage.messageIdHeader) {
            inReplyToHeader = lastMessage.messageIdHeader;
            const allMsgIds = threadData.messages
              .map(m => m.messageIdHeader)
              .filter(Boolean);
            referencesHeader = allMsgIds.join(' ');
          }
          if (threadData.subject) {
            actualSubject = threadData.subject.startsWith('Re:')
              ? threadData.subject
              : `Re: ${threadData.subject}`;
          }
        }
      } catch (e) {
        console.warn('Could not fetch existing thread to reply into, sending with threadId:', e);
      }
    }

    // Construct standard RFC 2822 email message with inline HTML
    const emailLines: string[] = [
      `To: ${lead.email}`,
      `From: "${senderName}" <${userEmail}>`,
      `Subject: ${actualSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8'
    ];

    if (inReplyToHeader) {
      emailLines.push(`In-Reply-To: ${inReplyToHeader}`);
    }
    if (referencesHeader) {
      emailLines.push(`References: ${referencesHeader}`);
    }

    emailLines.push(''); // Empty line separates headers from body
    emailLines.push(renderedHtml);

    const rawMime = emailLines.join('\r\n');
    const encodedRaw = base64UrlEncode(rawMime);

    const requestBody: { raw: string; threadId?: string } = {
      raw: encodedRaw
    };

    if (lead.threadId) {
      requestBody.threadId = lead.threadId;
    }

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gmail send failed: ${sendRes.statusText}`);
    }

    const result = await sendRes.json();
    return {
      messageId: result.id,
      threadId: result.threadId || lead.threadId || result.id,
      sentSubject: actualSubject
    };
  }
}
