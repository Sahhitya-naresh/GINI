import React, { useState, useEffect, useMemo } from 'react';
import { StageTemplate, Lead, ConnectedSender, AppUser, TemplateSet, TemplateStageItem } from '../types';
import { renderEmailMergeTags, DEFAULT_STAGE_TEMPLATES } from '../data/defaultTemplates';
import { 
  Monitor, 
  Smartphone, 
  Check, 
  RotateCcw, 
  Eye, 
  Clock, 
  Tag, 
  Info,
  Save,
  UserCheck,
  Table as TableIcon,
  History,
  Lock,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  User,
  Bold,
  Italic,
  List,
  Link2,
  Sparkles,
  X
} from 'lucide-react';
import {
  getDefaultTemplateSet,
  getUserTemplateSet,
  saveTemplateSet,
  restoreTemplateSetVersion,
  resetUserTemplateSetToDefault,
  getHeaderFooter
} from '../services/templateService';
import { listUsersApi } from '../services/authService';
import { htmlToPlainText, plainTextToEmailHtml } from '../utils/emailFormatters';

interface TemplateAdminProps {
  templates?: StageTemplate[];
  onSaveTemplates?: (updated: StageTemplate[]) => void;
  leads: Lead[];
  senderName: string;
  senders?: ConnectedSender[];
  currentUser?: AppUser | null;
}

