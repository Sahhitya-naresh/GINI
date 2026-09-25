import React, { useState } from 'react';
import { StageTemplate, Lead, ConnectedSender } from '../types';
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
  Table as TableIcon
} from 'lucide-react';

interface TemplateAdminProps {
  templates: StageTemplate[];
  onSaveTemplates: (updated: StageTemplate[]) => void;
  leads: Lead[];
  senderName: string;
  senders?: ConnectedSender[];
}

export const TemplateAdmin: React.FC<TemplateAdminProps> = ({
  templates,
  onSaveTemplates,
  leads,
  senderName,
  senders = []
}) => {
  const [selectedStageNumber, setSelectedStageNumber] = useState<number>(1);
  const [editedTemplates, setEditedTemplates] = useState<StageTemplate[]>(templates);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeLeadIndex, setActiveLeadIndex] = useState<number>(0);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [showTableView, setShowTableView] = useState(false);

  const currentTemplate = editedTemplates.find(t => t.stage === selectedStageNumber) || editedTemplates[0];

  // Select sample lead for preview
  const previewLead: Partial<Lead> = leads.length > 0 
    ? leads[activeLeadIndex] || leads[0] 
    : {
        name: 'Jordan Belfort',
        company: 'Apex Systems',
        painPoint: 'slow manual lead qualification & follow-up latency',
        email: 'jordan@apex-example.com'
      };

  const renderedSubject = renderEmailMergeTags(currentTemplate.subject, previewLead, senderName);
  const renderedBodyHtml = renderEmailMergeTags(currentTemplate.bodyHtml, previewLead, senderName);

  const handleFieldChange = (field: keyof StageTemplate, value: any) => {
    const updated = editedTemplates.map(t => {
      if (t.stage === selectedStageNumber) {
        return { ...t, [field]: value };
      }
      return t;
    });
    setEditedTemplates(updated);
  };

  const handleSave = () => {
    onSaveTemplates(editedTemplates);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const handleResetCurrent = () => {
    const defaultOne = DEFAULT_STAGE_TEMPLATES.find(t => t.stage === selectedStageNumber);
    if (!defaultOne) return;
    const updated = editedTemplates.map(t => (t.stage === selectedStageNumber ? { ...defaultOne } : t));
    setEditedTemplates(updated);
  };

  const insertMergeTag = (tag: string) => {
    const textarea = document.getElementById('template-body-input') as HTMLTextAreaElement | null;
    if (!textarea) {
      handleFieldChange('bodyHtml', currentTemplate.bodyHtml + ` ${tag}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentTemplate.bodyHtml;
    const newText = text.substring(0, start) + tag + text.substring(end);
    handleFieldChange('bodyHtml', newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-red-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">7-Stage Sequence Template Studio</h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-md border border-red-200">
              HTML Email Client Ready
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Write responsive single-column outreach emails with merge variables. Test live desktop & mobile viewport heights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetCurrent}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Reset this stage to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stage</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs shadow-red-500/20 transition-all"
          >
            {showSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{showSavedToast ? 'Templates Saved!' : 'Save All Stages'}</span>
          </button>
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
            <span>{showTableView ? 'Switch to Stage Pills' : 'View Stages & Senders Table'}</span>
          </button>
        </div>

        {showTableView ? (
          /* Table View with dedicated Sender Account column */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Stage #</th>
                  <th className="py-2.5 px-3">Stage Name</th>
                  <th className="py-2.5 px-3">Wait Delay</th>
                  <th className="py-2.5 px-3 bg-red-50/50 text-red-900 border-x border-red-100">Sender Account (Column)</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {editedTemplates.map((t) => {
                  const isSelected = t.stage === selectedStageNumber;
                  const sender = senders.find(s => s.id === t.senderId);
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
                      <td className="py-2.5 px-3 bg-red-50/30 border-x border-red-100 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {sender ? `${sender.name} (${sender.email})` : `Default (${senderName})`}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
                        {t.subject}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStageNumber(t.stage);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        >
                          {isSelected ? 'Editing' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid of Stage Pills */
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {editedTemplates.map((t) => {
              const isSelected = t.stage === selectedStageNumber;
              const sender = senders.find(s => s.id === t.senderId);
              return (
                <button
                  key={t.stage}
                  onClick={() => setSelectedStageNumber(t.stage)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-red-50/80 border-red-500 shadow-xs ring-1 ring-red-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      Stage {t.stage}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {t.defaultGapDays}d
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">{t.name}</p>
                  {/* Sender Account tag */}
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate">
                    <UserCheck className="w-2.5 h-2.5 text-red-500 shrink-0" />
                    <span className="truncate">
                      {sender ? sender.name : 'Default'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Studio Grid: Left = Editor, Right = Dual Viewport Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Editor Panel (6 cols on lg) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-red-100 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Stage {currentTemplate.stage}: {currentTemplate.name}
                </h3>
                <p className="text-xs text-slate-500">{currentTemplate.purpose}</p>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${editorMode === 'visual' ? 'bg-white shadow-2xs text-red-700 font-semibold' : 'text-slate-600'}`}
                >
                  Visual Fields
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('code')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${editorMode === 'code' ? 'bg-white shadow-2xs text-red-700 font-semibold' : 'text-slate-600'}`}
                >
                  Raw HTML
                </button>
              </div>
            </div>

            {/* Gap Days, Purpose & SENDER COLUMN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stage Title</label>
                <input
                  type="text"
                  value={currentTemplate.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wait Gap Before Send
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={currentTemplate.defaultGapDays}
                    onChange={(e) => handleFieldChange('defaultGapDays', parseInt(e.target.value, 10) || 3)}
                    className="w-20 text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-xs text-slate-500">Days</span>
                </div>
              </div>
              {/* Sender Account Column */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>Sender Account</span>
                </label>
                <select
                  value={currentTemplate.senderId || ''}
                  onChange={(e) => {
                    const chosen = senders.find(s => s.id === e.target.value);
                    handleFieldChange('senderId', e.target.value);
                    handleFieldChange('senderEmail', chosen?.email || '');
                  }}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
                >
                  <option value="">Default ({senderName})</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Subject Line</label>
                {selectedStageNumber > 1 && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                    Sends in existing email thread (Re:)
                  </span>
                )}
              </div>
              <input
                type="text"
                value={currentTemplate.subject}
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

            {/* Email Body Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {editorMode === 'visual' ? 'Email HTML Body Markup' : 'Raw HTML (Single-column table layout)'}
                </label>
                <span className="text-[11px] text-slate-400">Inline CSS & tables for universal email client rendering</span>
              </div>
              <textarea
                id="template-body-input"
                rows={12}
                value={currentTemplate.bodyHtml}
                onChange={(e) => handleFieldChange('bodyHtml', e.target.value)}
                className="w-full p-3 font-mono text-xs leading-relaxed rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 bg-slate-50/50"
              />
            </div>

            {/* Compliance & Height Guidance note */}
            <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-950">
              <Info className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="font-semibold">Email Design Standard:</strong> Desktop emails (~600px width) should fit within the preview window without vertical scroll. Mobile view (~375px) should require at most 1–2 gentle scrolls.
              </div>
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
                  Stage {currentTemplate.stage}
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
                  <span>Desktop (640px)</span>
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

            {/* Email Header Simulation */}
            <div className="px-5 py-3 bg-white border-b border-slate-100 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-semibold text-slate-700 w-14">Subject:</span>
                <span className="font-medium text-slate-900 truncate">{renderedSubject}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-semibold text-slate-700 w-14">To:</span>
                <span className="text-slate-800">{previewLead.name} &lt;{previewLead.email || 'lead@example.com'}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="font-semibold text-slate-700 w-14">Pain Point:</span>
                <span className="text-slate-600 italic truncate">{previewLead.painPoint}</span>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="flex-1 bg-slate-100/70 p-4 sm:p-6 overflow-auto flex justify-center items-start min-h-[420px]">
              {previewDevice === 'desktop' ? (
                /* Desktop Email Frame (640px) */
                <div className="w-full max-w-[640px] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="font-mono">Viewport: 640px &bull; Fits without vertical scroll</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                      Optimal Height
                    </span>
                  </div>
                  <div 
                    className="p-1"
                    dangerouslySetInnerHTML={{ __html: renderedBodyHtml }} 
                  />
                </div>
              ) : (
                /* Mobile Phone Frame (375px) */
                <div className="w-[375px] max-w-full bg-slate-900 p-3 rounded-[36px] shadow-xl border-4 border-slate-800 transition-all duration-200">
                  {/* Phone Speaker & Notch */}
                  <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  </div>
                  {/* Phone Screen */}
                  <div className="bg-white rounded-[24px] overflow-hidden min-h-[480px] max-h-[580px] overflow-y-auto">
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>375px Mobile View</span>
                      <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-medium">Single/Double Scroll</span>
                    </div>
                    <div 
                      className="p-1"
                      dangerouslySetInnerHTML={{ __html: renderedBodyHtml }} 
                    />
                  </div>
                  {/* Phone Bottom Pill */}
                  <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
                </div>
              )}
            </div>

            {/* Bottom Status / Summary */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>Variables previewed: <strong className="text-slate-700">{previewLead.company}</strong>, <strong className="text-slate-700">{previewLead.name}</strong></span>
              <span className="text-slate-400 font-mono text-[11px]">RFC-2822 Safe</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
