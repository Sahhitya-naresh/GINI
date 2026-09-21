import React, { useState, useId, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  ArrowRight, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  HelpCircle,
  FolderPlus,
  Users
} from 'lucide-react';
import { Lead, ImportCandidate } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLeads?: Lead[];
  onCommitImport: (newLeads: Lead[], summary: { imported: number; skippedDuplicates: number; invalid: number }) => Promise<void>;
  isImporting?: boolean;
}

type TargetField = 
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'company'
  | 'job_title'
  | 'linkedin_url'
  | 'pain_point'
  | 'industry'
  | 'notes';

const TARGET_FIELDS: { key: TargetField; label: string; required: boolean; hint: string }[] = [
  { key: 'email', label: 'Email Address', required: true, hint: 'Primary identifier for sending & deduplication' },
  { key: 'first_name', label: 'First Name', required: false, hint: 'Used for {{first_name}} merge tag' },
  { key: 'last_name', label: 'Last Name', required: false, hint: 'Used for full name & formal salutations' },
  { key: 'company', label: 'Company Name', required: false, hint: 'Used for {{company}} merge tag' },
  { key: 'job_title', label: 'Job Title', required: false, hint: 'Stored for targeting & personalization' },
  { key: 'pain_point', label: 'Pain Point(s)', required: false, hint: 'Used for {{pain_point}} merge tag' },
  { key: 'industry', label: 'Industry', required: false, hint: 'Stored for industry benchmarking' },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false, hint: 'Stored data ready for future LinkedIn outreach' },
  { key: 'notes', label: 'Notes', required: false, hint: 'Internal CRM notes & context' },
];

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  isOpen,
  onClose,
  existingLeads,
  onCommitImport,
  isImporting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<TargetField, string>>({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    job_title: '',
    linkedin_url: '',
    pain_point: '',
    industry: '',
    notes: ''
  });

  const [campaignName, setCampaignName] = useState<string>('Outbound Campaign');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'all' | 'valid' | 'duplicates' | 'invalid'>('all');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Auto-detect header mapping based on common column name variations or server hints
  const autoDetectMapping = (headers: string[], serverDetected?: Record<string, string>) => {
    const newMapping: Record<TargetField, string> = {
      first_name: '',
      last_name: '',
      email: '',
      company: '',
      job_title: '',
      linkedin_url: '',
      pain_point: '',
      industry: '',
      notes: ''
    };

    // If server already found matches, prefill those
    if (serverDetected) {
      if (serverDetected.email && headers.includes(serverDetected.email)) newMapping.email = serverDetected.email;
      if (serverDetected.firstName && headers.includes(serverDetected.firstName)) newMapping.first_name = serverDetected.firstName;
      if (serverDetected.lastName && headers.includes(serverDetected.lastName)) newMapping.last_name = serverDetected.lastName;
      if (serverDetected.company && headers.includes(serverDetected.company)) newMapping.company = serverDetected.company;
      if (serverDetected.jobTitle && headers.includes(serverDetected.jobTitle)) newMapping.job_title = serverDetected.jobTitle;
      if (serverDetected.linkedinUrl && headers.includes(serverDetected.linkedinUrl)) newMapping.linkedin_url = serverDetected.linkedinUrl;
      if (serverDetected.painPoint && headers.includes(serverDetected.painPoint)) newMapping.pain_point = serverDetected.painPoint;
      if (serverDetected.industry && headers.includes(serverDetected.industry)) newMapping.industry = serverDetected.industry;
      if (serverDetected.notes && headers.includes(serverDetected.notes)) newMapping.notes = serverDetected.notes;
    }

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    headers.forEach(header => {
      const norm = normalize(header);

      if (!newMapping.email && (norm === 'email' || norm === 'emailaddress' || norm === 'mail' || norm === 'contactemail' || norm === 'workemail')) {
        newMapping.email = header;
      } else if (!newMapping.first_name && (norm === 'firstname' || norm === 'first' || norm === 'fname' || norm === 'givenname')) {
        newMapping.first_name = header;
      } else if (!newMapping.last_name && (norm === 'lastname' || norm === 'last' || norm === 'lname' || norm === 'surname')) {
        newMapping.last_name = header;
      } else if (!newMapping.company && (norm === 'company' || norm === 'companyname' || norm === 'organization' || norm === 'account' || norm === 'targetfirm' || norm === 'firm')) {
        newMapping.company = header;
      } else if (!newMapping.job_title && (norm === 'jobtitle' || norm === 'title' || norm === 'role' || norm === 'position')) {
        newMapping.job_title = header;
      } else if (!newMapping.linkedin_url && (norm === 'linkedin' || norm === 'linkedinurl' || norm === 'profileurl' || norm === 'linkedinprofile')) {
        newMapping.linkedin_url = header;
      } else if (!newMapping.pain_point && (norm === 'painpoint' || norm === 'painpoints' || norm === 'challenge' || norm === 'problem' || norm === 'bottleneck')) {
        newMapping.pain_point = header;
      } else if (!newMapping.industry && (norm === 'industry' || norm === 'sector' || norm === 'vertical')) {
        newMapping.industry = header;
      } else if (!newMapping.notes && (norm === 'notes' || norm === 'note' || norm === 'comments' || norm === 'description')) {
        newMapping.notes = header;
      }
    });

    setColumnMapping(newMapping);
  };

  // Handle file selection and parsing via real backend endpoint (/api/import/parse)
  const handleFileUpload = async (file: File) => {
    setParseError(null);
    setCommitError(null);
    if (!file) return;

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setIsParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const existingEmails = (existingLeads || []).map(l => l.email).filter(Boolean);

      const response = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileBase64: base64Content,
          existingEmails
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const parsedData = await response.json();
      const detectedHeaders: string[] = Array.isArray(parsedData.rawHeaders) && parsedData.rawHeaders.length > 0
        ? parsedData.rawHeaders
        : Array.isArray(parsedData.detectedHeaderList) && parsedData.detectedHeaderList.length > 0
        ? parsedData.detectedHeaderList
        : Object.keys(parsedData.rawRows?.[0] || {});

      if (!detectedHeaders || detectedHeaders.length === 0) {
        throw new Error('No column headers detected in the file. Please ensure the file has a non-empty header row.');
      }

      setRawHeaders(detectedHeaders);
      setRawRows(parsedData.rawRows || []);
      autoDetectMapping(detectedHeaders, parsedData.headersDetected);
      setStep('mapping');
    } catch (err: any) {
      console.warn('Backend parsing error, checking local fallback:', err);
      // Client-side fallback if server fails
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const buffer = e.target?.result;
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) throw new Error('Spreadsheet contains no visible sheets.');
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
            if (!jsonRows || jsonRows.length === 0) throw new Error('The selected file has no data rows.');
            const headers = Object.keys(jsonRows[0] || {});
            setRawHeaders(headers);
            setRawRows(jsonRows);
            autoDetectMapping(headers);
            setStep('mapping');
          } catch (innerErr: any) {
            setParseError(innerErr.message || 'Failed to parse file.');
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (fallbackErr: any) {
        setParseError(err.message || 'Failed to parse file.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Build candidate records and validate
  const candidates: ImportCandidate[] = React.useMemo(() => {
    if (step !== 'preview') return [];

    const safeExistingLeads = Array.isArray(existingLeads) ? existingLeads : [];
    const existingEmailMap = new Map<string, Lead>();
    safeExistingLeads.forEach(lead => {
      if (lead && lead.email) {
        existingEmailMap.set(lead.email.trim().toLowerCase(), lead);
      }
    });

    const seenInFileEmails = new Set<string>();

    return (rawRows || []).map((row, index) => {
      const id = `cand-${index}`;
      const email = String(columnMapping.email ? row[columnMapping.email] || '' : '').trim();
      const firstName = String(columnMapping.first_name ? row[columnMapping.first_name] || '' : '').trim();
      const lastName = String(columnMapping.last_name ? row[columnMapping.last_name] || '' : '').trim();
      const company = String(columnMapping.company ? row[columnMapping.company] || '' : '').trim();
      const jobTitle = String(columnMapping.job_title ? row[columnMapping.job_title] || '' : '').trim();
      const linkedinUrl = String(columnMapping.linkedin_url ? row[columnMapping.linkedin_url] || '' : '').trim();
      const painPoint = String(columnMapping.pain_point ? row[columnMapping.pain_point] || '' : '').trim();
      const industry = String(columnMapping.industry ? row[columnMapping.industry] || '' : '').trim();
      const notes = String(columnMapping.notes ? row[columnMapping.notes] || '' : '').trim();

      const fullName = (firstName && lastName) 
        ? `${firstName} ${lastName}` 
        : (firstName || lastName || (email ? email.split('@')[0] : 'Lead'));

      // Validation
      let isValid = true;
      let validationError: string | undefined;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        isValid = false;
        validationError = 'Missing email address';
      } else if (!emailRegex.test(email)) {
        isValid = false;
        validationError = 'Malformed email format';
      }

      // Duplicate detection
      const lowerEmail = email.toLowerCase();
      let isDuplicate = false;
      let duplicateReason: string | undefined;

      if (existingEmailMap.has(lowerEmail)) {
        const existing = existingEmailMap.get(lowerEmail)!;
        isDuplicate = true;
        duplicateReason = `Already in Sheet (${existing.leadId}: ${existing.name || existing.company}, Stage ${existing.currentStage})`;
      } else if (seenInFileEmails.has(lowerEmail)) {
        isDuplicate = true;
        duplicateReason = 'Duplicate entry within this uploaded file';
      }

      if (isValid && !isDuplicate) {
        seenInFileEmails.add(lowerEmail);
      }

      return {
        id,
        firstName,
        lastName,
        name: fullName,
        email,
        company: company || 'Not Specified',
        jobTitle,
        linkedinUrl,
        painPoint: painPoint || 'Streamlining outreach & workflow bottlenecks',
        industry,
        notes,
        campaign: campaignName.trim() || 'Default Campaign',
        isValid,
        validationError,
        isDuplicate,
        duplicateReason
      };
    });
  }, [step, rawRows, columnMapping, existingLeads, campaignName]);

  const validToImport = candidates.filter(c => c.isValid && (!skipDuplicates || !c.isDuplicate));
  const skippedDuplicates = candidates.filter(c => c.isValid && c.isDuplicate);
  const invalidRows = candidates.filter(c => !c.isValid);

  const displayedCandidates = React.useMemo(() => {
    switch (previewTab) {
      case 'valid':
        return candidates.filter(c => c.isValid && (!skipDuplicates || !c.isDuplicate));
      case 'duplicates':
        return candidates.filter(c => c.isDuplicate);
      case 'invalid':
        return candidates.filter(c => !c.isValid);
      default:
        return candidates;
    }
  }, [candidates, previewTab, skipDuplicates]);

  // Handle final commit
  const handleConfirmCommit = async () => {
    if (validToImport.length === 0) return;

    // Determine starting numeric ID
    let maxIdNum = 100;
    const safeExistingLeads = Array.isArray(existingLeads) ? existingLeads : [];
    safeExistingLeads.forEach(l => {
      if (l && l.leadId) {
        const match = String(l.leadId).match(/LEAD-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxIdNum) maxIdNum = num;
        }
      }
    });

    const today = getTodayDateString();

    const newLeads: Lead[] = validToImport.map((c, i) => {
      const nextNum = maxIdNum + 1 + i;
      const leadId = `LEAD-${nextNum}`;

      return {
        leadId,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        company: c.company,
        jobTitle: c.jobTitle,
        linkedinUrl: c.linkedinUrl,
        painPoint: c.painPoint,
        industry: c.industry,
        notes: c.notes,
        campaign: c.campaign,
        currentStage: 0, // Starts at Stage 0
        status: 'Active', // Active sequence
        lastEmailSentDate: '',
        nextSendDate: today, // Next send date = today
        threadId: '',
        opensCount: 0,
        clicksCount: 0
      };
    });

    setCommitError(null);
    try {
      await onCommitImport(newLeads, {
        imported: newLeads.length,
        skippedDuplicates: skippedDuplicates.length,
        invalid: invalidRows.length
      });
      onClose();
    } catch (err: any) {
      console.error('Import commit error:', err);
      setCommitError(err.message || 'Failed to save leads to Google Sheet.');
    }
  };

  // Sample CSV generator for convenience
  const downloadSampleCsv = () => {
    const headers = [
      'first_name',
      'last_name',
      'email',
      'company',
      'job_title',
      'linkedin_url',
      'pain_point',
      'industry',
      'notes'
    ];
    const sampleRows = [
      [
        'Claire',
        'Beaufort',
        'claire.b@stratuscloud-sample.com',
        'Stratus Cloud Systems',
        'Director of Engineering',
        'https://linkedin.com/in/clairebeaufort',
        'Kubernetes pod provisioning latency and cloud cost spikes',
        'Cloud Infrastructure',
        'Met at DevOps World; expressed high interest in demo'
      ],
      [
        'David',
        'Kim',
        'david.kim@fintechflow-sample.com',
        'FintechFlow Payments',
        'VP of Risk Operations',
        'https://linkedin.com/in/davidkim-fintech',
        'Manual KYC verification lag during user onboarding spikes',
        'Fintech & Payments',
        'Expanding compliance team this quarter'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'outreach_flow_sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Import Leads</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                  CSV &amp; Excel (.xlsx)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Bulk import prospects with flexible column mapping, deduplication, and immediate Stage 0 enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="bg-slate-50/80 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-6 font-medium">
            <button
              onClick={() => step !== 'upload' && setStep('upload')}
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'upload' ? 'text-red-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'upload' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>1</span>
              <span>Upload File</span>
            </button>
            <span className="text-slate-300">&rarr;</span>
            <button
              onClick={() => rawRows.length > 0 && setStep('mapping')}
              disabled={rawRows.length === 0}
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'mapping' ? 'text-red-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              } ${rawRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'mapping' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>2</span>
              <span>Map Columns</span>
            </button>
            <span className="text-slate-300">&rarr;</span>
            <button
              onClick={() => rawRows.length > 0 && columnMapping.email && setStep('preview')}
              disabled={rawRows.length === 0 || !columnMapping.email}
              className={`flex items-center gap-1.5 transition-colors ${
                step === 'preview' ? 'text-red-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              } ${rawRows.length === 0 || !columnMapping.email ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step === 'preview' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>3</span>
              <span>Validate &amp; Commit</span>
            </button>
          </div>

          <button
            onClick={downloadSampleCsv}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">File Parsing Issue</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {commitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Google Sheet Commit Error</p>
                <p className="mt-0.5">{commitError}</p>
                <p className="mt-1 text-slate-600">
                  Your leads have not been lost. Please review the error above, verify your connection, and click Commit again to retry.
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-200 hover:border-red-500 bg-red-50/20 hover:bg-red-50/40 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div className="w-16 h-16 rounded-2xl bg-white border border-red-200 flex items-center justify-center text-red-600 shadow-sm group-hover:scale-105 transition-transform mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Drag &amp; drop your CSV or Excel file here
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Supports standard <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">.csv</code>, <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">.xlsx</code>, and <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">.xls</code> formats from Apollo, ZoomInfo, Clay, LinkedIn Sales Navigator, or HubSpot.
                </p>
                <button
                  type="button"
                  className="mt-5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Browse Computer Files
                </button>
              </div>

              {/* Supported Columns Guide */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Expected / Recognizable Columns
                  </h5>
                  <span className="text-[11px] text-slate-500">Headers map flexibly in step 2</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {TARGET_FIELDS.map(f => (
                    <div key={f.key} className="p-2 bg-white rounded-lg border border-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{f.label}</span>
                        {f.required && (
                          <span className="text-[10px] text-red-600 font-bold uppercase">(Req)</span>
                        )}
                      </div>
                      <code className="text-[11px] text-slate-500 font-mono block mt-0.5">{f.key}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Uploaded File:</p>
                  <p className="text-sm font-bold text-slate-900">{fileName} ({fileSize})</p>
                  <p className="text-xs text-slate-600 mt-0.5">{rawRows.length} data rows detected with {rawHeaders.length} columns</p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-red-700 hover:text-red-800 hover:underline"
                >
                  Replace File
                </button>
              </div>

              {!columnMapping.email && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Manual Mapping Required for Email Address</p>
                    <p className="mt-0.5 text-amber-800">
                      Auto-mapping could not automatically identify an "Email" column in this file. Please select the matching column from the dropdown below to enable Preview and Import.
                    </p>
                  </div>
                </div>
              )}

              {/* Campaign Tagging */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-red-600" />
                  <label className="text-xs font-bold text-slate-900">Campaign Tag / Batch Grouping</label>
                </div>
                <p className="text-xs text-slate-500">
                  Assign a campaign tag to easily segment and view analytics for this outreach batch.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Q3 Inbound Tech, Enterprise Batch 1"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Q3 Enterprise', 'Cold Inbound', 'Executive Outreach'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCampaignName(tag)}
                        className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-md border border-slate-200 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Match Your File Columns to Lead Attributes
                  </h4>
                  <button
                    type="button"
                    onClick={() => autoDetectMapping(rawHeaders)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-apply Auto Match</span>
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  {TARGET_FIELDS.map((target) => {
                    const selectedValue = columnMapping[target.key];
                    const hasMatch = Boolean(selectedValue);

                    return (
                      <div key={target.key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="sm:w-1/2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{target.label}</span>
                            {target.required ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">Required</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{target.hint}</p>
                        </div>

                        <div className="sm:w-1/2 flex items-center gap-2">
                          <select
                            value={selectedValue}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [target.key]: e.target.value }))}
                            className={`w-full text-xs border rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors ${
                              hasMatch 
                                ? 'border-emerald-300 bg-emerald-50/30 text-slate-800' 
                                : target.required
                                ? 'border-red-300 bg-red-50/20 text-red-900'
                                : 'border-slate-300 bg-white text-slate-600'
                            }`}
                          >
                            <option value="">(Not Mapped / Do Not Import)</option>
                            {rawHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header} (e.g. "{String(rawRows[0]?.[header] || '').substring(0, 25)}")
                              </option>
                            ))}
                          </select>
                          {hasMatch ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : target.required ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-5">
              
              {/* Summary Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div 
                  onClick={() => setPreviewTab('all')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    previewTab === 'all' ? 'border-slate-900 ring-1 ring-slate-900 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Rows</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{candidates.length}</p>
                </div>

                <div 
                  onClick={() => setPreviewTab('valid')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    previewTab === 'valid' ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Ready to Import</span>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{validToImport.length}</p>
                </div>

                <div 
                  onClick={() => setPreviewTab('duplicates')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    previewTab === 'duplicates' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30' : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Duplicate Leads</span>
                  <p className="text-xl font-bold text-amber-700 mt-0.5">{skippedDuplicates.length}</p>
                </div>

                <div 
                  onClick={() => setPreviewTab('invalid')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    previewTab === 'invalid' ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30' : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Invalid Rows</span>
                  <p className="text-xl font-bold text-red-700 mt-0.5">{invalidRows.length}</p>
                </div>
              </div>

              {/* Deduplication & Behavior Settings */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="chk-skip-duplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 border-slate-300 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="chk-skip-duplicates" className="font-bold text-slate-800 cursor-pointer">
                      Skip duplicates against existing leads in the Sheet (Default / Safe)
                    </label>
                    <p className="text-slate-500 mt-0.5">
                      Prevents silently overwriting an in-progress 7-stage sequence for an already active or replied prospect.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Imported leads will be appended with: <strong>Stage 0 (Ready)</strong>, <strong>Status = Active</strong>, <strong>Next Send Date = Today ({getTodayDateString()})</strong>
                  </span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Preview:</span>
                    {(['all', 'valid', 'duplicates', 'invalid'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setPreviewTab(tab)}
                        className={`px-2 py-0.5 rounded-md font-semibold capitalize transition-colors ${
                          previewTab === tab ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab} ({
                          tab === 'all' ? candidates.length :
                          tab === 'valid' ? validToImport.length :
                          tab === 'duplicates' ? skippedDuplicates.length : invalidRows.length
                        })
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-400 text-[11px]">Showing first 100 rows</span>
                </div>

                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">Job Title</th>
                        <th className="py-2.5 px-3">Pain Point</th>
                        <th className="py-2.5 px-3">LinkedIn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedCandidates.slice(0, 100).map((c) => (
                        <tr key={c.id} className={!c.isValid ? 'bg-red-50/40' : c.isDuplicate ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {!c.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800" title={c.validationError}>
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span>{c.validationError}</span>
                              </span>
                            ) : c.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={c.duplicateReason}>
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Duplicate (Skip)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Ready</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{c.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{c.email}</td>
                          <td className="py-2.5 px-3 text-slate-700">{c.company}</td>
                          <td className="py-2.5 px-3 text-slate-500">{c.jobTitle || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate" title={c.painPoint}>
                            {c.painPoint || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[150px] truncate" title={c.linkedinUrl}>
                            {c.linkedinUrl ? (
                              <span className="text-blue-600 font-mono text-[11px]">{c.linkedinUrl}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step === 'mapping' && (
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                &larr; Back to Upload
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                &larr; Back to Mapping
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {step === 'mapping' && (
              <button
                type="button"
                disabled={!columnMapping.email}
                onClick={() => setStep('preview')}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                disabled={validToImport.length === 0 || isImporting}
                onClick={handleConfirmCommit}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs shadow-red-500/20 transition-all"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Appending to Sheets...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Commit &amp; Import {validToImport.length} Leads</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
