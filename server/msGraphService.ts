/**
 * server/msGraphService.ts
 *
 * Implements Microsoft Graph API calls scoped to the fixed service account mailbox
 * using application-level (client credentials) authentication:
 * - Sending: POST /users/{MICROSOFT_GRAPH_SERVICE_ACCOUNT}/sendMail
 * - Reading/reply detection: GET /users/{MICROSOFT_GRAPH_SERVICE_ACCOUNT}/messages
 * - Service account profile and display metadata
 */

import { getAppAccessToken, getGraphConfig } from './msGraphAuth.ts';
import { renderEmailMergeTags } from '../src/data/defaultTemplates.ts';

export interface SendAppEmailParams {
  lead: {
    leadId?: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    painPoint?: string;
    jobTitle?: string;
    industry?: string;
    campaign?: string;
    threadId?: string;
    lastEmailSentDate?: string;
    currentStage?: number;
  };
  template: {
    stage: number;
    subject: string;
    bodyHtml: string;
    name?: string;
  };
  stageNum?: number;
  senderDisplayName?: string;
  baseUrl?: string;
}

export interface SendAppEmailResult {
  success: boolean;
  messageId: string;
  threadId: string;
  timestamp: string;
  to: string;
  subject: string;
  statusCode: number;
}

export interface CheckReplyParams {
  leadEmail: string;
  threadId?: string;
  lastSentDate?: string;
}

export interface CheckReplyResult {
  hasReplied: boolean;
  reason?: string;
  replyMessage?: {
    id: string;
    from: string;
    subject: string;
    receivedDateTime: string;
    bodyPreview?: string;
  };
}

/**
 * Wraps hyperlinks for click tracking and injects open tracking pixel
 */
