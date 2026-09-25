import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Pause, 
  Play, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  Building2, 
  Mail, 
  CheckCircle2, 
  Save, 
  Edit3,
  Eye,
  MousePointer,
  Briefcase,
  Globe,
  Tag,
  Trash2,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';
import { Lead, StageTemplate, EmailThreadMessage } from '../types';
import { getOutlookThread } from '../services/outlookService';
import { formatDisplayDate } from '../utils/dateUtils';
import { recordTrackingEvent } from '../services/trackingService';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  templates: StageTemplate[];
  token: string | null;
  userEmail: string;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
  onTogglePause: (lead: Lead) => void;
  onSendNextStage: (lead: Lead) => void;
  onCheckReply: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  templates,
  token,
  userEmail,
  onUpdateLead,
  onDeleteLead,
  onTogglePause,
  onSendNextStage,
  onCheckReply
}) => {
  const [threadMessages, setThreadMessages] = useState<EmailThreadMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedPainPoint, setEditedPainPoint] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSimulatingTracking, setIsSimulatingTracking] = useState(false);

  const handleSimulateTracking = async (type: 'open' | 'click') => {
    if (!lead || isSimulatingTracking) return;
    setIsSimulatingTracking(true);
    try {
      await recordTrackingEvent({
        type,
        leadId: lead.leadId,
        stage: lead.currentStage || 1,
        campaign: lead.campaign
      });
      const now = new Date().toISOString();
      if (type === 'open') {
        onUpdateLead({
          ...lead,
          opensCount: (lead.opensCount || 0) + 1,
          lastOpenedDate: now,
          firstOpenedDate: lead.firstOpenedDate || now
        });
      } else {
        onUpdateLead({
          ...lead,
          clicksCount: (lead.clicksCount || 0) + 1,
          lastClickedDate: now,
          firstClickedDate: lead.firstClickedDate || now
        });
      }
    } catch (e) {
      console.warn('Simulation error:', e);
    } finally {
      setIsSimulatingTracking(false);
    }
  };

  useEffect(() => {
    if (lead) {
      setEditedNotes(lead.notes || '');
      setEditedPainPoint(lead.painPoint || '');
      if (lead.threadId && token) {
        loadThread();
      } else {
        setThreadMessages([]);
      }
    }
  }, [lead, token]);

  if (!isOpen || !lead) return null;

  const loadThread = async () => {
    if (!lead.threadId || !token) return;
    setIsLoadingThread(true);
    setThreadError(null);
    try {
      const data = await getOutlookThread(token, lead.threadId, userEmail);
      setThreadMessages(data.messages);
    } catch (err: any) {
      console.error('Failed to load email thread:', err);
      setThreadError(err.message || 'Could not fetch thread messages from Outlook.');
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleSaveNotes = () => {
    onUpdateLead({
      ...lead,
      notes: editedNotes,
      painPoint: editedPainPoint
    });
    setIsEditingNotes(false);
  };

  const getStatusBadge = () => {
    switch (lead.status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Replied':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 animate-pulse">Replied &bull; Manual Follow-up</span>;
      case 'Paused':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Paused</span>;
      case 'Broke Up':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Broke Up</span>;
      case 'Completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{lead.status}</span>;
    }
  };

  const nextStageNum = lead.currentStage + 1;
  const nextTemplate = templates.find(t => t.stage === nextStageNum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div 
        id="lead-detail-modal-container"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-red-100 bg-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                {lead.leadId}
              </span>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {lead.company}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${lead.email}`} className="text-red-600 hover:underline">
                  {lead.email}
                </a>
              </span>
              {lead.threadId && (
                <span className="font-mono text-[11px] text-slate-400">
                  Thread ID: {lead.threadId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7-Stage Horizontal Stepper */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px] gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((stageNum) => {
              const template = templates.find(t => t.stage === stageNum);
              const isPast = lead.currentStage >= stageNum;
              const isCurrent = lead.currentStage === stageNum - 1 && lead.status === 'Active';
              
              return (
                <div key={stageNum} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPast
                          ? 'bg-red-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-red-600 text-white ring-4 ring-red-100 animate-pulse'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : stageNum}
                    </div>
                    <span className={`text-[11px] mt-1.5 font-medium truncate max-w-[80px] ${
                      isPast ? 'text-red-900 font-semibold' : isCurrent ? 'text-red-600 font-bold' : 'text-slate-400'
                    }`}>
                      {template?.name || `Stage ${stageNum}`}
                    </span>
                  </div>

                  {stageNum < 7 && (
                    <div className={`h-0.5 w-6 sm:w-10 mx-1 ${isPast ? 'bg-red-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body content with 2 sections: Left details/notes, Right Email Thread */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Metadata & Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Quick Action Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Campaign Controls</h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTogglePause(lead)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    lead.status === 'Paused'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                  }`}
                >
                  {lead.status === 'Paused' ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Sequence</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Sequence</span>
                    </>
                  )}
                </button>

                {lead.threadId && (
                  <button
                    onClick={() => onCheckReply(lead)}
                    className="py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1.5"
                    title="Poll Gmail for lead replies"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                    <span>Check Reply</span>
                  </button>
                )}
              </div>

              {/* Next Stage Send Action */}
              {nextStageNum <= 7 && lead.status !== 'Replied' && lead.status !== 'Broke Up' && (
                <button
                  onClick={() => onSendNextStage(lead)}
                  disabled={lead.status === 'Paused'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-lg shadow-xs shadow-red-500/20 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Stage {nextStageNum} ({nextTemplate?.name}) Now</span>
                </button>
              )}

              {lead.status === 'Replied' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-950 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Automated sequence stopped:</strong> A reply was detected from {lead.name}. Please follow up manually via Gmail.
                  </div>
                </div>
              )}
            </div>

            {/* Lead Extended Profile Card */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Lead Information</h3>
              {lead.jobTitle && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-400" /> Job Title:
                  </span>
                  <span className="font-semibold text-slate-900">{lead.jobTitle}</span>
                </div>
              )}
              {lead.industry && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" /> Industry:
                  </span>
                  <span className="font-medium text-slate-800">{lead.industry}</span>
                </div>
              )}
              {lead.campaign && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Campaign:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">{lead.campaign}</span>
                </div>
              )}
              {lead.currentNodeId && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Workflow Step:</span>
                  <span className="font-mono text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-semibold">
                    {lead.currentNodeId}
                  </span>
                </div>
              )}
              {lead.senderUsed && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Sender Account:</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{lead.senderUsed}</span>
                </div>
              )}
              {lead.linkedinUrl && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">LinkedIn:</span>
                  <a
                    href={lead.linkedinUrl.startsWith('http') ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium truncate max-w-[200px]"
                  >
                    <span>{lead.linkedinUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Email Engagement Tracking Card */}
            <div className="p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-red-600" />
                  <span>Email Engagement Tracking</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1" title="Public deployment required for external email clients">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Requires Public URL</span>
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium block">Total Opens</span>
                    <button
                      type="button"
                      onClick={() => handleSimulateTracking('open')}
                      disabled={isSimulatingTracking}
                      className="text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-medium transition-colors"
                      title="Test backend tracking pipeline locally"
                    >
                      + Test Open
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-blue-700">{lead.opensCount || 0}</span>
                    <span className="text-[10px] text-slate-400">times</span>
                  </div>
                  {lead.lastOpenedDate && (
                    <span className="text-[10px] text-slate-500 block truncate mt-1">
                      Last: {formatDisplayDate(lead.lastOpenedDate)}
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium block">Link Clicks</span>
                    <button
                      type="button"
                      onClick={() => handleSimulateTracking('click')}
                      disabled={isSimulatingTracking}
                      className="text-[10px] text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium transition-colors"
                      title="Test click tracking pipeline locally"
                    >
                      + Test Click
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-purple-700">{lead.clicksCount || 0}</span>
                    <span className="text-[10px] text-slate-400">clicks</span>
                  </div>
                  {lead.lastClickedDate && (
                    <span className="text-[10px] text-slate-500 block truncate mt-1">
                      Last: {formatDisplayDate(lead.lastClickedDate)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 bg-amber-50/70 border border-amber-200/70 rounded-lg flex items-start gap-1.5 text-[10.5px] text-amber-800 mt-2">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Tracking requires a public deployment:</strong> In the AI Studio sandbox, external email clients cannot load tracking pixels or redirects due to auth/cookie barriers. Deploy publicly to Cloud Run for live recipient tracking.
                </p>
              </div>
            </div>

            {/* Timing & Scheduling Card */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Schedule & Timing</h3>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-semibold text-slate-900">
                  {lead.currentStage === 0 ? '0 (Not Started)' : `Stage ${lead.currentStage} of 7`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Last Email Sent:</span>
                <span className="font-medium text-slate-800">{formatDisplayDate(lead.lastEmailSentDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Next Send Date:</span>
                <span className="font-semibold text-red-700">{formatDisplayDate(lead.nextSendDate)}</span>
              </div>
            </div>

            {/* Pain Point & Notes Box */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pain Point & Notes</h3>
                {!isEditingNotes ? (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save to Sheets</span>
                  </button>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">Lead Pain Point:</span>
                {isEditingNotes ? (
                  <input
                    type="text"
                    value={editedPainPoint}
                    onChange={(e) => setEditedPainPoint(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500"
                  />
                ) : (
                  <p className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-800 font-medium italic">
                    "{lead.painPoint || 'No pain point specified'}"
                  </p>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">CRM Notes:</span>
                {isEditingNotes ? (
                  <textarea
                    rows={3}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-red-500"
                  />
                ) : (
                  <p className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-700 min-h-[48px]">
                    {lead.notes || 'No notes added yet.'}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Right Gmail Thread View (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">Gmail Conversation Thread</h3>
              </div>

              {lead.threadId ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${lead.threadId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    <span>Open in Gmail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={loadThread}
                    disabled={isLoadingThread}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    title="Reload thread messages"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThread ? 'animate-spin text-red-600' : ''}`} />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Thread Content */}
            {!lead.threadId ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Sent Emails in Thread Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Stage 1 has not been dispatched to {lead.name} yet. When sent, a new Gmail thread will be initialized and tracked here automatically.
                </p>
                <button
                  onClick={() => onSendNextStage(lead)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs shadow-red-500/20"
                >
                  Send Stage 1 Email Now
                </button>
              </div>
            ) : isLoadingThread ? (
              <div className="p-12 text-center">
                <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading full Gmail thread...</p>
              </div>
            ) : threadError ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold mb-1">Could not fetch Gmail thread:</p>
                <p>{threadError}</p>
              </div>
            ) : threadMessages.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border">
                No messages found in this thread.
              </div>
            ) : (
              <div className="space-y-4">
                {threadMessages.map((msg, idx) => {
                  const isLeadReply = msg.isFromLead;
                  return (
                    <div
                      key={msg.id || idx}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        isLeadReply
                          ? 'bg-red-50/70 border-red-300 ring-1 ring-red-300/50'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Message Header */}
                      <div className={`p-3 text-xs flex items-center justify-between border-b ${
                        isLeadReply ? 'bg-red-100/60 border-red-200 text-red-950' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isLeadReply ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
                          }`}>
                            {isLeadReply ? 'L' : 'YOU'}
                          </div>
                          <div>
                            <span className="font-semibold">{msg.from}</span>
                            {isLeadReply && (
                              <span className="ml-2 px-1.5 py-0.2 text-[10px] font-bold bg-red-600 text-white rounded">
                                Lead Reply
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500">{formatDisplayDate(msg.date)}</span>
                      </div>

                      {/* Message Body */}
                      <div className="p-4 text-xs leading-relaxed text-slate-800">
                        {msg.subject && (
                          <div className="font-semibold text-slate-900 mb-2 pb-1 border-b border-slate-100">
                            Subject: {msg.subject}
                          </div>
                        )}
                        {msg.bodyHtml ? (
                          <div 
                            className="email-rendered-body max-h-80 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.bodyText || msg.snippet}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Row #{lead.rowIndex || '—'} in Google Sheets
            </span>
            {onDeleteLead && (
              !isConfirmingDelete ? (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                  title="Delete this lead directly from Google Sheet and database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Lead</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-[11px] font-semibold text-red-900">Delete permanently?</span>
                  <button
                    onClick={() => {
                      onDeleteLead(lead);
                      onClose();
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
