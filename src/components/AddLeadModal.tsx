import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { Lead } from '../types';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Lead) => Promise<void>;
  existingCount: number;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  existingCount
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [nextSendDate, setNextSendDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [leadId, setLeadId] = useState(`LEAD-${String(existingCount + 1).padStart(3, '0')}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError('Please provide Name, Email, and Company.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const newLead: Lead = {
      leadId: leadId.trim() || `LEAD-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      painPoint: painPoint.trim(),
      currentStage,
      status: 'Active',
      lastEmailSentDate: '',
      nextSendDate,
      threadId: '',
      notes: notes.trim()
    };

    try {
      await onAddLead(newLead);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        id="add-lead-modal-dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-6 border-b border-red-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Prospect Lead</h2>
              <p className="text-xs text-slate-500">Will be appended to your Google Sheet database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead ID</label>
              <input
                type="text"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Samantha Wright"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="samantha@acme.com"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pain Point(s) (Used in merge field <code className="text-red-600 font-mono">{'{{pain_point}}'}</code>)
            </label>
            <input
              type="text"
              value={painPoint}
              onChange={(e) => setPainPoint(e.target.value)}
              placeholder="e.g. slow response rates & manual outbound bottlenecks"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Starting Stage</label>
              <select
                value={currentStage}
                onChange={(e) => setCurrentStage(parseInt(e.target.value, 10))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value={0}>Stage 0 (Ready for Intro send)</option>
                <option value={1}>Stage 1 (Intro already sent)</option>
                <option value={2}>Stage 2 (Value Prop already sent)</option>
                <option value={3}>Stage 3 (Proof sent)</option>
                <option value={4}>Stage 4 (Solution sent)</option>
                <option value={5}>Stage 5 (Pricing sent)</option>
                <option value={6}>Stage 6 (Follow-up sent)</option>
                <option value={7}>Stage 7 (Break-up sent)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Send Date</label>
              <input
                type="date"
                value={nextSendDate}
                onChange={(e) => setNextSendDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">CRM Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, referral source, or research notes..."
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-lg shadow-xs shadow-red-500/20"
            >
              {isSubmitting ? 'Saving to Sheets...' : 'Save Lead to Google Sheets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