export const TemplateAdmin: React.FC<TemplateAdminProps> = ({
  leads,
  senderName,
  senders = [],
  currentUser
}) => {
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeLeadIndex, setActiveLeadIndex] = useState<number>(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [showTableView, setShowTableView] = useState(false);

  // Template sets state
  const [activeSetType, setActiveSetType] = useState<'mine' | 'default' | 'user'>('mine');
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || '');
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentSet, setCurrentSet] = useState<TemplateSet | null>(null);
  const [editedStages, setEditedStages] = useState<TemplateStageItem[]>([]);
  const [isLoadingSet, setIsLoadingSet] = useState<boolean>(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Header & Footer state (locked read-only in template editor)
  const [globalHeader, setGlobalHeader] = useState<string>('');
  const [globalFooter, setGlobalFooter] = useState<string>('');

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'admin';
  const hasEditAny = Boolean(currentUser?.permissions?.includes('templates.editAny'));
  const hasEditDefault = Boolean(currentUser?.permissions?.includes('templates.editDefault'));
  const canSelectOtherSets = isAdmin || hasEditAny;

  // Load all users if permitted to view other sets
  useEffect(() => {
    if (canSelectOtherSets) {
      listUsersApi().then(res => {
        if (res.success && res.users) {
          setAllUsers(res.users);
        }
      }).catch(() => {});
    }
  }, [canSelectOtherSets]);

  // Load global header and footer
  useEffect(() => {
    getHeaderFooter().then(res => {
      setGlobalHeader(res.header || '');
      setGlobalFooter(res.footer || '');
    }).catch(() => {});
  }, []);

  // AI Assistant state for templates
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiTone, setAiTone] = useState<string>('');
  const [aiMode, setAiMode] = useState<'write' | 'rewrite'>('write');
  const [aiApplySelectionOnly, setAiApplySelectionOnly] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<string | null>(null);
  const [previousBodyForUndo, setPreviousBodyForUndo] = useState<string | null>(null);

  // Load template set based on activeSetType and selectedUserId
  const loadActiveSet = async () => {
    setIsLoadingSet(true);
    setSaveError(null);
    try {
      let set: TemplateSet;
      if (activeSetType === 'default') {
        set = await getDefaultTemplateSet();
      } else if (activeSetType === 'user' && selectedUserId) {
        set = await getUserTemplateSet(selectedUserId);
      } else {
        // mine
        set = await getUserTemplateSet(currentUser?.id || 'current');
      }
      setCurrentSet(set);
      setEditedStages((set.stages || []).map(s => ({
        ...s,
        bodyHtml: htmlToPlainText(s.bodyHtml)
      })));
    } catch (err: any) {
      setSaveError(err.message || 'Failed to load template set');
    } finally {
      setIsLoadingSet(false);
    }
  };

  useEffect(() => {
    loadActiveSet();
  }, [activeSetType, selectedUserId, currentUser?.id]);

  const currentStage = editedStages.find(s => s.stage === selectedStageNumber) || editedStages[0] || {
    stage: 1,
    name: 'Introduction',
    purpose: 'Initial outreach',
    defaultGapDays: 3,
    subject: '',
    bodyHtml: ''
  };

  // Preview lead
  const previewLead: Partial<Lead> = leads.length > 0 
    ? leads[activeLeadIndex] || leads[0] 
    : {
        name: 'Jordan Belfort',
        company: 'Apex Systems',
        painPoint: 'slow manual lead qualification & follow-up latency',
        email: 'jordan@apex-example.com'
      };

  const renderedSubject = renderEmailMergeTags(currentStage.subject || '', previewLead, senderName);
  const renderedHeader = globalHeader ? renderEmailMergeTags(globalHeader, previewLead, senderName) : '';
  const renderedBodyHtml = renderEmailMergeTags(plainTextToEmailHtml(currentStage.bodyHtml || ''), previewLead, senderName);
  const renderedFooter = globalFooter ? renderEmailMergeTags(globalFooter, previewLead, senderName) : '';

  // Calculate full composed plain text length for length warning
  const fullComposedHtml = useMemo(() => {
    const parts: string[] = [];
    if (renderedHeader.trim()) parts.push(`<div class="email-header" style="margin-bottom: 20px;">${renderedHeader}</div>`);
    parts.push(`<div class="email-body">${renderedBodyHtml}</div>`);
    if (renderedFooter.trim()) parts.push(`<div class="email-footer" style="margin-top: 28px;">${renderedFooter}</div>`);
    return parts.join('\n');
  }, [renderedHeader, renderedBodyHtml, renderedFooter]);

  const plainTextLength = useMemo(() => {
    return fullComposedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  }, [fullComposedHtml]);

  const isLikelyLong = plainTextLength > 1500;

  const handleFieldChange = (field: keyof TemplateStageItem, value: any) => {
    const updated = editedStages.map(s => {
      if (s.stage === selectedStageNumber) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setEditedStages(updated);
  };

  const handleSave = async () => {
    if (!currentSet) return;
    setSaveError(null);
    try {
      const stagesToSave = editedStages.map(s => ({
        ...s,
        bodyHtml: plainTextToEmailHtml(s.bodyHtml)
      }));
      const saved = await saveTemplateSet(currentSet.id, stagesToSave);
      setCurrentSet(saved);
      setEditedStages((saved.stages || []).map(s => ({
        ...s,
        bodyHtml: htmlToPlainText(s.bodyHtml)
      })));
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save template set');
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!currentSet) return;
    try {
      const restored = await restoreTemplateSetVersion(currentSet.id, versionNumber);
      setCurrentSet(restored);
      setEditedStages((restored.stages || []).map(s => ({
        ...s,
        bodyHtml: htmlToPlainText(s.bodyHtml)
      })));
      setShowHistoryModal(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to restore template set version');
    }
  };

  const handleResetToDefault = async () => {
    if (!currentUser?.id) return;
    setIsResetting(true);
    try {
      const resetSet = await resetUserTemplateSetToDefault(currentUser.id);
      setCurrentSet(resetSet);
      setEditedStages((resetSet.stages || []).map(s => ({
        ...s,
        bodyHtml: htmlToPlainText(s.bodyHtml)
      })));
      setShowResetModal(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to reset to default');
    } finally {
      setIsResetting(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = document.getElementById('template-body-input') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = currentStage.bodyHtml || '';
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextBody = current.substring(0, start) + replacement + current.substring(end);
    handleFieldChange('bodyHtml', nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 50);
  };

  const insertMergeTag = (tag: string) => {
    const textarea = document.getElementById('template-body-input') as HTMLTextAreaElement | null;
    if (!textarea) {
      handleFieldChange('bodyHtml', (currentStage.bodyHtml || '') + ` ${tag}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentStage.bodyHtml || '';
    const newText = text.substring(0, start) + tag + text.substring(end);
    handleFieldChange('bodyHtml', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleToggleAiPanel = () => {
    if (!isAiPanelOpen) {
      const textarea = document.getElementById('template-body-input') as HTMLTextAreaElement | null;
      let selText = '';
      let range = null;
      if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
        selText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        range = { start: textarea.selectionStart, end: textarea.selectionEnd };
      }
      setSelectedText(selText);
      setSelectionRange(range);
      setAiApplySelectionOnly(Boolean(selText.trim()));

      const hasText = (currentStage.bodyHtml || '').trim().length > 0;
      setAiMode(hasText ? 'rewrite' : 'write');
      setAiError(null);
      setAiGeneratedResult(null);
      setIsAiPanelOpen(true);
    } else {
      setIsAiPanelOpen(false);
      setAiGeneratedResult(null);
      setAiError(null);
    }
  };

  const handleQuickChip = (chip: string) => {
    if (chip === 'Write cold email') {
      setAiMode('write');
      setAiInstruction('Write an engaging, concise cold outreach email tailored for this sequence stage.');
      setAiTone('');
    } else if (chip === 'Short pitch') {
      setAiMode('write');
      setAiInstruction('Write a short, punchy 3-sentence outreach email getting straight to the value proposition.');
    } else if (chip === 'Pain point focus') {
      setAiMode('write');
      setAiInstruction("Focus directly on addressing the recipient's key business pain points and inefficiencies.");
    } else if (chip === 'Case study follow-up') {
      setAiMode('write');
      setAiInstruction('Write a follow-up referencing a recent success story with tangible ROI numbers.');
    } else if (chip === 'Quick question') {
      setAiMode('write');
      setAiInstruction('Keep it ultra brief with a quick question to gauge interest.');
    } else if (chip === 'Shorten') {
      setAiMode('rewrite');
      setAiInstruction('Make it more concise and directly to the point.');
    } else if (chip === 'Expand') {
      setAiMode('rewrite');
      setAiInstruction('Expand with more supportive context and clear value explanation.');
    } else if (chip === 'Friendlier') {
      setAiMode('rewrite');
      setAiTone('Friendlier');
      setAiInstruction('Rewrite in a warm, welcoming, and friendly tone.');
    } else if (chip === 'More formal') {
      setAiMode('rewrite');
      setAiTone('More formal');
      setAiInstruction('Rewrite in a professional, polished, and formal tone.');
    } else if (chip === 'More persuasive') {
      setAiMode('rewrite');
      setAiTone('More persuasive');
      setAiInstruction('Rewrite with stronger emphasis on value and a clear call to action.');
    } else if (chip === 'Fix grammar') {
      setAiMode('rewrite');
      setAiInstruction('Fix any grammar, spelling, and phrasing issues while keeping the exact meaning.');
    }
  };

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch('/api/templates/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageNumber: currentStage.stage,
          stageName: currentStage.name,
          stagePurpose: currentStage.purpose,
          instruction: aiInstruction.trim(),
          mode: aiMode,
          currentBodyText: currentStage.bodyHtml || '',
          selectedText: aiApplySelectionOnly && selectedText ? selectedText : undefined,
          tone: aiTone
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate template text');
      }

      const cleanResult = htmlToPlainText(data.text || '');
      setAiGeneratedResult(cleanResult);
    } catch (err: any) {
      setAiError(err.message || 'Error communicating with AI assistant');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleInsertAiResult = () => {
    if (!aiGeneratedResult) return;
    setPreviousBodyForUndo(currentStage.bodyHtml);

    const textarea = document.getElementById('template-body-input') as HTMLTextAreaElement | null;
    if (aiApplySelectionOnly && selectionRange && textarea) {
      const cur = currentStage.bodyHtml || '';
      const before = cur.substring(0, selectionRange.start);
      const after = cur.substring(selectionRange.end);
      handleFieldChange('bodyHtml', before + aiGeneratedResult + after);
    } else {
      handleFieldChange('bodyHtml', aiGeneratedResult);
    }

    setIsAiPanelOpen(false);
    setAiGeneratedResult(null);
    setAiError(null);
  };

  const handleUndoAi = () => {
    if (previousBodyForUndo !== null) {
      handleFieldChange('bodyHtml', previousBodyForUndo);
      setPreviousBodyForUndo(null);
    }
  };

  return (
    <div className="space-y-4 w-full pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-red-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">7-Stage Sequence Template Studio</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-md border border-red-200">
              HTML Email Client Ready
            </span>
            {currentSet && (
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                v{currentSet.version || 1} &bull; {currentSet.kind === 'default' ? 'Admin Default' : currentSet.kind === 'user' ? 'Personal Set' : 'Campaign'}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Write responsive single-column outreach emails with merge variables. Test live desktop & mobile viewport heights.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Version History Button */}
          {currentSet && currentSet.history && currentSet.history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>History ({currentSet.history.length})</span>
            </button>
          )}

          {/* Reset to Default Button (only for personal set) */}
          {activeSetType === 'mine' && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
              title="Reset personal templates to current Admin Default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoadingSet}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs shadow-red-500/20 transition-all disabled:opacity-50"
          >
            {showSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4 text-white" />}
            <span>{showSavedToast ? 'Templates Saved!' : 'Save All Stages'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Set Selector Toolbar (Mine vs Admin Default vs Other Users) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Template Set:
          </span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveSetType('mine'); setSelectedUserId(currentUser?.id || ''); }}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeSetType === 'mine'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Personal Set
            </button>
            {(isAdmin || hasEditDefault) && (
              <button
                type="button"
                onClick={() => setActiveSetType('default')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeSetType === 'default'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Default Set
              </button>
            )}
            {canSelectOtherSets && allUsers.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveSetType('user');
                  if (!selectedUserId && allUsers[0]) setSelectedUserId(allUsers[0].id);
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeSetType === 'user'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                User Sets
              </button>
            )}
          </div>

          {activeSetType === 'user' && canSelectOtherSets && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-red-500"
            >
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentSet && (
            <span className="text-[11px] text-slate-500">
              Last saved by <strong className="font-semibold text-slate-700">{currentSet.updatedBy || 'System'}</strong> on {currentSet.updatedAt ? new Date(currentSet.updatedAt).toLocaleDateString() : 'N/A'}
            </span>
          )}
        </div>
      </div>

      {/* Stage Selector Pills & Table Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Stage to Configure
          </span>
          <button
            type="button"
            onClick={() => setShowTableView(!showTableView)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <TableIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTableView ? 'Switch to Stage Pills' : 'View Stages Table'}</span>
          </button>
        </div>

        {showTableView ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Stage #</th>
                  <th className="py-2.5 px-3">Stage Name</th>
                  <th className="py-2.5 px-3">Wait Delay</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {editedStages.map((t) => {
                  const isSelected = t.stage === selectedStageNumber;
                  return (
                    <tr 
                      key={t.stage}
                      onClick={() => setSelectedStageNumber(t.stage)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-red-50/60 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          Stage {t.stage}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.defaultGapDays} business days</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] truncate max-w-[260px]">
                        {t.subject}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageNumber(t.stage);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                        >
                          Edit Stage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {editedStages.map((t) => {
              const isSelected = t.stage === selectedStageNumber;
              return (
                <button
                  key={t.stage}
                  type="button"
                  onClick={() => setSelectedStageNumber(t.stage)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-red-600 bg-white ring-2 ring-red-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      Stage {t.stage}
                    </span>
                    <span className="text-[10px] text-slate-400">+{t.defaultGapDays}d</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {t.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor & Preview Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Editor Form (6 cols on lg) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Stage {currentStage.stage} Content Editor
              </span>
              <h3 className="text-base font-bold text-slate-900">{currentStage.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (editorMode === 'code') {
                    handleFieldChange('bodyHtml', htmlToPlainText(currentStage.bodyHtml || ''));
                  }
                  setEditorMode('visual');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  editorMode === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Visual (Simple Text)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editorMode === 'visual') {
                    handleFieldChange('bodyHtml', plainTextToEmailHtml(currentStage.bodyHtml || ''));
                  }
                  setEditorMode('code');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  editorMode === 'code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Code (HTML)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Stage Name & Wait Delay */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stage Title</label>
                <input
                  type="text"
                  value={currentStage.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Wait Delay</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={currentStage.defaultGapDays}
                    onChange={(e) => handleFieldChange('defaultGapDays', parseInt(e.target.value, 10) || 3)}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                  />
                  <span className="text-xs text-slate-500">days</span>
                </div>
              </div>
            </div>

            {/* Email Subject Line */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Subject Line</span>
                <span className="text-[11px] text-slate-400 font-normal">Supports merge tags like {`{{company}}`}</span>
              </label>
              <input
                type="text"
                value={currentStage.subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-slate-800"
                placeholder="Subject line with {{company}}..."
              />
            </div>

            {/* Merge Tags Quick Click Bar */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-slate-700">Available Merge Tags (Click to insert):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{{first_name}}', desc: "Lead's first name" },
                  { tag: '{{company}}', desc: "Company name" },
                  { tag: '{{pain_point}}', desc: "Lead's specific pain point" },
                  { tag: '{{name}}', desc: "Full name" },
                  { tag: '{{sender_name}}', desc: "Your sender signature" }
                ].map(({ tag, desc }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertMergeTag(tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-200 rounded-md transition-colors"
                    title={desc}
                  >
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* LOCKED READ-ONLY HEADER PREVIEW */}
            <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Locked Global Email Header (Read-Only)
                </span>
                <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  Configured in Settings
                </span>
              </div>
              {globalHeader.trim() ? (
                <div 
                  className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                  dangerouslySetInnerHTML={{ __html: renderedHeader }}
                />
              ) : (
                <p className="text-[11px] text-slate-400 italic">No global header configured. (Empty)</p>
              )}
            </div>

            {/* EDITABLE Email Body Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {editorMode === 'visual' ? 'Email Body (Simple Text)' : 'Raw HTML Markup'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {editorMode === 'visual' 
                      ? 'No HTML code needed — type naturally. Paragraphs and formatting convert to email HTML automatically.' 
                      : 'Raw HTML mode for advanced email markup.'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(currentStage.bodyHtml || '').length} chars
                </span>
              </div>

              {/* Formatting Toolbar */}
              <div className="p-1.5 bg-slate-100 border border-slate-200 rounded-t-lg flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('_', '_')}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Italic (_text_)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('• ', '')}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Bullet list (• item)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('[', '](https://)')}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Insert hyperlink ([text](url))"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  {/* AI Assistant Button */}
                  <button
                    type="button"
                    id="template-ai-assist-btn"
                    onClick={handleToggleAiPanel}
                    className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      isAiPanelOpen
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-200'
                    }`}
                    title="AI Writing Assistant (Gemini)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>AI Assistant</span>
                  </button>

                  {/* Undo AI Button */}
                  {previousBodyForUndo !== null && (
                    <button
                      type="button"
                      id="template-ai-undo-btn"
                      onClick={handleUndoAi}
                      className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Undo AI changes"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Undo AI</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Anchored AI Assistant Panel */}
              {isAiPanelOpen && (
                <div id="template-ai-panel" className="p-3.5 bg-purple-50/70 border-x border-b border-purple-200 space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>AI Sequence Assistant &bull; Stage {currentStage.stage} ({currentStage.name})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiPanelOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Close AI panel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode Selector & Selection Scope */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setAiMode('write')}
                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                          aiMode === 'write' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-purple-700'
                        }`}
                      >
                        Write new template
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiMode('rewrite')}
                        className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                          aiMode === 'rewrite' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-purple-700'
                        }`}
                      >
                        Rewrite / Improve
                      </button>
                    </div>

                    {selectedText && (
                      <label className="flex items-center gap-1.5 text-xs text-purple-900 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={aiApplySelectionOnly}
                          onChange={(e) => setAiApplySelectionOnly(e.target.checked)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span>Apply to selection only ({selectedText.length} chars)</span>
                      </label>
                    )}
                  </div>

                  {/* Quick Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">Quick Prompts:</span>
                    {(aiMode === 'write' ? [
                      'Write cold email',
                      'Short pitch',
                      'Pain point focus',
                      'Case study follow-up',
                      'Quick question'
                    ] : [
                      'Shorten',
                      'Expand',
                      'Friendlier',
                      'More formal',
                      'More persuasive',
                      'Fix grammar'
                    ]).map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleQuickChip(chip)}
                        className="px-2 py-0.5 bg-white hover:bg-purple-100 text-purple-800 text-[11px] font-medium rounded-full border border-purple-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Custom Instruction Box */}
                  <div className="space-y-1">
                    <textarea
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      rows={2}
                      placeholder={
                        aiMode === 'write' 
                          ? `e.g. Write an attention-grabbing Stage ${currentStage.stage} email highlighting our 14-day trial, with a clear CTA...`
                          : 'e.g. Make it more concise, friendly, and strengthen the value proposition...'
                      }
                      className="w-full text-xs p-2.5 bg-white border border-purple-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="italic text-[10px]">Generates clean plain text. Merge tags like {`{{company}}`} and {`{{first_name}}`} are supported.</span>
                      <button
                        type="button"
                        id="template-ai-generate-btn"
                        disabled={isGeneratingAi}
                        onClick={handleGenerateAi}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {isGeneratingAi ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Generate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Error Alert */}
                  {aiError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* Result Preview Box */}
                  {aiGeneratedResult && (
                    <div id="template-ai-result-preview" className="p-3 bg-white border border-purple-300 rounded-xl space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-purple-900 font-bold border-b border-purple-100 pb-1.5">
                        <span>Preview Generated Template:</span>
                        <span className="text-[10px] font-normal text-slate-400">Review before inserting</span>
                      </div>
                      <div 
                        className="text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-sans whitespace-pre-wrap"
                      >
                        {aiGeneratedResult}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-100">
                        <button
                          type="button"
                          onClick={() => setAiGeneratedResult(null)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateAi}
                          disabled={isGeneratingAi}
                          className="px-2.5 py-1 text-xs text-purple-700 hover:bg-purple-100 rounded border border-purple-200 transition-colors cursor-pointer"
                        >
                          Try again
                        </button>
                        <button
                          type="button"
                          id="template-ai-insert-btn"
                          onClick={handleInsertAiResult}
                          className="px-3.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{aiMode === 'rewrite' || (aiApplySelectionOnly && selectedText) ? 'Replace' : 'Insert into Template'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Textarea */}
              <textarea
                id="template-body-input"
                rows={11}
                value={currentStage.bodyHtml}
                onChange={(e) => {
                  handleFieldChange('bodyHtml', e.target.value);
                  if (previousBodyForUndo !== null) {
                    setPreviousBodyForUndo(null);
                  }
                }}
                onSelect={(e) => {
                  const target = e.currentTarget;
                  if (target.selectionStart !== target.selectionEnd) {
                    const sel = target.value.substring(target.selectionStart, target.selectionEnd);
                    setSelectedText(sel);
                    setSelectionRange({ start: target.selectionStart, end: target.selectionEnd });
                  } else {
                    setSelectedText('');
                    setSelectionRange(null);
                  }
                }}
                placeholder={
                  editorMode === 'visual'
                    ? "Hi {{first_name}},\n\nWrite your email body naturally here...\n\nNo HTML code needed!\n\nBest,\n{{sender_name}}"
                    : "<p>Write raw HTML here...</p>"
                }
                className={`w-full p-3 leading-relaxed rounded-b-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 ${
                  editorMode === 'visual' 
                    ? 'font-sans text-sm bg-white' 
                    : 'font-mono text-xs bg-slate-50/50'
                }`}
              />
            </div>

            {/* LOCKED READ-ONLY FOOTER PREVIEW */}
            <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Locked Global Email Footer (Read-Only)
                </span>
                <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  Configured in Settings
                </span>
              </div>
              {globalFooter.trim() ? (
                <div 
                  className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs"
                  dangerouslySetInnerHTML={{ __html: renderedFooter }}
                />
              ) : (
                <p className="text-[11px] text-slate-400 italic">No global footer configured. (Empty)</p>
              )}
            </div>
          </div>
        </div>

        {/* Live Responsive Preview Panel (6 cols on lg) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-full">
            {/* Preview Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">Live Client Preview</span>
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                  Stage {currentStage.stage}
                </span>
              </div>

              {/* Lead Selector for Preview */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Preview with lead:</span>
                <select
                  value={activeLeadIndex}
                  onChange={(e) => setActiveLeadIndex(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {leads.map((l, i) => (
                    <option key={l.leadId ? `${l.leadId}-${i}` : `lead-opt-${i}`} value={i}>
                      {l.name} ({l.company})
                    </option>
                  ))}
                  {leads.length === 0 && <option value={0}>Sample Lead</option>}
                </select>
              </div>

              {/* Viewport Width Switcher */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-medium shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    previewDevice === 'desktop'
                      ? 'bg-red-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop (600px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    previewDevice === 'mobile'
                      ? 'bg-red-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile (375px)</span>
                </button>
              </div>
            </div>

            {/* Non-blocking Length Warning Banner */}
            {isLikelyLong && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Length Advisory:</strong> Composed email is ~{plainTextLength} characters of text and may be longer than one screen on mobile devices.
                </div>
              </div>
            )}

            {/* Preview Frame */}
            <div className="p-6 bg-slate-100 flex items-center justify-center min-h-[500px]">
              <div 
                className={`bg-white rounded-xl shadow-lg border border-slate-200 p-6 transition-all duration-300 w-full overflow-hidden ${
                  previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
                }`}
              >
                {/* Email Header Preview Meta */}
                <div className="pb-4 mb-4 border-b border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{renderedSubject || '(No Subject)'}</span>
                    <span className="text-[10px] text-slate-400">Live Render</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    To: <strong>{previewLead.name}</strong> &lt;{previewLead.email}&gt;
                  </div>
                  <div className="text-[11px] text-slate-500">
                    From: <strong>{senderName}</strong>
                  </div>
                </div>

                {/* Composed Email HTML (Header + Body + Footer) */}
                <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-4">
                  {renderedHeader.trim() && (
                    <div 
                      className="email-header-preview pb-3 border-b border-slate-100"
                      dangerouslySetInnerHTML={{ __html: renderedHeader }}
                    />
                  )}
                  <div 
                    className="email-body-preview"
                    dangerouslySetInnerHTML={{ __html: renderedBodyHtml }}
                  />
                  {renderedFooter.trim() && (
                    <div 
                      className="email-footer-preview pt-3 border-t border-slate-100 text-[11px] text-slate-500"
                      dangerouslySetInnerHTML={{ __html: renderedFooter }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && currentSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">Version History</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Showing the last 10 versions of this template set. Restoring a version creates a new latest version with those stages.
            </p>

            <div className="space-y-2.5">
              {currentSet.history && currentSet.history.length > 0 ? (
                currentSet.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span>Version {h.version}</span>
                        {h.changeNote && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 font-semibold border border-red-200">
                            {h.changeNote}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Edited by <strong>{h.editedBy || 'System'}</strong> on {new Date(h.editedAt).toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(h.version)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No previous versions recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESET TO DEFAULT CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset My Templates</h3>
                <p className="text-xs text-slate-500">Revert to current Admin Default</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reset your personal templates to the current <strong>Admin Default set</strong>? This will replace your personal templates for stages 1–7. A backup of your current version will be saved in your history.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetToDefault}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { TemplateAdmin as TemplatesPage };
