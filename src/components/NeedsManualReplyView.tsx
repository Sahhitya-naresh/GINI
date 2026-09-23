import React from 'react';
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
}

export const NeedsManualReplyView: React.FC<NeedsManualReplyViewProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus
}) => {
  const repliedLeads = leads.filter(l => l.status === 'Replied');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Header - Red and White */}
      <div className="bg-red-600 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3 border border-white/30">
            <Flame className="w-3.5 h-3.5 fill-current text-white" />
            <span>High-Priority Inbound Queue</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Needs Manual Reply ({repliedLeads.length})
          </h2>
          <p className="text-sm text-red-100 mt-2 leading-relaxed">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repliedLeads.map((lead, idx) => (
            <div
              key={lead.leadId || `replied-lead-${lead.email || ''}-${idx}`}
              className="bg-white rounded-xl border border-red-200 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
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
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Gmail Thread</span>
                  </button>

                  {lead.threadId && (
                    <a
                      href={`https://mail.google.com/mail/u/0/#inbox/${lead.threadId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Open in Gmail"
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
