import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, ArrowRight, ArrowLeft, Check, FileText, UserCheck } from 'lucide-react';
import { Lead, CampaignWorkflow, TemplateSet } from '../types';
import { getCampaignTemplateSet, getUserTemplateSet } from '../services/templateService';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Lead) => Promise<void>;
  existingLeads?: Lead[];
  existingLeadsCount?: number;
  existingCount?: number;
  campaigns?: CampaignWorkflow[];
  currentUser?: { id: string; name?: string } | null;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  existingLeads,
  existingLeadsCount,
  existingCount,
  campaigns = [],
  currentUser
}) => {
  const computeNextLeadId = (): string => {
    let maxId = 100;
    if (Array.isArray(existingLeads) && existingLeads.length > 0) {
      existingLeads.forEach(l => {
        const m = String(l?.leadId || '').match(/LEAD-(\d+)/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxId) maxId = n;
        }
      });
      return `LEAD-${maxId + 1}`;
    }
    const countVal = Number(existingLeadsCount ?? existingCount ?? 0);
    const safeCount = !isNaN(countVal) && countVal >= 0 ? countVal : 0;
    return `LEAD-${100 + safeCount + 1}`;
  };

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(''); // '' = No campaign
  const [painPoint, setPainPoint] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [nextSendDate, setNextSendDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [leadId, setLeadId] = useState(computeNextLeadId);
  const [templateSource, setTemplateSource] = useState<'campaign' | 'own'>('campaign');
  const [isLeadTicked, setIsLeadTicked] = useState<boolean>(true);

  // Template sets for stage 1 preview
  const [campaignTplSet, setCampaignTplSet] = useState<TemplateSet | null>(null);
  const [userTplSet, setUserTplSet] = useState<TemplateSet | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setEmail('');
      setCompany('');
      setSelectedCampaignId('');
      setPainPoint('');
      setNotes('');
      setCurrentStage(0);
      setNextSendDate(new Date().toISOString().split('T')[0]);
      setLeadId(computeNextLeadId());
      setTemplateSource('campaign');
      setIsLeadTicked(true);
      setError(null);
    }
  }, [isOpen]);

  // Load preview templates when moving to step 2 with a campaign
  useEffect(() => {
    if (step === 2 && selectedCampaignId) {
      getCampaignTemplateSet(selectedCampaignId)
        .then(setCampaignTplSet)
        .catch(() => setCampaignTplSet(null));
      getUserTemplateSet(currentUser?.id || 'current')
        .then(setUserTplSet)
        .catch(() => setUserTplSet(null));
    }
  }, [step, selectedCampaignId, currentUser?.id]);

  if (!isOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError('Please provide Name, Email, and Company.');
      return;
    }

    setError(null);

    // If "No campaign" is chosen: no step 2 needed! Directly create lead
    if (!selectedCampaignId || selectedCampaignId === 'NO_CAMPAIGN') {
      executeCreateLead('own', '');
      return;
    }

    // A campaign is chosen -> Advance to Step 2
    setStep(2);
  };

  const executeCreateLead = async (chosenSource: 'campaign' | 'own', campId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const chosenCampaign = campaigns.find(c => c.id === campId);
    const campaignName = chosenCampaign ? chosenCampaign.name : 'No campaign';
    const finalCampaignId = chosenCampaign ? chosenCampaign.id : '';

    // Find first actionable node of chosen campaign
    let firstNodeId: string | undefined = undefined;
    if (chosenCampaign) {
      const nodes = (chosenCampaign as any).workflow_graph?.nodes || chosenCampaign.nodes || [];
      const edges = (chosenCampaign as any).workflow_graph?.edges || chosenCampaign.edges || [];
      const startNode = nodes.find((n: any) => n.data?.nodeType === 'start' || n.type === 'start' || n.type === 'startNode');
      if (startNode) {
        const firstEdge = edges.find((e: any) => e.source === startNode.id);
        firstNodeId = firstEdge ? firstEdge.target : startNode.id;
      } else if (nodes.length > 0) {
        firstNodeId = nodes[0].id;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const newLead: Lead = {
      leadId: leadId.trim() || `LEAD-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      painPoint: painPoint.trim(),
      campaign: campaignName,
      campaignId: finalCampaignId,
      templateSource: chosenSource,
      currentStage,
      status: 'Active',
      lastEmailSentDate: '',
      nextSendDate,
      threadId: '',
      currentNodeId: firstNodeId,
      nodeEnteredDate: firstNodeId ? todayStr : undefined,
      notes: notes.trim(),
      opensCount: 0,
      clicksCount: 0,
      hasReplied: false
    } as any;

    try {
      await onAddLead(newLead);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCreateLead(templateSource, selectedCampaignId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        id="add-lead-modal-dialog"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-5 border-b border-red-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 1 ? 'Add New Prospect Lead (Step 1)' : 'Choose Template Source (Step 2)'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1 ? 'Step 1: Lead details & campaign assignment' : 'Step 2: Assign campaign or personal template'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 FORM */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="p-6 space-y-4 overflow-y-auto">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Assignment *
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">No campaign (Skips Step 2, uses personal templates)</option>
                {campaigns.map(c => {
                  const isActive = Boolean(c.is_active ?? (c as any).isActive);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({isActive ? 'Active' : 'Inactive'})
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Selecting a campaign activates Step 2 to choose between Campaign templates and Personal templates.
              </p>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Pain Point</label>
              <input
                type="text"
                value={painPoint}
                onChange={(e) => setPainPoint(e.target.value)}
                placeholder="e.g. 40% drops in outbound demo booking conversion"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Outreach Date</label>
                <input
                  type="date"
                  value={nextSendDate}
                  onChange={(e) => setNextSendDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional context"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                {selectedCampaignId ? (
                  <>
                    <span>Next: Choose Template (Step 2)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <span>Add Lead (No Campaign)</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: TEMPLATE SELECTION FOR CAMPAIGN LEADS */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="p-6 space-y-4 overflow-y-auto">
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-950">
              <strong className="font-semibold">Step 2: Assign Template Source</strong>
              <p className="text-[11px] text-red-800 mt-0.5">
                Campaign selected: <strong>{campaigns.find(c => c.id === selectedCampaignId)?.name || 'Campaign'}</strong>.
                Choose whether this lead runs on the campaign's sequence or your personal sequence.
              </p>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Template Choice:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeadTicked(true);
                    setTemplateSource('campaign');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-colors ${
                    templateSource === 'campaign'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Use campaign template for all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLeadTicked(true);
                    setTemplateSource('own');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-colors ${
                    templateSource === 'own'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Use my template for all
                </button>
              </div>
            </div>

            {/* Lead list / row */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/50 rounded-t-xl text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLeadTicked}
                    onChange={(e) => setIsLeadTicked(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">{name} ({company})</span>
                    <span className="text-[11px] text-slate-500">{email}</span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  <select
                    value={templateSource}
                    onChange={(e) => {
                      setTemplateSource(e.target.value as 'campaign' | 'own');
                      setIsLeadTicked(true);
                    }}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="campaign">Campaign Template</option>
                    <option value="own">My Personal Template</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Side-by-side or Tab Preview of Stage 1 Subject & Body */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Stage 1 Preview Comparison
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Campaign Template Stage 1 */}
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                  templateSource === 'campaign'
                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      Campaign Template
                    </span>
                    {templateSource === 'campaign' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Subject: <span className="font-mono text-slate-900">{campaignTplSet?.stages[0]?.subject || 'Introduction {{company}}'}</span>
                  </div>
                  <div 
                    className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-24 overflow-y-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: campaignTplSet?.stages[0]?.bodyHtml || '<p>Hi {{first_name}}, reaching out regarding...</p>' }}
                  />
                </div>

                {/* My Personal Template Stage 1 */}
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                  templateSource === 'own'
                    ? 'border-red-500 bg-red-50/30 ring-1 ring-red-400'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-red-600" />
                      My Personal Template
                    </span>
                    {templateSource === 'own' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-600 text-white font-bold">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Subject: <span className="font-mono text-slate-900">{userTplSet?.stages[0]?.subject || 'Introduction {{company}}'}</span>
                  </div>
                  <div 
                    className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 max-h-24 overflow-y-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: userTplSet?.stages[0]?.bodyHtml || '<p>Hi {{first_name}}, reaching out regarding...</p>' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Step 1</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Adding...' : 'Confirm & Add Lead'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
