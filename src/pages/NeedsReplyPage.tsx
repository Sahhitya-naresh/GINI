import React, { useState } from 'react';
import { Lead } from '../types';
import { 
  Building2, 
  Mail, 
  ExternalLink, 
  CheckCircle2, 
  Eye, 
  Flame
} from 'lucide-react';

interface NeedsManualReplyViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (lead: Lead, newStatus: Lead['status']) => void;
  onOverrideSentiment?: (lead: Lead, sentiment: 'positive' | 'negative' | 'neutral') => void;
}

export const NeedsManualReplyView: React.FC<NeedsManualReplyViewProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onOverrideSentiment
}) => {
  const repliedLeads = leads.filter(l => l.status === 'Replied');

  return (
    <div className="space-y-4 w-full pb-8">
      {/* Hero Header - Amber to White Gradient */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-50 text-slate-900 border border-amber-200/80 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-600/15 text-amber-900 text-xs font-semibold mb-3 border border-amber-500/30">
            <Flame className="w-3.5 h-3.5 fill-current text-amber-700" />
            <span>High-Priority Inbound Queue</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Needs Manual Reply ({repliedLeads.length})
          </h2>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
            These leads replied to one of your outreach stages! The automated sequence was permanently stopped for each of them so you can handle the relationship personally.
          </p>
        </div>
      </div>

      {repliedLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-100 p-12 text-center shadow-2xs">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">All Replies Handled!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            No leads currently waiting for manual follow-up. When active leads reply to your emails, they will immediately be stopped from future automated stages and displayed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repliedLeads.map((lead, idx) => (
            <div
              key={lead.leadId || `replied-lead-${lead.email || ''}-${idx}`}
              className={`rounded-xl border shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between ${
                lead.replySentiment === 'negative' ? 'bg-red-50/50 border-red-300' : 'bg-white border-red-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{lead.name}</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {lead.leadId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {lead.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {lead.email}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-800 border border-red-200 rounded-full shrink-0">
                    Stage {lead.currentStage} Replied
                  </span>
                </div>

                {/* Pain Point summary */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="text-slate-400 block font-medium mb-0.5">Target Pain Point:</span>
                  <p className="text-slate-800 font-medium italic">
                    "{lead.painPoint || 'General workflow bottlenecks'}"
                  </p>
                </div>

                {/* Notes or snippet if available */}
                {lead.notes && (
                  <p className="text-xs text-slate-600 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/60 line-clamp-2">
                    <strong className="text-amber-900 font-semibold">Notes: </strong>
                    {lead.notes}
                  </p>
                )}

                {/* Detected Sentiment & Matched Phrases */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Detected Sentiment:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      lead.replySentiment === 'positive'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : lead.replySentiment === 'negative'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-slate-200 text-slate-800'
                    }`}>
                      {lead.replySentiment ? lead.replySentiment.toUpperCase() : 'NEUTRAL'} ({lead.replyClassifiedBy || 'auto'})
                    </span>
                  </div>

                  {lead.replyMatchedPhrases && lead.replyMatchedPhrases.length > 0 && (
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400 font-medium">Phrases: </span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                        {lead.replyMatchedPhrases.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Manual Override Buttons */}
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOverrideSentiment?.(lead, 'positive')}
                      className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-colors border ${
                        lead.replySentiment === 'positive'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      Mark Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => onOverrideSentiment?.(lead, 'negative')}
                      className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-colors border ${
                        lead.replySentiment === 'negative'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      Mark Negative
                    </button>
                    <button
                      type="button"
                      onClick={() => onOverrideSentiment?.(lead, 'neutral')}
                      className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-colors border ${
                        lead.replySentiment === 'neutral'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      Mark Neutral
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Email Thread</span>
                  </button>

                  {lead.threadId && (
                    <a
                      href={`https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(lead.threadId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Open in Outlook"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateStatus(lead, 'Completed')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Mark lead as deal won or completed"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => onUpdateStatus(lead, 'Active')}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Resume automated sequencing"
                  >
                    Resume Sequence
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NeedsReplyPage = NeedsManualReplyView;

