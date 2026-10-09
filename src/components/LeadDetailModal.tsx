import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  RotateCcw,
  FileText
} from 'lucide-react';
import { Lead, StageTemplate, EmailThreadMessage, CampaignWorkflow } from '../types';
import { getOutlookThread } from '../services/outlookService';
import { formatDisplayDate, formatDisplayTimestamp } from '../utils/dateUtils';
import { recordTrackingEvent, resetLeadTracking } from '../services/trackingService';
import { sanitizeEmailHtml } from '../utils/emailSanitizer';

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
  onOverrideSentiment?: (lead: Lead, sentiment: 'positive' | 'negative' | 'neutral') => void;
  onResumeCompanyLeads?: (lead: Lead) => void;
  onConfirmCompanyPause?: (lead: Lead) => void;
  campaigns?: CampaignWorkflow[];
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
  onCheckReply,
  onOverrideSentiment,
  onResumeCompanyLeads,
  onConfirmCompanyPause,
  campaigns = []
}) => {
  const [threadMessages, setThreadMessages] = useState<EmailThreadMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedPainPoint, setEditedPainPoint] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSimulatingTracking, setIsSimulatingTracking] = useState(false);
  const [pendingCampaignChange, setPendingCampaignChange] = useState<{ targetCampaignId: string; targetCampaignName: string } | null>(null);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [debugEvents, setDebugEvents] = useState<Array<{ type: string; timestamp: string; userAgent: string }>>([]);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  const [isConfirmingResetTracking, setIsConfirmingResetTracking] = useState(false);
  const [isResettingTracking, setIsResettingTracking] = useState(false);

  const handleResetTrackingConfirm = async () => {
    if (!lead) return;
    setIsResettingTracking(true);
    try {
      await resetLeadTracking(lead.leadId, lead.email);
      await onUpdateLead({
        ...lead,
        opensCount: 0,
        clicksCount: 0,
        lastOpenedDate: '',
        lastClickedDate: '',
        firstOpenedDate: '',
        firstClickedDate: ''
      });
      setDebugEvents([]);
      setIsConfirmingResetTracking(false);
    } catch (e) {
      console.error('Failed to reset lead tracking:', e);
    } finally {
      setIsResettingTracking(false);
    }
  };

  const fetchDebugEvents = async () => {
    if (!lead?.leadId) return;
    setIsLoadingDebug(true);
    try {
      const res = await fetch(`/api/track/debug?leadId=${encodeURIComponent(lead.leadId)}`);
      const data = await res.json();
      if (data.success) {
        setDebugEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to load debug events:', e);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  const handleSelectCampaign = (targetId: string) => {
    if (!lead) return;
    const targetCampaign = campaigns.find(c => c.id === targetId);
    const targetName = targetCampaign ? targetCampaign.name : 'Default';
    const currentCampId = lead.campaignId || campaigns.find(c => c.name.toLowerCase() === (lead.campaign || '').toLowerCase())?.id || '';
    
    // If selecting same value, do nothing
    if (targetId === currentCampId || (targetId === '' && (!currentCampId || lead.campaign === 'Default'))) {
      return;
    }

    const isMidSequence = (lead.currentStage || 0) > 0 || Boolean(lead.currentNodeId);
    if (isMidSequence) {
      setPendingCampaignChange({ targetCampaignId: targetId, targetCampaignName: targetName });
    } else {
      executeCampaignChange(targetId, targetName);
    }
  };

  const executeCampaignChange = (targetId: string, targetName: string) => {
    if (!lead) return;
    const targetCampaign = campaigns.find(c => c.id === targetId);
    
    // Find first node of target campaign
    let firstNodeId = '';
    if (targetCampaign) {
      const nodes = (targetCampaign as any).workflow_graph?.nodes || (targetCampaign as any).nodes || [];
      const edges = (targetCampaign as any).workflow_graph?.edges || (targetCampaign as any).edges || [];
      const startNode = nodes.find((n: any) => n.data?.nodeType === 'start' || n.type === 'start' || n.type === 'startNode');
      if (startNode) {
        const firstEdge = edges.find((e: any) => e.source === startNode.id);
        firstNodeId = firstEdge ? firstEdge.target : startNode.id;
      } else if (nodes.length > 0) {
        firstNodeId = nodes[0].id;
      }
    }

    const updated: Lead = {
      ...lead,
      campaign: targetName,
      campaignId: targetId,
      currentStage: 0,
      currentNodeId: firstNodeId,
      nodeEnteredDate: new Date().toISOString().split('T')[0]
    };
    onUpdateLead(updated);
    setPendingCampaignChange(null);
  };

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

  const lastLoadedThreadKeyRef = useRef<string>('');

  const loadThread = useCallback(async () => {
    if (!lead || (!lead.threadId && !lead.email)) return;
    setIsLoadingThread(true);
    setThreadError(null);
    try {
      const data = await getOutlookThread(token, lead.threadId, userEmail, lead.email);
      setThreadMessages(data.messages);

      // Trigger reply check right after thread loads only if lead is not yet Replied / Negative Reply and missing sentiment
      if (lead.status !== 'Replied' && lead.status !== 'Negative Reply' && !lead.replySentiment) {
        const msgs = data.messages || [];
        if (msgs.length > 0) {
          const sorted = [...msgs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const latestMsg = sorted[0];
          if (latestMsg && latestMsg.isFromLead) {
            onCheckReply(lead);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load email thread:', err);
      setThreadError(err.message || 'Could not fetch conversation thread messages.');
    } finally {
      setIsLoadingThread(false);
    }
  }, [lead?.threadId, lead?.email, lead?.status, token, userEmail, onCheckReply]);

  useEffect(() => {
    if (lead) {
      setEditedNotes(lead.notes || '');
      setEditedPainPoint(lead.painPoint || '');
    }
  }, [lead?.notes, lead?.painPoint]);

  useEffect(() => {
    if (!isOpen || !lead) {
      lastLoadedThreadKeyRef.current = '';
      return;
    }

    // Prevent re-fetching thread on 30s background metrics syncs unless lead or threadId actually changed
    const currentKey = `${lead.leadId}_${lead.threadId || lead.email || ''}`;
    if (lastLoadedThreadKeyRef.current !== currentKey) {
      lastLoadedThreadKeyRef.current = currentKey;
      if (lead.threadId || lead.email) {
        loadThread();
      } else {
        setThreadMessages([]);
      }
    }
  }, [isOpen, lead?.leadId, lead?.threadId, lead?.email, loadThread]);

  if (!isOpen || !lead) return null;

  const handleSaveNotes = () => {
    onUpdateLead({
      ...lead,
      notes: editedNotes,
      painPoint: editedPainPoint
    });
    setIsEditingNotes(false);
  };

  const getStatusBadge = () => {
    if (lead.status === 'Negative Reply' || lead.replySentiment === 'negative') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 font-bold">Negative Reply &bull; Do Not Contact</span>;
    }
    switch (lead.status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>;
      case 'Replied':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Replied &bull; Manual Follow-up</span>;
      case 'Paused':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Paused</span>;
      case 'Broke Up':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Broke Up</span>;
      case 'Completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F2FD] text-[#1976D2] border border-[#90CAF9]">Completed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{lead.status}</span>;
    }
  };

  const assignedCampaign = campaigns.find(c => c.id === lead.campaignId || (lead.campaign && c.name.toLowerCase() === lead.campaign.toLowerCase()));
  const emailNodes = assignedCampaign ? (assignedCampaign.nodes || (assignedCampaign as any).workflow_graph?.nodes || []).filter((n: any) => n.type === 'emailNode' || n.data?.nodeType === 'email') : [];
  const maxWorkflowStages = assignedCampaign && emailNodes.length > 0 ? emailNodes.length : (assignedCampaign ? 0 : 7);
  const nextStageNum = lead.currentStage + 1;
  const isSequenceFinished = lead.status === 'Completed' || lead.status === 'Replied' || lead.status === 'Negative Reply' || lead.status === 'Broke Up' || (maxWorkflowStages > 0 && lead.currentStage >= maxWorkflowStages);
  const hasMoreStages = nextStageNum <= maxWorkflowStages && !isSequenceFinished && lead.status !== 'Paused' && lead.status !== 'Negative Reply';
  const nextTemplate = templates.find(t => t.stage === nextStageNum);
  const stageList = [1, 2, 3, 4, 5, 6, 7];

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
                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                  <span>Thread:</span>
                  <span className="text-slate-800 font-semibold">{lead.threadId}</span>
                  <a
                    href={`https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(lead.threadId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-600 hover:text-red-700 p-0.5 inline-flex items-center"
                    title="Open thread in Outlook Web"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
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

        {/* Stage Horizontal Stepper - Unified single place, no scroll */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-start justify-between w-full">
            {stageList.map((stageNum, idx) => {
              const template = templates.find(t => t.stage === stageNum);
              const isPast = lead.currentStage >= stageNum;
              const isCurrent = lead.currentStage === stageNum - 1 && lead.status === 'Active';
              const isLast = idx === stageList.length - 1;
              
              return (
                <div key={stageNum} className={`flex items-start ${isLast ? 'flex-none' : 'flex-1'}`}>
                  {/* Circle + Label */}
                  <div className="flex flex-col items-center text-center shrink-0">
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPast
                          ? 'bg-red-600 text-white shadow-2xs'
                          : isCurrent
                          ? 'bg-red-600 text-white ring-4 ring-red-100 animate-pulse'
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : stageNum}
                    </div>
                    <span 
                      className={`text-[10px] sm:text-[11px] mt-1 font-medium truncate max-w-[50px] sm:max-w-[76px] block ${
                        isPast ? 'text-red-900 font-semibold' : isCurrent ? 'text-red-600 font-bold' : 'text-slate-400'
                      }`}
                      title={template?.name || `Stage ${stageNum}`}
                    >
                      {template?.name || `Stage ${stageNum}`}
                    </span>
                  </div>

                  {/* Flexible Dynamic Connector */}
                  {!isLast && (
                    <div className="flex-1 mx-1.5 sm:mx-2 mt-3 sm:mt-3.5">
                      <div className={`h-0.5 w-full rounded-full transition-colors ${isPast ? 'bg-red-600' : 'bg-slate-200'}`} />
                    </div>
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
                    title="Check for lead replies"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                    <span>Check Reply</span>
                  </button>
                )}
              </div>

              {/* Next Stage Send Action */}
              {hasMoreStages && (
                <button
                  onClick={() => onSendNextStage(lead)}
                  disabled={lead.status === 'Paused'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-lg shadow-xs shadow-red-500/20 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Stage {nextStageNum} ({nextTemplate?.name || `Stage ${nextStageNum}`}) Now</span>
                </button>
              )}

              {lead.status === 'Completed' && (
                <div className="p-3 bg-[#E3F2FD] border border-[#90CAF9] rounded-lg text-xs text-[#0D47A1] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1976D2] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-[#1976D2]">Campaign Completed:</strong> All sequence stages and actions for this campaign are finished. No further emails will be sent.
                  </div>
                </div>
              )}

              {lead.status === 'Negative Reply' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-rose-700">Hard Safety Policy: Negative Reply (Do Not Contact).</strong>
                    <p className="mt-0.5 text-rose-800">This prospect indicated disinterest or opt-out. All automated and manual email sending is permanently blocked.</p>
                    {lead.stoppedReason && (
                      <p className="mt-1 text-[11px] text-rose-600 italic">Reason: {lead.stoppedReason}</p>
                    )}
                  </div>
                </div>
              )}

              {lead.status === 'Paused' && lead.stoppedReason && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-amber-800">Paused Reason:</strong> {lead.stoppedReason}
                  </div>
                </div>
              )}

              {lead.status === 'Replied' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-950 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Automated sequence stopped:</strong> A reply was detected from {lead.name}. Please follow up manually in Outlook.
                  </div>
                </div>
              )}

              {/* Reply Sentiment & Manual Override Controls */}
              {(lead.replySentiment || lead.status === 'Replied' || lead.status === 'Negative Reply') && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Reply Sentiment</span>
                    {lead.replySentiment && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        lead.replySentiment === 'positive'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : lead.replySentiment === 'negative'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {lead.replySentiment.toUpperCase()} ({lead.replyClassifiedBy || 'auto'})
                      </span>
                    )}
                  </div>

                  {lead.replyMatchedPhrases && lead.replyMatchedPhrases.length > 0 && (
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400 font-medium">Matched phrases: </span>
                      <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">
                        {lead.replyMatchedPhrases.join(', ')}
                      </span>
                    </div>
                  )}

                  {lead.replyReason && (
                    <div className="text-[11px] text-slate-500 italic">
                      {lead.replyReason}
                    </div>
                  )}

                  {/* Three Manual Override Buttons */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Manual Sentiment Override:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOverrideSentiment?.(lead, 'positive')}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
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
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
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
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                          lead.replySentiment === 'neutral'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Mark Neutral
                      </button>
                    </div>
                  </div>

                  {/* One-click resume company leads action */}
                  {lead.replySentiment === 'positive' && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => onResumeCompanyLeads?.(lead)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Resume company leads</span>
                      </button>
                    </div>
                  )}

                  {/* Pending Ask me first confirmation */}
                  {lead.pendingCompanyPause && lead.pendingCompanyPause.count > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                      <p className="font-semibold text-amber-900">
                        Positive reply detected! Pause {lead.pendingCompanyPause.count} other active colleague(s) at {lead.company}?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConfirmCompanyPause?.(lead)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition-colors"
                        >
                          Confirm Pause
                        </button>
                      </div>
                    </div>
                  )}
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
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" /> Campaign:
                </span>
                <select
                  value={lead.campaignId || (campaigns.find(c => c.name.toLowerCase() === (lead.campaign || '').toLowerCase())?.id || '')}
                  onChange={(e) => handleSelectCampaign(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:ring-2 focus:ring-red-500 max-w-[200px]"
                >
                  <option value="">No campaign / Default</option>
                  {campaigns.map(c => {
                    const isActive = Boolean(c.is_active ?? (c as any).isActive);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({isActive ? 'Active' : 'Inactive'})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" /> Template Source:
                </span>
                <select
                  value={lead.templateSource || 'campaign'}
                  onChange={(e) => onUpdateLead({ ...lead, templateSource: e.target.value as 'campaign' | 'own' })}
                  className="text-xs px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:ring-2 focus:ring-red-500 max-w-[200px]"
                >
                  <option value="campaign">Campaign Template</option>
                  <option value="own">Owner&apos;s Personal Set</option>
                </select>
              </div>
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
                <button
                  type="button"
                  id="btn-reset-lead-tracking"
                  onClick={() => setIsConfirmingResetTracking(true)}
                  className="text-[10px] text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded border border-slate-200 transition-colors flex items-center gap-1 font-medium"
                  title="Reset tracking counters and history for this lead"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset tracking</span>
                </button>
              </div>

              {isConfirmingResetTracking && (
                <div id="confirm-reset-tracking-box" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2 animate-in fade-in duration-150">
                  <p className="font-semibold text-red-950">Reset tracking metrics for {lead.name}?</p>
                  <p className="text-[11px] text-red-800">
                    This will delete all recorded email open/click events and reset the counters to 0 for this lead.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-confirm-reset-tracking"
                      onClick={handleResetTrackingConfirm}
                      disabled={isResettingTracking}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-xs transition-colors disabled:opacity-50"
                    >
                      {isResettingTracking ? 'Resetting...' : 'Yes, reset tracking'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingResetTracking(false)}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded font-medium text-xs hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
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
                    <span className="text-[10px] text-slate-500 block truncate mt-1" title={lead.lastOpenedDate}>
                      Last: {formatDisplayTimestamp(lead.lastOpenedDate)}
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
                    <span className="text-[10px] text-slate-500 block truncate mt-1" title={lead.lastClickedDate}>
                      Last: {formatDisplayTimestamp(lead.lastClickedDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Debug Tracking Log Section */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showDebugLog;
                    setShowDebugLog(next);
                    if (next) fetchDebugEvents();
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center justify-between w-full py-1 border-t border-slate-100"
                >
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-400" />
                    <span>Debug Tracking Events</span>
                  </span>
                  <span className="text-[10px] text-blue-600 hover:underline">{showDebugLog ? 'Hide' : 'View recent events log'}</span>
                </button>

                {showDebugLog && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                    {isLoadingDebug ? (
                      <div className="text-slate-400 text-center py-2">Loading debug events...</div>
                    ) : debugEvents.length === 0 ? (
                      <div className="text-slate-400 text-center py-2">No tracking events recorded yet for this lead.</div>
                    ) : (
                      debugEvents.map((evt, idx) => (
                        <div key={idx} className="p-1.5 bg-white rounded border border-slate-200 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold uppercase ${evt.type === 'open' ? 'text-blue-600' : 'text-purple-600'}`}>
                              {evt.type}
                            </span>
                            <span className="text-slate-500">{formatDisplayTimestamp(evt.timestamp)}</span>
                          </div>
                          <div className="text-slate-600 truncate text-[9px]" title={evt.userAgent}>
                            Agent: {evt.userAgent || 'Unknown'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
                    <span>Save Changes</span>
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

          {/* Right Email Thread View (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Conversation Thread</h3>
              </div>

              {lead.threadId ? (
                <div className="flex items-center gap-2">
                  <a
                    href={
                      threadMessages.length > 0 && threadMessages[threadMessages.length - 1]?.id
                        ? `https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(threadMessages[threadMessages.length - 1].id)}`
                        : `https://outlook.office.com/mail/`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    <span>Open in Outlook</span>
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
            {!lead.threadId && !isSequenceFinished ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Sent Emails in Thread Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Stage 1 has not been dispatched to {lead.name} yet. When sent, a new email thread will be initialized and tracked here automatically.
                </p>
                {hasMoreStages && (
                  <button
                    onClick={() => onSendNextStage(lead)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs shadow-red-500/20"
                  >
                    Send Stage 1 Email Now
                  </button>
                )}
              </div>
            ) : !lead.threadId && isSequenceFinished ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">Campaign Finished</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  This campaign sequence is marked {lead.status}. No additional automated emails are scheduled.
                </p>
              </div>
            ) : isLoadingThread ? (
              <div className="p-12 text-center">
                <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading conversation thread...</p>
              </div>
            ) : threadError ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <p className="font-semibold mb-1">Could not fetch conversation thread:</p>
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
                            dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(msg.bodyHtml) }}
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
            <span className="text-xs text-slate-500 font-mono">
              Lead ID: {lead.leadId} &bull; MongoDB Database
            </span>
            {onDeleteLead && (
              !isConfirmingDelete ? (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                  title="Delete this lead from database"
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

      {/* Confirmation Modal for Mid-Sequence Campaign Change */}
      {pendingCampaignChange && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Restart Campaign Sequence?</h4>
                <p className="text-xs text-slate-500">Lead is currently mid-sequence (Stage {lead.currentStage})</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-2 text-slate-700">
              <p className="font-semibold text-amber-900">
                Moving this lead to &ldquo;{pendingCampaignChange.targetCampaignName}&rdquo; will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Restart the lead at the new campaign&apos;s first workflow node (Stage 0).</li>
                <li>Keep all previous sent-email history and message threads intact.</li>
                <li>Preserve existing open &amp; click tracking metrics.</li>
                <li>Leads that have <strong>Replied</strong> stay excluded from automation regardless of campaign.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingCampaignChange(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCampaignChange(pendingCampaignChange.targetCampaignId, pendingCampaignChange.targetCampaignName)}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs shadow-amber-500/20 transition-all cursor-pointer"
              >
                Confirm &amp; Restart Sequence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
