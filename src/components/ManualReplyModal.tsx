import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Smartphone, 
  Monitor, 
  ChevronDown, 
  ChevronUp, 
  Bold, 
  Italic, 
  List, 
  Link2, 
  Plus, 
  RefreshCw, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Lead, AppUser } from '../types';

interface ManualReplyModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onReplySent: (updatedLead: Lead) => void;
  currentUser?: AppUser | null;
  adminHeader?: string;
  adminFooter?: string;
}

export const ManualReplyModal: React.FC<ManualReplyModalProps> = ({
  lead,
  isOpen,
  onClose,
  onReplySent,
  currentUser,
  adminHeader: initialHeader,
  adminFooter: initialFooter
}) => {
  // CC state
  const [ccList, setCcList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [ccError, setCcError] = useState<string | null>(null);
  const [recentCcs, setRecentCcs] = useState<string[]>([]);

  // Subject and Body state
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');

  // Admin Header / Footer (read-only)
  const [headerHtml, setHeaderHtml] = useState(initialHeader || '');
  const [footerHtml, setFooterHtml] = useState(initialFooter || '');

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [isReplyPanelOpen, setIsReplyPanelOpen] = useState(true);
  const [confirmNegativeReply, setConfirmNegativeReply] = useState(false);

  // Latest reply data from thread
  const [latestReply, setLatestReply] = useState<{
    from?: string;
    date?: string;
    subject?: string;
    bodyText?: string;
  } | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Draft auto-saving
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const isLoadedRef = useRef(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch admin header/footer, thread messages, recent CCs, and draft on mount / open
  useEffect(() => {
    if (!isOpen || !lead) return;

    isLoadedRef.current = false;
    setSendError(null);
    setCcError(null);
    setConfirmNegativeReply(false);

    // 1. Fetch active admin header/footer from settings
    fetch('/api/settings/header-footer')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setHeaderHtml(data.header || '');
          setFooterHtml(data.footer || '');
        }
      })
      .catch(() => {});

    // 2. Fetch user's recent CC list
    fetch('/api/email/manual-reply/recent-cc')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.recentCc && Array.isArray(data.recentCc)) {
          setRecentCcs(data.recentCc);
        }
      })
      .catch(() => {});

    // 3. Fetch lead email thread to get latest prospect reply
    setIsLoadingThread(true);
    fetch(`/api/email/thread?leadId=${encodeURIComponent(lead.leadId)}&leadEmail=${encodeURIComponent(lead.email)}&threadId=${encodeURIComponent(lead.threadId || '')}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages && Array.isArray(data.messages)) {
          // Find latest message from lead
          const inboundMsgs = data.messages.filter((m: any) => m.isFromLead);
          const latestInbound = inboundMsgs.length > 0 ? inboundMsgs[inboundMsgs.length - 1] : null;
          const anyLatest = data.messages.length > 0 ? data.messages[data.messages.length - 1] : null;
          const chosen = latestInbound || anyLatest;

          if (chosen) {
            setLatestReply({
              from: chosen.from || lead.email,
              date: chosen.date,
              subject: chosen.subject,
              bodyText: chosen.bodyText || chosen.snippet || chosen.bodyHtml
            });

            if (!subject) {
              const baseSubj = chosen.subject || `Outreach Follow-up for ${lead.company}`;
              const cleanSubj = baseSubj.replace(/^Re:\s*/i, '');
              setSubject(`Re: ${cleanSubj}`);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingThread(false);
      });

    // 4. Fetch draft if one exists
    fetch(`/api/email/manual-reply/draft?leadId=${encodeURIComponent(lead.leadId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.draft) {
          if (data.draft.subject) setSubject(data.draft.subject);
          if (data.draft.bodyHtml) setBodyHtml(data.draft.bodyHtml);
          if (Array.isArray(data.draft.cc)) setCcList(data.draft.cc);
          setDraftStatus('saved');
        } else {
          // Default subject if no draft
          setSubject(prev => prev || `Re: Following up with ${lead.name}`);
        }
      })
      .catch(() => {
        setSubject(prev => prev || `Re: Following up with ${lead.name}`);
      })
      .finally(() => {
        isLoadedRef.current = true;
      });
  }, [isOpen, lead]);

  // Debounced draft auto-save
  useEffect(() => {
    if (!isOpen || !lead || !isLoadedRef.current) return;
    if (!subject && !bodyHtml && ccList.length === 0) return;

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      fetch('/api/email/manual-reply/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.leadId,
          subject,
          bodyHtml,
          cc: ccList
        })
      })
        .then(r => {
          if (r.ok) setDraftStatus('saved');
          else setDraftStatus('idle');
        })
        .catch(() => setDraftStatus('idle'));
    }, 600);

    return () => clearTimeout(timer);
  }, [subject, bodyHtml, ccList, isOpen, lead]);

  // CC Validation & Helpers
  const addCcEmail = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    setCcError(null);
    if (!trimmed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setCcError(`Invalid email format: "${trimmed}"`);
      return;
    }
    if (trimmed === lead.email.trim().toLowerCase()) {
      setCcError("Cannot CC the lead's own email address");
      return;
    }
    if (ccList.includes(trimmed)) {
      setCcError(`"${trimmed}" is already added to CC`);
      return;
    }
    if (ccList.length >= 10) {
      setCcError('Maximum 10 CC recipients allowed');
      return;
    }

    setCcList(prev => [...prev, trimmed]);
    setCcInput('');
  };

  const removeCcEmail = (email: string) => {
    setCcList(prev => prev.filter(e => e !== email));
  };

  const handleCcKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCcEmail(ccInput);
    } else if (e.key === 'Backspace' && !ccInput && ccList.length > 0) {
      setCcList(prev => prev.slice(0, prev.length - 1));
    }
  };

  const handleCcPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    const parts = pasted.split(/[\s,;]+/);
    for (const part of parts) {
      if (part.trim()) {
        addCcEmail(part.trim());
      }
    }
  };

  // Company domain warning detection
  const userDomain = useMemo(() => {
    const email = currentUser?.email || '';
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : '';
  }, [currentUser?.email]);

  const externalCcs = useMemo(() => {
    if (!userDomain) return [];
    return ccList.filter(e => {
      const parts = e.split('@');
      return parts.length > 1 && parts[1].toLowerCase() !== userDomain;
    });
  }, [ccList, userDomain]);

  // Formatting helpers
  const insertFormatting = (tagStart: string, tagEnd: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyHtml.substring(start, end);
    const replacement = `${tagStart}${selected || 'text'}${tagEnd}`;
    const nextBody = bodyHtml.substring(0, start) + replacement + bodyHtml.substring(end);
    setBodyHtml(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagStart.length, start + tagStart.length + (selected.length || 4));
    }, 50);
  };

  const insertMergeTag = (tag: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = bodyHtml.substring(0, start) + tag + bodyHtml.substring(end);
    setBodyHtml(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Rendered preview HTML
  const renderedPreview = useMemo(() => {
    const senderName = currentUser?.name || 'Outreach Flow';
    let processedHeader = headerHtml || '';
    let processedBody = bodyHtml || '';
    let processedFooter = footerHtml || '';

    // Replace merge tags locally for live preview
    const replaceTags = (text: string) => {
      return text
        .replace(/\{\{FirstName\}\}/gi, lead.firstName || lead.name.split(' ')[0] || 'there')
        .replace(/\{\{LastName\}\}/gi, lead.lastName || '')
        .replace(/\{\{Company\}\}/gi, lead.company || 'your team')
        .replace(/\{\{PainPoint\}\}/gi, lead.painPoint || 'your workflows')
        .replace(/\{\{SenderName\}\}/gi, senderName);
    };

    processedHeader = replaceTags(processedHeader);
    processedBody = replaceTags(processedBody);
    processedFooter = replaceTags(processedFooter);

    // Convert newlines to breaks if plain text
    const formattedBody = processedBody.includes('<p>') || processedBody.includes('<br')
      ? processedBody
      : processedBody.replace(/\n/g, '<br/>');

    const sections: string[] = [];
    if (processedHeader.trim()) {
      sections.push(`<div style="margin-bottom: 20px; font-family: sans-serif;">${processedHeader}</div>`);
    }
    sections.push(`<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${formattedBody || '<em>(Write your message body...)</em>'}</div>`);
    if (processedFooter.trim()) {
      sections.push(`<div style="margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-family: sans-serif;">${processedFooter}</div>`);
    }

    return sections.join('\n');
  }, [headerHtml, footerHtml, bodyHtml, lead, currentUser]);

  // Handle Send
  const handleSend = async () => {
    if (isSending) return;
    setSendError(null);

    if (!subject.trim()) {
      setSendError('Subject line is required.');
      return;
    }

    const stripped = bodyHtml.replace(/<[^>]+>/g, '').trim();
    if (!stripped) {
      setSendError('Message body cannot be empty.');
      return;
    }

    if (lead.status === 'Negative Reply' && !confirmNegativeReply) {
      setSendError('Explicit confirmation is required before emailing a prospect marked as Negative Reply.');
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/email/manual-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.leadId,
          subject: subject.trim(),
          bodyHtml,
          cc: ccList,
          confirmNegativeReply: lead.status === 'Negative Reply' ? confirmNegativeReply : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reply');
      }

      // Notify parent with updated lead
      onReplySent(data.lead || {
        ...lead,
        lastManualReplyAt: new Date().toISOString(),
        hasUnreadReply: false
      });
      onClose();
    } catch (err: any) {
      setSendError(err.message || 'Network error sending manual reply');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const isNegativeReply = lead.status === 'Negative Reply' || lead.replySentiment === 'negative';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="manual-reply-modal"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Manual Reply to {lead.name}</h2>
                <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {lead.leadId}
                </span>
                {draftStatus === 'saving' && (
                  <span className="text-[10px] text-slate-400 italic">Saving draft...</span>
                )}
                {draftStatus === 'saved' && (
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Draft saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {lead.company} &bull; {lead.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isPreviewMode
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>{isPreviewMode ? 'Edit Mode' : 'Preview Email'}</span>
            </button>

            <button
              onClick={onClose}
              disabled={isSending}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Negative Reply Hard Warning Banner */}
          {isNegativeReply && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Caution: Prospect Marked as Negative Reply / Opt-Out</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                This prospect previously indicated disinterest or asked not to be contacted. Sending a manual reply requires explicit confirmation.
              </p>
              <label className="flex items-center gap-2.5 pt-1 text-xs font-semibold text-rose-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmNegativeReply}
                  onChange={(e) => setConfirmNegativeReply(e.target.checked)}
                  className="w-4 h-4 rounded border-rose-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span>I confirm that I explicitly intend to contact this prospect despite their negative reply status.</span>
              </label>
            </div>
          )}

          {/* Collapsible Latest Prospect Reply Panel */}
          <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setIsReplyPanelOpen(!isReplyPanelOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>Prospect's Latest Reply &amp; Notes</span>
                {latestReply?.date && (
                  <span className="text-[11px] font-normal text-slate-400">
                    ({new Date(latestReply.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
              {isReplyPanelOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isReplyPanelOpen && (
              <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 bg-white space-y-2">
                {isLoadingThread ? (
                  <div className="py-2 text-slate-400 italic flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading thread history...
                  </div>
                ) : latestReply?.bodyText ? (
                  <blockquote className="p-3 bg-amber-50/70 border-l-3 border-amber-500 rounded text-slate-700 text-xs leading-relaxed italic whitespace-pre-wrap">
                    "{latestReply.bodyText}"
                  </blockquote>
                ) : lead.notes ? (
                  <p className="p-3 bg-slate-50 border-l-3 border-slate-400 rounded text-slate-600 italic">
                    Notes: {lead.notes}
                  </p>
                ) : (
                  <p className="text-slate-400 italic py-1">
                    Pain point: "{lead.painPoint || 'General workflow bottlenecks'}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* PREVIEW MODE */}
          {isPreviewMode ? (
            <div className="space-y-3">
              {/* Device Width Selector */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl">
                <span className="text-xs font-semibold text-slate-600">Simulated Viewport:</span>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewWidth('desktop')}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      previewWidth === 'desktop' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (640px)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewWidth('mobile')}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      previewWidth === 'mobile' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (375px)</span>
                  </button>
                </div>
              </div>

              {/* Envelope Meta Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div><strong className="text-slate-500">To:</strong> {lead.name} &lt;{lead.email}&gt;</div>
                {ccList.length > 0 && (
                  <div><strong className="text-slate-500">CC:</strong> {ccList.join(', ')}</div>
                )}
                <div><strong className="text-slate-500">Subject:</strong> {subject}</div>
              </div>

              {/* Email Content Frame */}
              <div className="flex justify-center bg-slate-100 p-4 rounded-xl overflow-x-auto">
                <div 
                  className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg transition-all"
                  style={{ width: previewWidth === 'desktop' ? '640px' : '375px', maxWidth: '100%' }}
                  dangerouslySetInnerHTML={{ __html: renderedPreview }}
                />
              </div>
            </div>
          ) : (
            /* COMPOSE EDIT MODE (TOP TO BOTTOM) */
            <div className="space-y-4">
              
              {/* (a) TO: Locked & Not Editable */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <span>To:</span>
                  <span className="text-[11px] font-normal text-slate-400">(Locked recipient)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">{lead.name}</span>
                  <span className="text-slate-500">&lt;{lead.email}&gt;</span>
                </div>
              </div>

              {/* (b) CC: Chips with Input & Add Me / Supervisor Quick Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700">
                    CC Recipients: <span className="text-[11px] font-normal text-slate-400">({ccList.length}/10 max)</span>
                  </label>
                  {currentUser?.email && !ccList.includes(currentUser.email.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => addCcEmail(currentUser.email!)}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add me ({currentUser.email})</span>
                    </button>
                  )}
                </div>

                {/* CC Chips Input Box */}
                <div className="p-2 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
                  {ccList.map(email => (
                    <span 
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeCcEmail(email)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <input
                    type="email"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={handleCcKeyDown}
                    onPaste={handleCcPaste}
                    onBlur={() => { if (ccInput.trim()) addCcEmail(ccInput); }}
                    placeholder={ccList.length === 0 ? "Type email and press Enter or comma..." : "Add another CC..."}
                    className="flex-1 min-w-[200px] text-xs bg-transparent focus:outline-hidden py-1 px-1 text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* CC Error feedback */}
                {ccError && (
                  <p className="text-[11px] text-rose-600 font-medium">{ccError}</p>
                )}

                {/* External Domain Warning (Non-blocking) */}
                {externalCcs.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">External recipient warning:</strong>{' '}
                      {externalCcs.join(', ')} is outside your organization domain (@{userDomain}).
                    </div>
                  </div>
                )}

                {/* Quick Add Recent CC Chips */}
                {recentCcs.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-slate-400">Recent CCs:</span>
                    {recentCcs.filter(c => !ccList.includes(c)).slice(0, 4).map(rc => (
                      <button
                        key={rc}
                        type="button"
                        onClick={() => addCcEmail(rc)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{rc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* (c) SUBJECT: Editable, Pre-filled */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject:
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Re: Inbound follow-up"
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>

              {/* (d) HEADER: Admin-set Email Header (Locked & Read-only) */}
              {headerHtml && (
                <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl space-y-1.5 select-none opacity-85">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Admin Header (Locked &bull; Read-only)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 italic">Pre-set by admin in settings</span>
                  </div>
                  <div 
                    className="p-2.5 bg-white/70 border border-slate-200 rounded text-slate-600 text-xs pointer-events-none prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: headerHtml }}
                  />
                </div>
              )}

              {/* (e) BODY: Editable Area with Simple Formatting Toolbar & Merge Tags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700">
                    Message Body:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {bodyHtml.length} characters
                  </span>
                </div>

                {/* Formatting Toolbar */}
                <div className="p-1.5 bg-slate-100 border border-slate-200 rounded-t-lg flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertFormatting('<b>', '</b>')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<i>', '</i>')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                      title="Bullet list"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('<a href="https://">', '</a>')}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                      title="Insert hyperlink"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Merge Tags Menu */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-red-500" />
                      <span>Merge Tags:</span>
                    </span>
                    {(['{{FirstName}}', '{{Company}}', '{{PainPoint}}', '{{SenderName}}'] as const).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertMergeTag(tag)}
                        className="text-[10px] font-mono bg-white hover:bg-red-50 hover:text-red-700 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={bodyTextareaRef}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={8}
                  placeholder={`Hi ${lead.firstName || lead.name.split(' ')[0] || 'there'},\n\nThanks for getting back to us regarding ${lead.company}...\n\nBest regards,\n${currentUser?.name || 'Care'}`}
                  className="w-full text-xs font-sans p-3 bg-white border border-t-0 border-slate-300 rounded-b-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono leading-relaxed"
                />
              </div>

              {/* (f) FOOTER: Admin-set Email Footer (Locked & Read-only) */}
              {footerHtml && (
                <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl space-y-1.5 select-none opacity-85">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Admin Footer (Locked &bull; Read-only)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 italic">Pre-set by admin in settings</span>
                  </div>
                  <div 
                    className="p-2.5 bg-white/70 border border-slate-200 rounded text-slate-600 text-xs pointer-events-none prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{ __html: footerHtml }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Feedback error display */}
          {sendError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {ccList.length > 0 && (
              <span>CCing {ccList.length} recipient{ccList.length > 1 ? 's' : ''} &bull; </span>
            )}
            <span>Conversation thread will be preserved</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || (isNegativeReply && !confirmNegativeReply)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={isNegativeReply && !confirmNegativeReply ? "Confirm sending to Negative Reply prospect" : "Send email"}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Reply...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
