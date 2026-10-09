import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Settings as SettingsIcon, 
  Clock, 
  User, 
  ShieldCheck, 
  Check, 
  Upload, 
  RotateCcw,
  Image as ImageIcon,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Key,
  Send,
  RefreshCw,
  AlertCircle,
  Building2,
  Tag,
  Edit2,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { AppSettings, StageTemplate, ConnectedSender } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  getReplyKeywordRules,
  saveReplyKeywordRules,
  resetReplyKeywordRules,
  testReplyClassification,
  previewRecentReplyClassifications,
  KeywordListsData,
  ReplyPreviewItem,
  ReplyClassificationTestResult
} from '../services/leadBackendService';
import { getHeaderFooter, saveHeaderFooter } from '../services/templateService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  templates: StageTemplate[];
  onSaveSettings: (settings: AppSettings) => void;
  userEmail: string;
  senders?: ConnectedSender[];
  onSaveSenders?: (senders: ConnectedSender[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  templates,
  onSaveSettings,
  userEmail,
  senders = [],
  onSaveSenders
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [localSenders, setLocalSenders] = useState<ConnectedSender[]>(senders);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddSender, setShowAddSender] = useState(false);
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderLimit, setNewSenderLimit] = useState(50);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [graphStatus, setGraphStatus] = useState<any>(null);
  const [testEmailTo, setTestEmailTo] = useState('nick.ron890@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Email Header & Footer state (Admin only)
  const [emailHeader, setEmailHeader] = useState<string>('');
  const [emailFooter, setEmailFooter] = useState<string>('');
  const [isSavingHeaderFooter, setIsSavingHeaderFooter] = useState<boolean>(false);
  const [headerFooterToast, setHeaderFooterToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getHeaderFooter().then(res => {
        setEmailHeader(res.header || '');
        setEmailFooter(res.footer || '');
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSaveHeaderFooter = async () => {
    setIsSavingHeaderFooter(true);
    try {
      const res = await saveHeaderFooter(emailHeader, emailFooter);
      setEmailHeader(res.header);
      setEmailFooter(res.footer);
      setHeaderFooterToast('Header & footer saved!');
      setTimeout(() => setHeaderFooterToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save header and footer');
    } finally {
      setIsSavingHeaderFooter(false);
    }
  };

  const fetchGraphStatus = async () => {
    try {
      const res = await fetch('/api/email/service-account');
      if (res.ok) {
        const data = await res.json();
        setGraphStatus(data);
      }
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------------------
  // Reply Classifier Keywords State & Handlers
  // -------------------------------------------------------------------------
  const [activeKeywordTab, setActiveKeywordTab] = useState<'negativePhrases' | 'positivePhrases' | 'deferralPhrases' | 'autoReplyPhrases'>('negativePhrases');
  const [keywordLists, setKeywordLists] = useState<KeywordListsData>({
    negativePhrases: [],
    positivePhrases: [],
    deferralPhrases: [],
    autoReplyPhrases: []
  });
  const [defaultKeywordLists, setDefaultKeywordLists] = useState<KeywordListsData>({
    negativePhrases: [],
    positivePhrases: [],
    deferralPhrases: [],
    autoReplyPhrases: []
  });
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);
  const [keywordToastMsg, setKeywordToastMsg] = useState<string | null>(null);
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [phraseValidationMsg, setPhraseValidationMsg] = useState<{ type: 'error' | 'warning'; text: string; phraseToAdd?: string } | null>(null);
  const [editingPhraseIndex, setEditingPhraseIndex] = useState<number | null>(null);
  const [editingPhraseText, setEditingPhraseText] = useState('');

  // Try-It Box ("Test a Reply")
  const [testReplyText, setTestReplyText] = useState('');
  const [isTestingReply, setIsTestingReply] = useState(false);
  const [tryItResult, setTryItResult] = useState<ReplyClassificationTestResult | null>(null);

  // Preview Last 10 Replies
  const [previewReplies, setPreviewReplies] = useState<ReplyPreviewItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [showPreviewsTable, setShowPreviewsTable] = useState(false);

  const fetchKeywordRules = async () => {
    try {
      const data = await getReplyKeywordRules();
      if (data && data.success) {
        setKeywordLists(data.lists);
        setDefaultKeywordLists(data.defaults);
      }
    } catch (err) {
      console.warn('Error loading reply rules:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGraphStatus();
      fetchKeywordRules();
    }
  }, [isOpen]);

  const showKeywordToast = (msg: string) => {
    setKeywordToastMsg(msg);
    setTimeout(() => setKeywordToastMsg(null), 3000);
  };

  const handleAddPhrase = async (phraseToAdd?: string, skipWarning = false) => {
    const raw = phraseToAdd !== undefined ? phraseToAdd : newPhraseInput;
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!normalized) {
      setPhraseValidationMsg({ type: 'error', text: 'Phrase cannot be empty' });
      return;
    }

    if (normalized.length < 2 || normalized.length > 80) {
      setPhraseValidationMsg({ type: 'error', text: 'Phrase length must be between 2 and 80 characters' });
      return;
    }

    const currentList = keywordLists[activeKeywordTab] || [];
    const isDup = currentList.some(p => p.toLowerCase().trim() === normalized);
    if (isDup) {
      setPhraseValidationMsg({ type: 'error', text: `Phrase "${normalized}" already exists in this list (duplicate)` });
      return;
    }

    const COMMON_WORDS = new Set(['no', 'stop', 'yes', 'not', 'ok', 'okay', 'thanks', 'thank', 'sure', 'hi', 'hello', 'bye', 'please', 'help']);
    if (!skipWarning && normalized.split(' ').length === 1 && COMMON_WORDS.has(normalized)) {
      setPhraseValidationMsg({
        type: 'warning',
        text: `"${normalized}" is a single very common word. It may match unintended replies (e.g. in casual phrasing). Are you sure you want to add it?`,
        phraseToAdd: normalized
      });
      return;
    }

    const updatedList = [...currentList, normalized];
    const updatedLists: KeywordListsData = { ...keywordLists, [activeKeywordTab]: updatedList };
    setKeywordLists(updatedLists);
    setNewPhraseInput('');
    setPhraseValidationMsg(null);

    try {
      setIsSavingKeywords(true);
      await saveReplyKeywordRules({ [activeKeywordTab]: updatedList });
      showKeywordToast(`Added "${normalized}"`);
    } catch (err: any) {
      setPhraseValidationMsg({ type: 'error', text: err.message || 'Failed to save phrase' });
    } finally {
      setIsSavingKeywords(false);
    }
  };

  const handleRemovePhrase = async (phraseToRemove: string) => {
    const currentList = keywordLists[activeKeywordTab] || [];
    const updatedList = currentList.filter(p => p.toLowerCase().trim() !== phraseToRemove.toLowerCase().trim());
    const updatedLists: KeywordListsData = { ...keywordLists, [activeKeywordTab]: updatedList };
    setKeywordLists(updatedLists);

    try {
      setIsSavingKeywords(true);
      await saveReplyKeywordRules({ [activeKeywordTab]: updatedList });
      showKeywordToast(`Removed "${phraseToRemove}"`);
    } catch (err: any) {
      console.warn('Failed to remove phrase:', err);
    } finally {
      setIsSavingKeywords(false);
    }
  };

  const handleSaveEditedPhrase = async () => {
    if (editingPhraseIndex === null) return;
    const currentList = keywordLists[activeKeywordTab] || [];
    const normalized = editingPhraseText.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!normalized) {
      alert('Phrase cannot be empty');
      return;
    }
    if (normalized.length < 2 || normalized.length > 80) {
      alert('Phrase length must be between 2 and 80 characters');
      return;
    }
    const isDup = currentList.some((p, i) => i !== editingPhraseIndex && p.toLowerCase().trim() === normalized);
    if (isDup) {
      alert(`Phrase "${normalized}" already exists in this list (duplicate)`);
      return;
    }

    const updatedList = [...currentList];
    updatedList[editingPhraseIndex] = normalized;
    const updatedLists: KeywordListsData = { ...keywordLists, [activeKeywordTab]: updatedList };
    setKeywordLists(updatedLists);
    setEditingPhraseIndex(null);
    setEditingPhraseText('');

    try {
      setIsSavingKeywords(true);
      await saveReplyKeywordRules({ [activeKeywordTab]: updatedList });
      showKeywordToast(`Updated phrase to "${normalized}"`);
    } catch (err: any) {
      alert(err.message || 'Failed to update phrase');
    } finally {
      setIsSavingKeywords(false);
    }
  };

  const handleResetCategory = async () => {
    const categoryLabels: Record<string, string> = {
      negativePhrases: 'Negative Phrases',
      positivePhrases: 'Positive Phrases',
      deferralPhrases: 'Deferral Phrases',
      autoReplyPhrases: 'Auto-Reply Phrases'
    };
    const label = categoryLabels[activeKeywordTab] || 'phrases';
    if (!window.confirm(`Are you sure you want to reset ${label} to built-in defaults? Any custom additions will be removed.`)) {
      return;
    }

    try {
      setIsSavingKeywords(true);
      const res = await resetReplyKeywordRules(activeKeywordTab);
      if (res && res.success) {
        setKeywordLists(res.lists);
        showKeywordToast(`Reset ${label} to defaults`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reset phrases');
    } finally {
      setIsSavingKeywords(false);
    }
  };

  const handleRunTryItTest = async () => {
    if (!testReplyText.trim()) return;
    setIsTestingReply(true);
    setTryItResult(null);
    try {
      const res = await testReplyClassification(testReplyText);
      if (res && res.success && res.classification) {
        setTryItResult(res.classification);
      } else {
        alert(res.error || 'Failed to test reply');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to test reply');
    } finally {
      setIsTestingReply(false);
    }
  };

  const handleLoadRecentPreviews = async () => {
    setIsLoadingPreviews(true);
    try {
      const res = await previewRecentReplyClassifications();
      if (res && res.success) {
        setPreviewReplies(res.previews || []);
        setShowPreviewsTable(true);
      }
    } catch (err) {
      console.warn('Failed to preview recent replies:', err);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailTo.trim()) return;
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailTo.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Test email sent successfully via Microsoft Graph (Status: ${data.statusCode || 202})!`,
          details: data
        });
        fetchGraphStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test email',
          details: data
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error sending test email'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    if (senders && senders.length > 0) {
      setLocalSenders(senders);
    }
  }, [senders]);

  if (!isOpen) return null;

  const handleStageGapChange = (stage: number, days: number) => {
    setFormData({
      ...formData,
      stageGapDays: {
        ...formData.stageGapDays,
        [stage]: Math.max(1, days)
      }
    });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, customLogoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleResetLogo = () => {
    setFormData(prev => ({ ...prev, customLogoUrl: '' }));
  };

  const handleSenderFieldChange = (id: string, field: keyof ConnectedSender, val: any) => {
    setLocalSenders(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: val };
      }
      return s;
    }));
    // If updating primary sender, keep formData in sync
    const target = localSenders.find(s => s.id === id);
    if (target?.isPrimary) {
      if (field === 'name') setFormData(prev => ({ ...prev, senderName: val }));
      if (field === 'email') setFormData(prev => ({ ...prev, senderEmail: val }));
    }
  };

  const handleSetPrimarySender = (id: string) => {
    setLocalSenders(prev => prev.map(s => ({
      ...s,
      isPrimary: s.id === id
    })));
    const chosen = localSenders.find(s => s.id === id);
    if (chosen) {
      setFormData(prev => ({
        ...prev,
        senderName: chosen.name,
        senderEmail: chosen.email
      }));
    }
  };

  const handleDeleteSender = (id: string) => {
    if (localSenders.length <= 1) return;
    setLocalSenders(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (!remaining.some(s => s.isPrimary) && remaining.length > 0) {
        remaining[0].isPrimary = true;
        setFormData(f => ({ ...f, senderName: remaining[0].name, senderEmail: remaining[0].email }));
      }
      return remaining;
    });
  };

  const handleAddSender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSenderEmail.trim()) return;
    const newId = `sender-${Date.now().toString().slice(-4)}`;
    const created: ConnectedSender = {
      id: newId,
      name: newSenderName.trim() || newSenderEmail.split('@')[0],
      email: newSenderEmail.trim().toLowerCase(),
      status: 'connected',
      dailySendLimit: newSenderLimit || 50,
      sendsToday: 0,
      isPrimary: localSenders.length === 0,
      provider: 'outlook'
    };
    setLocalSenders(prev => [...prev, created]);
    setNewSenderName('');
    setNewSenderEmail('');
    setNewSenderLimit(50);
    setShowAddSender(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    if (onSaveSenders) {
      const syncedSenders = localSenders.map(s => {
        if (s.isPrimary) {
          return {
            ...s,
            name: formData.senderName || s.name,
            email: formData.senderEmail || s.email
          };
        }
        return s;
      });
      onSaveSenders(syncedSenders);
    }
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        id="settings-modal-dialog"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-5 border-b border-red-100 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shadow-xs">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Campaign & Brand Settings</h2>
              <p className="text-xs text-red-100">Upload your company logo and customize timing gaps</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-red-100 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Brand & Logo Settings - Red & White */}
          <div className="space-y-3 p-4 bg-red-50/40 rounded-xl border border-red-200/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-red-600" />
                <span>Your Company Logo</span>
              </h3>
              {formData.customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="text-[11px] font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Custom Logo</span>
                </button>
              )}
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col sm:flex-row items-center gap-4 ${
                isDragging 
                  ? 'border-red-500 bg-red-100/50' 
                  : 'border-red-200 bg-white hover:border-red-300'
              }`}
            >
              {/* Logo Preview (Shown as it is) */}
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center min-w-[120px] min-h-[50px]">
                <img 
                  src={formData.customLogoUrl || '/gini-iris-logo.png'} 
                  alt="Company Logo Preview" 
                  className="max-h-12 max-w-[180px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Upload CTA & Dropzone */}
              <div className="flex-1 w-full text-center sm:text-left space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.customLogoUrl ? 'Replace Logo File' : 'Upload Company Logo'}</span>
                </button>
                <p className="text-[11px] text-slate-500">
                  Select or drag & drop your company logo image (PNG, JPG, SVG). It will display exactly as-is in the header and app.
                </p>
              </div>
            </div>
          </div>

          {/* Sender Identity & Mailboxes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Sender Identity & Mailboxes</span>
              </h3>
              <span className="text-[11px] text-slate-500 bg-slate-100 font-medium px-2 py-0.5 rounded border border-slate-200">
                {localSenders.length} {localSenders.length === 1 ? 'mailbox configured' : 'mailboxes configured'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Sender Display Name
                </label>
                <input
                  type="text"
                  value={formData.senderName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData({ ...formData, senderName: newName });
                    setLocalSenders(prev => prev.map(s => s.isPrimary ? { ...s, name: newName } : s));
                  }}
                  placeholder="e.g. Alex from Giniiris outreach"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Primary Sender Email</span>
                  <span className="text-[10px] text-red-600 font-semibold">Editable</span>
                </label>
                <input
                  type="email"
                  value={formData.senderEmail || userEmail}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setFormData({ ...formData, senderEmail: newEmail });
                    setLocalSenders(prev => prev.map(s => s.isPrimary ? { ...s, email: newEmail } : s));
                  }}
                  placeholder="e.g. sender@company.com"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-slate-800"
                  title="Change sender email address"
                  required
                />
              </div>
            </div>

            {/* Connected Mailboxes List */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-600" />
                  <h4 className="text-xs font-bold text-slate-800">Sender Email Accounts (Used in Workflows & Campaigns)</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSender(!showAddSender)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sender Email</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Configure all email addresses available to send outreach from. You can edit email addresses, change display names, and set daily sending limits.
              </p>

              {/* Add Sender Inline Form */}
              {showAddSender && (
                <div className="p-3 bg-white rounded-lg border border-red-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900">Add New Sender Account</span>
                    <button
                      type="button"
                      onClick={() => setShowAddSender(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Display Name (e.g. Sarah)"
                      value={newSenderName}
                      onChange={(e) => setNewSenderName(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="email"
                      placeholder="Email (e.g. sarah@domain.com)"
                      value={newSenderEmail}
                      onChange={(e) => setNewSenderEmail(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-red-500 font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        placeholder="Daily Limit"
                        value={newSenderLimit}
                        onChange={(e) => setNewSenderLimit(parseInt(e.target.value, 10) || 50)}
                        className="w-20 text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-red-500"
                        title="Daily sending limit"
                      />
                      <button
                        type="button"
                        onClick={handleAddSender}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Senders Table/Cards */}
              <div className="space-y-2">
                {localSenders.map((sender) => (
                  <div 
                    key={sender.id} 
                    className={`p-2.5 bg-white rounded-lg border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      sender.isPrimary ? 'border-red-300 shadow-2xs' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 w-full sm:w-auto">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        sender.isPrimary ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sender.name ? sender.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={sender.name}
                          onChange={(e) => handleSenderFieldChange(sender.id, 'name', e.target.value)}
                          placeholder="Sender Name"
                          className="text-xs font-semibold text-slate-800 border border-transparent hover:border-slate-300 focus:border-red-500 focus:bg-white rounded px-1.5 py-0.5 truncate bg-transparent"
                          title="Click to edit sender display name"
                        />
                        <input
                          type="email"
                          value={sender.email}
                          onChange={(e) => handleSenderFieldChange(sender.id, 'email', e.target.value)}
                          placeholder="sender@company.com"
                          className="text-xs font-mono text-slate-600 border border-transparent hover:border-slate-300 focus:border-red-500 focus:bg-white rounded px-1.5 py-0.5 truncate bg-transparent"
                          title="Click to edit sender email address"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>Limit:</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={sender.dailySendLimit || 50}
                          onChange={(e) => handleSenderFieldChange(sender.id, 'dailySendLimit', parseInt(e.target.value, 10) || 50)}
                          className="w-14 text-center font-bold text-xs py-0.5 border border-slate-200 rounded focus:border-red-500"
                          title="Daily sending limit"
                        />
                        <span>/day</span>
                      </div>

                      {sender.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Primary</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimarySender(sender.id)}
                          className="text-[10px] font-medium text-slate-500 hover:text-red-600 hover:underline px-1.5 py-0.5 rounded transition-colors"
                        >
                          Set Primary
                        </button>
                      )}

                      {localSenders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSender(sender.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Delete this sender"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sequencing Gaps Config */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span>Per-Stage Business Day Gaps</span>
              </h3>
              <span className="text-[11px] text-red-700 bg-red-50 font-semibold px-2 py-0.5 rounded border border-red-200">
                Default: 3 business days
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Number of business days (Mon–Fri) to wait before dispatching the next sequential stage email:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {templates.map((tpl) => (
                <div key={tpl.stage} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                  <div className="truncate max-w-[170px]">
                    <span className="font-bold text-slate-800">Stage {tpl.stage}:</span>
                    <span className="text-slate-500 ml-1 truncate">{tpl.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.stageGapDays[tpl.stage] ?? 3}
                      onChange={(e) => handleStageGapChange(tpl.stage, parseInt(e.target.value, 10) || 3)}
                      className="w-14 text-center font-bold text-xs py-1 border border-slate-300 rounded focus:ring-1 focus:ring-red-500"
                    />
                    <span className="text-slate-400 text-[11px]">days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Positive Reply Company Policy */}
          <div className="space-y-3 p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>When a positive reply is detected</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Control what happens to other active leads at the same company when a prospect responds with positive interest:
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors">
                <input
                  type="radio"
                  name="positiveReplyAction"
                  value="pause_automatically"
                  checked={(formData.positiveReplyAction || 'pause_automatically') === 'pause_automatically'}
                  onChange={() => setFormData(f => ({ ...f, positiveReplyAction: 'pause_automatically' }))}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Pause the company automatically (Default)</span>
                  <span className="text-[11px] text-slate-500">
                    Immediately sets other active leads at that company to Paused so they aren't pitched twice.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors">
                <input
                  type="radio"
                  name="positiveReplyAction"
                  value="ask_first"
                  checked={formData.positiveReplyAction === 'ask_first'}
                  onChange={() => setFormData(f => ({ ...f, positiveReplyAction: 'ask_first' }))}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-800 block">Ask me first</span>
                  <span className="text-[11px] text-slate-500">
                    Creates a notification prompt with Confirm / Dismiss buttons before pausing colleagues.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Reply Keywords & Classifier Rules */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>Reply Classifier Keywords & Rules</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Add, edit, or remove phrases used by the local classifier. Stored in MongoDB and cached in-memory for instant lookups.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {keywordToastMsg && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-fade-in">
                    {keywordToastMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetCategory}
                  disabled={isSavingKeywords}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  title="Reset active category to built-in defaults"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Category</span>
                </button>
              </div>
            </div>

            {/* Keyword Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-200/60 rounded-lg">
              {[
                { id: 'negativePhrases', label: 'Negative', count: keywordLists.negativePhrases.length, color: 'text-rose-700' },
                { id: 'positivePhrases', label: 'Positive', count: keywordLists.positivePhrases.length, color: 'text-emerald-700' },
                { id: 'deferralPhrases', label: 'Deferral', count: keywordLists.deferralPhrases.length, color: 'text-amber-700' },
                { id: 'autoReplyPhrases', label: 'Auto-Reply', count: keywordLists.autoReplyPhrases.length, color: 'text-blue-700' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveKeywordTab(tab.id as any);
                    setPhraseValidationMsg(null);
                    setEditingPhraseIndex(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                    activeKeywordTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeKeywordTab === tab.id ? 'bg-slate-100 ' + tab.color : 'bg-slate-300/50 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Category Explanation Banner */}
            <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              {activeKeywordTab === 'negativePhrases' && (
                <span><strong>Negative Phrases:</strong> Unsubscribes, opt-outs, and clear refusals (e.g. "remove me", "not interested"). Sets status to <em>Negative Reply</em> and halts campaign.</span>
              )}
              {activeKeywordTab === 'positivePhrases' && (
                <span><strong>Positive Phrases:</strong> Interest, demo bookings, and calls (e.g. "interested", "let's connect"). Sets <em>Replied</em> and pauses active colleagues at the same company.</span>
              )}
              {activeKeywordTab === 'deferralPhrases' && (
                <span><strong>Deferral Phrases:</strong> Future timing or delay (e.g. "not now", "next quarter", "circle back"). Classified as <em>neutral</em> (Replied).</span>
              )}
              {activeKeywordTab === 'autoReplyPhrases' && (
                <span><strong>Auto-Reply Phrases:</strong> Out-of-office, vacation, undeliverables, and bounces. Classified as <em>neutral</em> and flagged as automated response.</span>
              )}
            </div>

            {/* Add Phrase Input Bar */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhraseInput}
                  onChange={(e) => {
                    setNewPhraseInput(e.target.value);
                    if (phraseValidationMsg) setPhraseValidationMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPhrase();
                    }
                  }}
                  placeholder={`Add ${activeKeywordTab === 'negativePhrases' ? 'negative' : activeKeywordTab === 'positivePhrases' ? 'positive' : activeKeywordTab === 'deferralPhrases' ? 'deferral' : 'auto-reply'} phrase (e.g. "we already have a vendor")...`}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleAddPhrase()}
                  disabled={!newPhraseInput.trim() || isSavingKeywords}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phrase</span>
                </button>
              </div>

              {/* Inline Validation Error */}
              {phraseValidationMsg && phraseValidationMsg.type === 'error' && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{phraseValidationMsg.text}</span>
                </div>
              )}

              {/* Inline Warning for Common Words */}
              {phraseValidationMsg && phraseValidationMsg.type === 'warning' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{phraseValidationMsg.text}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddPhrase(phraseValidationMsg.phraseToAdd, true)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold"
                    >
                      Add Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhraseValidationMsg(null)}
                      className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keyword Chips Container */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 max-h-56 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {(keywordLists[activeKeywordTab] || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">No phrases configured in this list.</div>
                ) : (
                  (keywordLists[activeKeywordTab] || []).map((phrase, idx) => {
                    const isDefault = defaultKeywordLists[activeKeywordTab]?.some(
                      d => d.toLowerCase().trim() === phrase.toLowerCase().trim()
                    );
                    const isEditing = editingPhraseIndex === idx;

                    if (isEditing) {
                      return (
                        <div key={idx} className="flex items-center gap-1 p-1 bg-purple-50 border border-purple-300 rounded-md">
                          <input
                            type="text"
                            value={editingPhraseText}
                            onChange={(e) => setEditingPhraseText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEditedPhrase();
                              } else if (e.key === 'Escape') {
                                setEditingPhraseIndex(null);
                              }
                            }}
                            className="text-[11px] px-1.5 py-0.5 bg-white border border-purple-200 rounded font-mono w-48 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditedPhrase}
                            className="p-1 hover:bg-purple-200 text-purple-700 rounded text-[10px] font-semibold"
                            title="Save changes"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPhraseIndex(null)}
                            className="p-1 hover:bg-purple-200 text-slate-500 rounded text-[10px]"
                            title="Cancel edit"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                          isDefault
                            ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300'
                            : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:border-emerald-400 font-medium'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{phrase}</span>
                        {!isDefault && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                            Custom
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPhraseIndex(idx);
                            setEditingPhraseText(phrase);
                          }}
                          className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-colors"
                          title="Edit phrase"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhrase(phrase)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                          title="Remove phrase"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Try-It Box ("Test a Reply") */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Test a Reply (Real Classifier)</span>
                </div>
                <span className="text-[10px] text-slate-400">Classifies text with active saved phrases</span>
              </div>
              <textarea
                rows={2}
                value={testReplyText}
                onChange={(e) => setTestReplyText(e.target.value)}
                placeholder="Paste a sample prospect reply here (e.g. 'we already have a vendor, please do not contact')..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRunTryItTest}
                  disabled={isTestingReply || !testReplyText.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isTestingReply ? 'Testing...' : 'Test Classification'}</span>
                </button>
                {tryItResult && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Result:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      tryItResult.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      tryItResult.sentiment === 'negative' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {tryItResult.sentiment}
                    </span>
                  </div>
                )}
              </div>
              {tryItResult && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="text-slate-700"><strong>Reason:</strong> {tryItResult.reason}</div>
                  <div className="text-slate-700"><strong>Matched Phrases:</strong> {tryItResult.matchedPhrases.length > 0 ? tryItResult.matchedPhrases.join(', ') : '(none)'}</div>
                </div>
              )}
            </div>

            {/* Re-check Last 10 Replies (Preview Only) */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Re-check Last 10 Replies (Preview Only)</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadRecentPreviews}
                  disabled={isLoadingPreviews}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingPreviews ? 'animate-spin' : ''}`} />
                  <span>{isLoadingPreviews ? 'Simulating...' : 'Preview Last 10'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Preview how the last 10 replies would be classified with the current keyword lists. <strong>Safe preview only</strong> — this does not modify any lead records or statuses.
              </p>
              {showPreviewsTable && (
                previewReplies.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">No replies found in database.</div>
                ) : (
                  <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-200 rounded-lg mt-2">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 sticky top-0">
                        <tr>
                          <th className="p-2 font-semibold">Lead</th>
                          <th className="p-2 font-semibold">Snippet</th>
                          <th className="p-2 font-semibold">Current</th>
                          <th className="p-2 font-semibold">Simulated</th>
                          <th className="p-2 font-semibold">Matched Phrases</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewReplies.map(p => (
                          <tr key={p.leadId} className={p.sentimentChanged ? 'bg-amber-50/50' : ''}>
                            <td className="p-2 font-medium text-slate-800">{p.name || p.email}</td>
                            <td className="p-2 text-slate-600 max-w-xs truncate" title={p.replySnippet}>{p.replySnippet || '(empty)'}</td>
                            <td className="p-2 font-semibold capitalize text-slate-700">{p.currentSentiment}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                p.simulatedSentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                                p.simulatedSentiment === 'negative' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {p.simulatedSentiment}
                              </span>
                            </td>
                            <td className="p-2 text-slate-500">{p.matchedPhrases.join(', ') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Microsoft Graph App-Only Service Account Mailbox */}
          <div className="space-y-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>Microsoft Graph Service Account Mailbox</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchGraphStatus}
                  className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-200/60 transition-colors"
                  title="Refresh Graph credentials status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-blue-700 bg-blue-50 font-semibold px-2 py-0.5 rounded border border-blue-200">
                  App-Only Client Credentials
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Outreach Flow sends and reads emails via a single fixed Microsoft 365 mailbox using OAuth 2.0 client credentials (no interactive user login). Credentials are saved server-side only:
            </p>

            {/* Diagnostic Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Tenant ID</span>
                <span className="font-mono font-semibold text-slate-800 truncate block">
                  {graphStatus?.diagnostics?.tenantId || (graphStatus?.diagnostics?.configured ? 'Configured' : 'Missing')}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Client ID</span>
                <span className="font-mono font-semibold text-slate-800 truncate block">
                  {graphStatus?.diagnostics?.clientId || (graphStatus?.diagnostics?.configured ? 'Configured' : 'Missing')}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Client Secret</span>
                <span className={`font-semibold flex items-center gap-1 ${graphStatus?.diagnostics?.hasClientSecret ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${graphStatus?.diagnostics?.hasClientSecret ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {graphStatus?.diagnostics?.hasClientSecret ? 'Configured' : 'Not Set in Env'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-medium">Token Cache</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {graphStatus?.diagnostics?.hasCachedToken 
                    ? `Cached (${Math.round((graphStatus.diagnostics.tokenExpiresInSec || 0) / 60)}m)` 
                    : 'Pending request'}
                </span>
              </div>
            </div>

            {/* Mailbox Profile Details */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Active Service Mailbox:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {graphStatus?.profile?.serviceAccount || formData.senderEmail || 'outreach@yourdomain.com'}
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Display Name: <strong className="text-slate-700">{graphStatus?.profile?.displayName || formData.senderName || 'Outreach Flow'}</strong>
                </span>
              </div>
              <div className="shrink-0">
                {graphStatus?.diagnostics?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Credentials Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    <span>Requires Secret in Env</span>
                  </span>
                )}
              </div>
            </div>

            {/* Test Email Dispatch Form */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-red-600" />
                  <span>Send Real Test Email via Microsoft Graph</span>
                </span>
                <span className="text-[10px] text-slate-500">POST /users/{'{mailbox}'}/sendMail</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-red-500 font-mono"
                  title="Recipient for test email"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmailTo.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Email</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.details && (
                      <p className="text-[11px] opacity-80 mt-0.5 font-mono break-all">
                        {JSON.stringify(testResult.details)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Global Email Header & Footer (Admin Only) */}
          <div className="space-y-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-600" />
                  <span>Global Email Header &amp; Footer</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Composed with every outbound email across runner, manual send, and previews.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {headerFooterToast && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-fade-in">
                    {headerFooterToast}
                  </span>
                )}
                <span className="text-[10px] text-red-700 bg-red-50 font-semibold px-2 py-0.5 rounded border border-red-200">
                  Admin Configured
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Global Email Header HTML
                </label>
                <textarea
                  rows={3}
                  value={emailHeader}
                  onChange={(e) => setEmailHeader(e.target.value)}
                  placeholder="<div style='text-align: center;'><img src='https://...' alt='Logo'/></div>"
                  className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 bg-white text-slate-800"
                />
                <span className="text-[11px] text-slate-400">Supports simple formatting, links, https images, and merge tags. Empty by default.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Global Email Footer HTML
                </label>
                <textarea
                  rows={3}
                  value={emailFooter}
                  onChange={(e) => setEmailFooter(e.target.value)}
                  placeholder="<p style='color: #888;'>Acme Corp &bull; Unsubscribe</p>"
                  className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 bg-white text-slate-800"
                />
                <span className="text-[11px] text-slate-400">Footer links are never rewritten with click tracking. Empty by default.</span>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveHeaderFooter}
                  disabled={isSavingHeaderFooter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingHeaderFooter ? 'Saving Header/Footer...' : 'Save Header & Footer'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Logic rules recap */}
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Automatic Safety Rule:</strong> If a prospect replies to any stage email in Microsoft Outlook or the active email provider, Giniiris outreach flow immediately detects it, moves them to the <em>Needs Manual Reply</em> queue, and halts all subsequent automated stages permanently.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs shadow-red-500/20 transition-all"
            >
              {showSavedToast ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{showSavedToast ? 'Settings Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
