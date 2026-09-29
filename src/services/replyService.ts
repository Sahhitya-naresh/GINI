import { Lead } from '../types';
import { checkThreadForLeadReply } from './outlookService';
import { updateLead } from './leadBackendService';

export interface ReplyCheckResult {
  hasReplied: boolean;
  updatedLead?: Lead;
}

/**
 * Shared function that checks a lead for a reply and, if found,
 * sets its status to 'Replied' and saves it to MongoDB.
 * Reuses the existing check logic the Check Reply button already calls.
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
    const updated: Lead = {
      ...lead,
      status: 'Replied',
      notes: lead.notes ? `${lead.notes} | [Reply detected]` : 'Reply detected'
    };

    // Save to MongoDB
    const savedLead = await updateLead(updated, undefined, spreadsheetId || undefined);
    return {
      hasReplied: true,
      updatedLead: savedLead
    };
  }

  return { hasReplied: false };
}
