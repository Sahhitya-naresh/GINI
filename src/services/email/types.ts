import { Lead, StageTemplate, EmailThreadMessage } from '../../types';

export type EmailProviderType = 'gmail' | 'outlook' | 'smtp' | string;

export interface EmailUserProfile {
  emailAddress: string;
  displayName?: string;
  messagesTotal?: number;
  threadsTotal?: number;
  raw?: any;
}

export interface EmailSendParams {
  token: string;
  lead: Lead;
  template: StageTemplate;
  userEmail: string;
  senderName: string;
  trackingBaseUrl?: string;
}

export interface EmailSendResult {
  messageId: string;
  threadId: string;
  sentSubject: string;
}

export interface EmailCheckReplyParams {
  token: string;
  threadId: string;
  leadEmail: string;
  userEmail: string;
  lastSentDate?: string;
}

export interface EmailCheckReplyResult {
  hasReplied: boolean;
  replyMessage?: EmailThreadMessage;
  allMessages: EmailThreadMessage[];
}

/**
 * Generic EmailProvider interface allowing swappable email backends (Gmail, Outlook, etc.)
 */
export interface EmailProvider {
  readonly id: EmailProviderType;
  readonly displayName: string;

  /**
   * Fetches user profile / sender email info from provider
   */
  getProfile(token: string): Promise<EmailUserProfile>;

  /**
   * Fetches and parses an entire thread
   */
  getThread(
    token: string,
    threadId: string,
    userEmail?: string
  ): Promise<{ messages: EmailThreadMessage[]; subject: string }>;

  /**
   * Checks whether the recipient has replied in the thread
   */
  checkThreadForReply(params: EmailCheckReplyParams): Promise<EmailCheckReplyResult>;

  /**
   * Dispatches stage email through provider, wrapping links and embedding tracking
   */
  sendStageEmail(params: EmailSendParams): Promise<EmailSendResult>;
}
