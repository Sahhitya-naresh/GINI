import React from 'react';
import { Mail, ArrowRight, X, Building, CheckCircle } from 'lucide-react';
import { Lead } from '../types';

interface ReplyAlertModalProps {
  isOpen: boolean;
  leads: Lead[];
  onClose: () => void;
  onOpenLead: (lead: Lead) => void;
}

export const ReplyAlertModal: React.FC<ReplyAlertModalProps> = ({
  isOpen,
  leads,
  onClose,
  onOpenLead,
}) => {
  if (!isOpen || leads.length === 0) return null;

  const isSingle = leads.length === 1;
  const singleLead = leads[0];

  return (
    <div 
      id="reply-alert-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div 
        id="reply-alert-modal-dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start gap-4">
          <div className="p-3 rounded-full shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Mail className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1.5 ${
              singleLead.replySentiment === 'positive'
                ? 'bg-emerald-100 text-emerald-800'
                : singleLead.replySentiment === 'negative'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                {singleLead.replySentiment === 'positive'
                  ? 'Positive Prospect Reply'
                  : singleLead.replySentiment === 'negative'
                  ? 'Negative Reply (Do Not Contact)'
                  : 'Inbound Prospect Reply'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 truncate">
              {isSingle 
                ? `New reply from ${singleLead.name || singleLead.email}`
                : `${leads.length} new prospect replies detected`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSingle
                ? singleLead.replySentiment === 'positive'
                  ? 'Positive interest detected! Sequence halted. Active colleagues at the same company paused.'
                  : singleLead.replySentiment === 'negative'
                  ? 'Prospect indicated opt-out or refusal. Status set to "Negative Reply" (do not contact).'
                  : 'Sequence paused and the lead was moved to "Needs Manual Reply".'
                : 'Sequences have been halted and incoming replies processed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {isSingle ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">{singleLead.name}</span>
                <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {singleLead.email}
                </span>
              </div>
              {singleLead.company && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{singleLead.company}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.leadId || lead.email}
                  className="bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 rounded-xl p-3 flex items-center justify-between transition-colors group"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.email} {lead.company ? `• ${lead.company}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLead(lead);
                    }}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>View Lead</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Dismiss
          </button>
          {isSingle && (
            <button
              type="button"
              id="reply-alert-view-lead-btn"
              onClick={() => onOpenLead(singleLead)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shadow-emerald-500/20"
            >
              <span>View Lead Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
