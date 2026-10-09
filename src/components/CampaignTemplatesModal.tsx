import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  History,
  RotateCcw,
  AlertTriangle,
  Check,
  ChevronRight,
  Eye,
  Edit3,
  Smartphone,
  Monitor,
  Lock,
  Layers,
  Info,
  Users
} from 'lucide-react';
import {
  TemplateSet,
  TemplateStageItem,
  TemplateSetHistoryEntry,
  Lead
} from '../types';
import {
  getCampaignTemplateSet,
  saveTemplateSet,
  restoreTemplateSetVersion,
  getCampaignTemplateImpact,
  getHeaderFooter,
  CampaignImpactResult
} from '../services/templateService';
import { renderEmailMergeTags, DEFAULT_STAGE_TEMPLATES } from '../data/defaultTemplates';

interface CampaignTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  canEdit: boolean;
  currentUser?: any;
}

export const CampaignTemplatesModal: React.FC<CampaignTemplatesModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  canEdit,
  currentUser
}) => {
  const [templateSet, setTemplateSet] = useState<TemplateSet | null>(null);
  const [editedStages, setEditedStages] = useState<TemplateStageItem[]>([]);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Impact count
  const [impact, setImpact] = useState<CampaignImpactResult | null>(null);
  const [showImpactConfirm, setShowImpactConfirm] = useState(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Header and Footer for preview
  const [globalHeader, setGlobalHeader] = useState('');
  const [globalFooter, setGlobalFooter] = useState('');

  // Preview options
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (isOpen && campaignId) {
      loadData();
    }
  }, [isOpen, campaignId]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [set, impactRes, hfRes] = await Promise.all([
        getCampaignTemplateSet(campaignId),
        getCampaignTemplateImpact(campaignId).catch(() => ({ affectedLeadsCount: 0, userCount: 0, affectedUserNames: [] })),
        getHeaderFooter().catch(() => ({ header: '', footer: '' }))
      ]);
      setTemplateSet(set);
      setEditedStages(set.stages && set.stages.length > 0 ? set.stages : DEFAULT_STAGE_TEMPLATES);
      setImpact(impactRes);
      setGlobalHeader(hfRes.header);
      setGlobalFooter(hfRes.footer);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load campaign template set');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStageItem = useMemo(() => {
    return editedStages.find(s => s.stage === selectedStage) || editedStages[0] || {
      stage: selectedStage,
      name: `Stage ${selectedStage}`,
      purpose: 'Outreach touchpoint',
      defaultGapDays: 3,
      subject: '',
      bodyHtml: ''
    };
  }, [editedStages, selectedStage]);

  const handleStageChange = (field: 'subject' | 'bodyHtml', value: string) => {
    setEditedStages(prev =>
      prev.map(s => (s.stage === selectedStage ? { ...s, [field]: value } : s))
    );
  };

  // Previews
  const mockLead: Partial<Lead> = {
    name: 'Jordan Belfort',
    company: 'Apex Solutions',
    painPoint: 'slow manual outreach latency',
    email: 'jordan@apex-example.com'
  };

  const senderName = currentUser?.name || 'Alex Morgan';
  const renderedSubject = renderEmailMergeTags(currentStageItem.subject || '', mockLead, senderName);
  const renderedHeader = globalHeader ? renderEmailMergeTags(globalHeader, mockLead, senderName) : '';
  const renderedBody = renderEmailMergeTags(currentStageItem.bodyHtml || '', mockLead, senderName);
  const renderedFooter = globalFooter ? renderEmailMergeTags(globalFooter, mockLead, senderName) : '';

  const fullComposedHtml = useMemo(() => {
    const parts: string[] = [];
    if (renderedHeader.trim()) parts.push(`<div class="email-header" style="margin-bottom: 16px;">${renderedHeader}</div>`);
    parts.push(`<div class="email-body">${renderedBody}</div>`);
    if (renderedFooter.trim()) parts.push(`<div class="email-footer" style="margin-top: 24px;">${renderedFooter}</div>`);
    return parts.join('\n');
  }, [renderedHeader, renderedBody, renderedFooter]);

  const plainTextLength = useMemo(() => {
    return fullComposedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  }, [fullComposedHtml]);

  const isLikelyLong = plainTextLength > 1500;

  const handleInitiateSave = async () => {
    if (!templateSet) return;
    try {
      // Re-fetch latest impact before saving
      const latestImpact = await getCampaignTemplateImpact(campaignId);
      setImpact(latestImpact);
      if (latestImpact.affectedLeadsCount > 0) {
        setShowImpactConfirm(true);
        return;
      }
      await executeSave();
    } catch {
      await executeSave();
    }
  };

  const executeSave = async () => {
    if (!templateSet) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await saveTemplateSet(templateSet.id, editedStages);
      setTemplateSet(updated);
      setEditedStages(updated.stages);
      setShowImpactConfirm(false);
      setSaveSuccess(`Campaign templates saved (v${updated.version})!`);
      setTimeout(() => setSaveSuccess(null), 3000);
      // Refresh impact
      const updatedImpact = await getCampaignTemplateImpact(campaignId);
      setImpact(updatedImpact);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save campaign templates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (!templateSet) return;
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      const restored = await restoreTemplateSetVersion(templateSet.id, version);
      setTemplateSet(restored);
      setEditedStages(restored.stages);
      setShowHistoryModal(false);
      setSaveSuccess(`Restored version ${version}!`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Campaign Templates</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                  {campaignName}
                </span>
                {templateSet && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    v{templateSet.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                The 7 sequence emails used by leads enrolled with <span className="font-semibold text-slate-700">Template Source: Campaign</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {templateSet && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="View version history and restore"
              >
                <History className="w-3.5 h-3.5 text-purple-600" />
                <span>History ({templateSet.history?.length || 0})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Impact Warning Banner */}
        {impact !== null && (
          <div className={`px-6 py-2.5 text-xs font-medium border-b flex items-center justify-between shrink-0 ${
            impact.affectedLeadsCount > 0
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 shrink-0 ${impact.affectedLeadsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>
                {impact.affectedLeadsCount > 0 ? (
                  <>
                    <strong className="font-bold text-amber-950">{impact.affectedLeadsCount} leads</strong> from{' '}
                    <strong className="font-bold text-amber-950">{impact.userCount} users</strong> are currently running on this campaign template.
                  </>
                ) : (
                  <>No active leads are currently running on this campaign template.</>
                )}
              </span>
            </div>
            {impact.affectedLeadsCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700">
                Edits apply to their next scheduled send
              </span>
            )}
          </div>
        )}

        {/* Success / Error notification */}
        {saveSuccess && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Stage Selector Sidebar */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:block">
                Sequence Stages (1–7)
              </div>
              {[1, 2, 3, 4, 5, 6, 7].map(stNum => {
                const stageData = editedStages.find(s => s.stage === stNum);
                const isSelected = selectedStage === stNum;
                return (
                  <button
                    key={stNum}
                    type="button"
                    onClick={() => setSelectedStage(stNum)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer shrink-0 md:shrink ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {stNum}
                    </span>
                    <div className="truncate flex-1">
                      <div className="text-xs truncate">{stageData?.name || `Stage ${stNum}`}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-red-100' : 'text-slate-400'}`}>
                        {stageData?.purpose || 'Sequence touchpoint'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Editor & Preview Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              
              {/* Tab selector */}
              <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === 'edit'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Stage {selectedStage}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === 'preview'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Email</span>
                  </button>
                </div>

                {activeTab === 'preview' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        previewMode === 'desktop' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Desktop preview (600px)"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        previewMode === 'mobile' ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Mobile preview (375px)"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tab 1: Edit Mode */}
              {activeTab === 'edit' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Subject input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={currentStageItem.subject || ''}
                      onChange={(e) => handleStageChange('subject', e.target.value)}
                      placeholder="e.g. Quick question regarding {{pain_point}} at {{company}}"
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-red-500 disabled:bg-slate-50"
                    />
                  </div>

                  {/* Body HTML textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Email Body (HTML / Text)
                      </label>
                      <div className="text-[11px] text-slate-400">
                        {currentStageItem.bodyHtml?.length || 0} characters
                      </div>
                    </div>
                    <textarea
                      disabled={!canEdit}
                      rows={12}
                      value={currentStageItem.bodyHtml || ''}
                      onChange={(e) => handleStageChange('bodyHtml', e.target.value)}
                      placeholder="Write your email body here. HTML formatting like <p>, <br>, <strong> and <a> links is supported."
                      className="w-full px-3.5 py-2.5 text-xs font-mono text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:border-red-500 disabled:bg-slate-50 resize-y"
                    />
                  </div>

                  {/* Merge variables helper */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>Available Merge Tags (Click to copy)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '{{first_name}}',
                        '{{last_name}}',
                        '{{name}}',
                        '{{company}}',
                        '{{pain_point}}',
                        '{{sender_name}}',
                        '{{sender_title}}',
                        '{{email}}'
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                          }}
                          className="px-2 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Click to copy"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length warning if total composed plain text > 1500 chars */}
                  {isLikelyLong && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Length Warning:</strong> The composed email contains ~{plainTextLength} characters (exceeds recommended 1,500 characters). Long emails risk lower reply rates and clipping in Gmail.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Preview Mode */}
              {activeTab === 'preview' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
                  
                  {/* Outer preview card */}
                  <div
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all my-auto"
                    style={{
                      width: previewMode === 'desktop' ? '600px' : '375px',
                      maxWidth: '100%'
                    }}
                  >
                    {/* Mock Email Client Header */}
                    <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Simulated Inbox Preview</span>
                        <span className="font-semibold text-slate-500">Stage {selectedStage}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-500 shrink-0">Subject:</span>
                        <span className="font-bold text-slate-900 truncate">{renderedSubject || '(No Subject)'}</span>
                      </div>
                      <div className="flex items-baseline gap-2 text-slate-600 text-[11px]">
                        <span className="font-semibold text-slate-400 shrink-0">To:</span>
                        <span>{mockLead.name} &lt;{mockLead.email}&gt;</span>
                      </div>
                      <div className="flex items-baseline gap-2 text-slate-600 text-[11px]">
                        <span className="font-semibold text-slate-400 shrink-0">From:</span>
                        <span>{senderName}</span>
                      </div>
                    </div>

                    {/* Email Content Container */}
                    <div className="p-6 text-slate-800 text-xs leading-relaxed space-y-4">
                      {/* Global Header (locked) */}
                      {renderedHeader.trim() && (
                        <div className="relative group p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <Lock className="w-3 h-3" />
                            <span>Global Header</span>
                          </div>
                          <div dangerouslySetInnerHTML={{ __html: renderedHeader }} />
                        </div>
                      )}

                      {/* Stage Body */}
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: renderedBody || '<p class="text-slate-400 italic">No body text</p>' }} />
                      </div>

                      {/* Global Footer (locked) */}
                      {renderedFooter.trim() && (
                        <div className="relative group p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <div className="absolute top-1.5 right-2 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <Lock className="w-3 h-3" />
                            <span>Global Footer</span>
                          </div>
                          <div dangerouslySetInnerHTML={{ __html: renderedFooter }} />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* Footer actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {canEdit ? (
              <span>Editing all 7 sequence stages for campaign <strong>{campaignName}</strong></span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Read-only: Only campaign owner or admin can edit
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            {canEdit && (
              <button
                type="button"
                disabled={isSaving || isLoading}
                onClick={handleInitiateSave}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Campaign Templates'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation Modal for Impact Warning */}
      {showImpactConfirm && impact && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Template Changes</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              <strong className="text-slate-900">{impact.affectedLeadsCount} leads</strong> from{' '}
              <strong className="text-slate-900">{impact.userCount} users</strong> are running on this campaign template and will be affected.
              <br />
              <span className="text-[11px] text-slate-500 mt-2 block">
                Their next automated emails will immediately use this updated template text.
              </span>
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImpactConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={executeSave}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Snapshots Modal */}
      {showHistoryModal && templateSet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Version History (Last 10)</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(!templateSet.history || templateSet.history.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No previous versions recorded yet. Each save creates a historical snapshot.
                </div>
              ) : (
                templateSet.history.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Version {h.version}</span>
                        {h.changeNote && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {h.changeNote}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Saved by {h.editedBy} • {new Date(h.editedAt).toLocaleString()}
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={() => handleRestore(h.version)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
