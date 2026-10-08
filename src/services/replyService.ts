import { Lead } from '../types';
import { checkThreadForLeadReply } from './outlookService';
import { updateLead } from './leadBackendService';

export interface ReplyCheckResult {
  hasReplied: boolean;
  updatedLead?: Lead;
  classification?: any;
  pausedCompanyLeadsCount?: number;
  pendingConfirmation?: any;
}

/**
 * Shared function that checks a lead for a reply and, if found,
 * sets its status (Replied or Negative Reply) and saves it to MongoDB
 * through the server's shared applyLeadReply logic.
 */
export async function checkLeadForReplyAndSave(
  lead: Lead,
  userEmail?: string,
  spreadsheetId?: string
): Promise<ReplyCheckResult> {
  if (!lead.threadId && !lead.email) {
    return { hasReplied: false };
  }

  const res = await checkThreadForLeadReply(
    undefined,
    lead.threadId,
    lead.email,
    userEmail,
    lead.lastEmailSentDate
  );

  if (res.hasReplied) {
    // If the server's shared applyLeadReply already classified and updated the lead:
    if ((res as any).updatedLead) {
      return {
        hasReplied: true,
        updatedLead: (res as any).updatedLead,
        classification: (res as any).classification,
        pausedCompanyLeadsCount: (res as any).pausedCompanyLeadsCount,
        pendingConfirmation: (res as any).pendingConfirmation
      };
    }

    const sentiment = (res as any).classification?.sentiment || (lead.replySentiment === 'negative' ? 'negative' : 'neutral');
    const isNegative = sentiment === 'negative' || lead.status === 'Negative Reply';
    const updated: Lead = {
      ...lead,
      status: isNegative ? 'Negative Reply' : 'Replied',
      replySentiment: sentiment,
      replyMatchedPhrases: (res as any).classification?.matchedPhrases || lead.replyMatchedPhrases,
      replyReason: (res as any).classification?.reason || lead.replyReason,
      notes: lead.notes
        ? (lead.notes.toLowerCase().includes('reply detected') ? lead.notes : `${lead.notes} | [Reply detected]`)
        : 'Reply detected'
    };

    // Save to MongoDB
    const savedLead = await updateLead(updated, undefined, spreadsheetId || undefined);
    return {
      hasReplied: true,
      updatedLead: savedLead,
      classification: (res as any).classification
    };
  }

  return { hasReplied: false };
}