export function wrapLinksAndEmbedTrackingPixel(
  htmlContent: string,
  lead: SendAppEmailParams['lead'],
  stage: number,
  baseUrl?: string
): string {
  const cleanBase = (baseUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const campaign = encodeURIComponent(lead.campaign || 'Default');
  const leadId = encodeURIComponent(lead.leadId || '');
  const leadEmail = encodeURIComponent(lead.email || '');

  // 1. Wrap hyperlinks with click tracking
  let modifiedHtml = htmlContent.replace(
    /<a\s+([^>]*?)href=(["'])(https?:\/\/[^"'\s>]+)\2([^>]*)>/gi,
    (_match, pre, quote, originalUrl, post) => {
      if (originalUrl.includes('/api/track/click')) return _match;
      const clickTrackUrl = `${cleanBase}/api/track/click?url=${encodeURIComponent(originalUrl)}&leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}`;
      return `<a ${pre}href=${quote}${clickTrackUrl}${quote}${post}>`;
    }
  );

  // 2. Embed 1x1 transparent tracking pixel
  const openTrackUrl = `${cleanBase}/api/track/open?leadId=${leadId}&email=${leadEmail}&stage=${stage}&campaign=${campaign}&t=${Date.now()}`;
  const pixelTag = `<div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;"><img src="${openTrackUrl}" width="1" height="1" border="0" alt="" style="display:none !important;width:1px;height:1px;border:0;" /></div>`;

  if (modifiedHtml.includes('</body>')) {
    modifiedHtml = modifiedHtml.replace('</body>', `${pixelTag}</body>`);
  } else {
    modifiedHtml += `\n${pixelTag}`;
  }

  return modifiedHtml;
}

/**
 * Sends a stage email via Microsoft Graph API using the fixed service account mailbox.
 * Uses: POST https://graph.microsoft.com/v1.0/users/{MICROSOFT_GRAPH_SERVICE_ACCOUNT}/sendMail
 */
export async function sendAppEmail(params: SendAppEmailParams): Promise<SendAppEmailResult> {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    throw new Error('MICROSOFT_GRAPH_SERVICE_ACCOUNT environment variable is not configured.');
  }

  const token = await getAppAccessToken();
  const stage = params.stageNum || params.template.stage || 1;
  const effectiveSenderName = params.senderDisplayName || config.displayName || 'Outreach Flow';

  // Render merge tags
  const renderedSubject = renderEmailMergeTags(params.template.subject, params.lead as any, effectiveSenderName);
  const renderedBody = renderEmailMergeTags(params.template.bodyHtml, params.lead as any, effectiveSenderName);
  const finalHtmlBody = wrapLinksAndEmbedTrackingPixel(renderedBody, params.lead, stage, params.baseUrl);

  // Microsoft Graph sendMail endpoint for the fixed service account mailbox
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;

  const emailMessage: any = {
    message: {
      subject: renderedSubject,
      body: {
        contentType: 'HTML',
        content: finalHtmlBody
      },
      toRecipients: [
        {
          emailAddress: {
            address: params.lead.email.trim(),
            name: params.lead.name || params.lead.firstName || params.lead.email.split('@')[0]
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: effectiveSenderName
        }
      }
    },
    saveToSentItems: true
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailMessage)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr: any;
    try {
      parsedErr = JSON.parse(errorText);
    } catch {
      parsedErr = { error: { message: errorText } };
    }
    const msg = parsedErr.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${msg}`);
  }

  const threadId = params.lead.threadId || `graph-conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const messageId = `graph-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return {
    success: true,
    messageId,
    threadId,
    timestamp: new Date().toISOString(),
    to: params.lead.email,
    subject: renderedSubject,
    statusCode: response.status
  };
}

/**
 * Checks the fixed service account mailbox for prospect replies.
 * Uses: GET https://graph.microsoft.com/v1.0/users/{MICROSOFT_GRAPH_SERVICE_ACCOUNT}/messages
 */
export async function checkAppThreadForReply(params: CheckReplyParams): Promise<CheckReplyResult> {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    return { hasReplied: false, reason: 'Service account mailbox not configured' };
  }

  const cleanLeadEmail = (params.leadEmail || '').trim().toLowerCase();
  if (!cleanLeadEmail) {
    return { hasReplied: false, reason: 'Missing lead email' };
  }

  const token = await getAppAccessToken();
  const serviceAccount = config.serviceAccount;

  // Strategy 1: Check by conversationId if present
  if (params.threadId && !params.threadId.startsWith('graph-conv-')) {
    try {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=conversationId eq '${encodeURIComponent(params.threadId)}'&$top=20&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const messages: any[] = data.value || [];

        for (const msg of messages) {
          const senderEmail = (msg.from?.emailAddress?.address || '').toLowerCase().trim();
          if (senderEmail === cleanLeadEmail) {
            // Check lastSentDate if provided
            if (params.lastSentDate) {
              const msgDate = new Date(msg.receivedDateTime).getTime();
              const sentDate = new Date(params.lastSentDate).getTime();
              if (msgDate < sentDate - 60000) {
                continue;
              }
            }
            return {
              hasReplied: true,
              reason: `Reply received from ${cleanLeadEmail} in conversation ${params.threadId}`,
              replyMessage: {
                id: msg.id,
                from: msg.from?.emailAddress?.address || cleanLeadEmail,
                subject: msg.subject || '',
                receivedDateTime: msg.receivedDateTime,
                bodyPreview: msg.bodyPreview
              }
            };
          }
        }
      }
    } catch (err) {
      console.warn('[MS Graph] Conversation reply check failed:', err);
    }
  }

  // Strategy 2: Check messages directly received from lead email
  try {
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(serviceAccount)}/messages?$filter=from/emailAddress/address eq '${encodeURIComponent(cleanLeadEmail)}'&$top=5&$select=id,conversationId,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      const messages: any[] = data.value || [];

      for (const msg of messages) {
        if (params.lastSentDate) {
          const msgDate = new Date(msg.receivedDateTime).getTime();
          const sentDate = new Date(params.lastSentDate).getTime();
          if (msgDate < sentDate - 60000) {
            continue;
          }
        }

        return {
          hasReplied: true,
          reason: `Reply message detected from prospect ${cleanLeadEmail}`,
          replyMessage: {
            id: msg.id,
            from: msg.from?.emailAddress?.address || cleanLeadEmail,
            subject: msg.subject || '',
            receivedDateTime: msg.receivedDateTime,
            bodyPreview: msg.bodyPreview
          }
        };
      }
    }
  } catch (err) {
    console.warn('[MS Graph] Direct sender reply check failed:', err);
  }

  return { hasReplied: false };
}

/**
 * Returns service account configuration details for frontend UI
 */
export function getServiceAccountProfile() {
  const config = getGraphConfig();
  const isConfigured = Boolean(
    config.tenantId && config.clientId && config.clientSecret && config.serviceAccount
  );

  return {
    serviceAccount: config.serviceAccount,
    displayName: config.displayName || 'Service Account Mailbox',
    isConfigured,
    provider: 'outlook' as const
  };
}

/**
 * Sends a standalone test email to verify credentials and mailbox connectivity
 */
export async function sendDirectTestEmail(to: string, customSubject?: string, customBody?: string) {
  const config = getGraphConfig();
  if (!config.serviceAccount) {
    throw new Error('MICROSOFT_GRAPH_SERVICE_ACCOUNT environment variable is not configured.');
  }

  const token = await getAppAccessToken();
  const subject = customSubject || `Outreach Flow Test: App-Only Microsoft Graph Service Account [${new Date().toLocaleTimeString()}]`;
  const bodyContent = customBody || `
    <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #2563eb;">Outreach Flow - Microsoft Graph Service Account Test</h2>
      <p>This email confirms that application-only (client credentials) authentication and mailbox sending are working properly.</p>
      <ul>
        <li><strong>Sending Mailbox:</strong> ${config.serviceAccount}</li>
        <li><strong>Display Name:</strong> ${config.displayName}</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
      <p style="color: #64748b; font-size: 13px;">Sent automatically via Microsoft Graph POST /users/{serviceAccount}/sendMail.</p>
    </div>
  `;

  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.serviceAccount)}/sendMail`;

  const emailMessage = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: bodyContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: to.trim()
          }
        }
      ],
      from: {
        emailAddress: {
          address: config.serviceAccount,
          name: config.displayName
        }
      }
    },
    saveToSentItems: true
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailMessage)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = { error: { message: errorText } };
    }
    throw new Error(`Test email failed (${response.status}): ${parsed.error?.message || errorText}`);
  }

  return {
    success: true,
    statusCode: response.status,
    sentTo: to,
    from: config.serviceAccount,
    timestamp: new Date().toISOString()
  };
}
