import React, { useState, useMemo } from 'react';
import { Lead, StageTemplate } from '../types';
import { formatDisplayDate, isLeadDueForNextSend, getTodayDateString } from '../utils/dateUtils';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Play, 
  Pause, 
  Send, 
  Eye, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Mail, 
  AlertCircle,
  ExternalLink,
  MessageSquareReply,
  RotateCcw,
  Sparkles,
  UploadCloud,
  MousePointer,
  FolderOpen,
  Trash2,
  Info
} from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  templates: StageTemplate[];
  onSelectLead: (lead: Lead) => void;
  onTogglePause: (lead: Lead) => void;
  onSendNextStage: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
  onOpenAddLead: () => void;
  onOpenImportLeads: () => void;
  onCheckReplies: () => void;
  isCheckingReplies: boolean;
  onOpenScheduler: () => void;
  dueCount: number;
  initialCampaignFilter?: string;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  templates,
  onSelectLead,
  onTogglePause,
  onSendNextStage,
  onDeleteLead,
  onOpenAddLead,
  onOpenImportLeads,
  onCheckReplies,
  isCheckingReplies,
  onOpenScheduler,
  dueCount,
  initialCampaignFilter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Lead['status']>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [campaignFilter, setCampaignFilter] = useState<string>(initialCampaignFilter || 'ALL');
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Update campaignFilter when initialCampaignFilter prop changes
  React.useEffect(() => {
    if (initialCampaignFilter !== undefined) {
      setCampaignFilter(initialCampaignFilter);
    }
  }, [initialCampaignFilter]);

  // Discover campaigns
  const availableCampaigns = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.campaign) set.add(l.campaign);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered and deduplicated leads
  const filteredLeads = useMemo(() => {
    const seen = new Set<string>();
    return leads.filter((lead, idx) => {
      const uniqueKey = lead.leadId?.trim() || lead.email?.trim().toLowerCase() || `lead-${idx}`;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery = 
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query) ||
          lead.painPoint.toLowerCase().includes(query) ||
          lead.leadId.toLowerCase().includes(query) ||
          (lead.jobTitle && lead.jobTitle.toLowerCase().includes(query)) ||
          (lead.campaign && lead.campaign.toLowerCase().includes(query)) ||
          lead.notes.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      // Stage
      if (stageFilter !== 'ALL' && String(lead.currentStage) !== stageFilter) {
        return false;
      }

      // Campaign
      if (campaignFilter !== 'ALL' && (lead.campaign || 'Default') !== campaignFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, stageFilter, campaignFilter]);

  const activeCount = leads.filter(l => l.status === 'Active').length;
  const repliedCount = leads.filter(l => l.status === 'Replied').length;
  const pausedCount = leads.filter(l => l.status === 'Paused').length;
  const closedCount = leads.filter(l => l.status === 'Completed' || l.status === 'Broke Up').length;

  const renderStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case 'Replied':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 animate-pulse">Replied</span>;
      case 'Paused':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Paused</span>;
      case 'Broke Up':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Broke Up</span>;
      case 'Completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const renderStageBadge = (stage: number) => {
    if (stage === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Stage 0: Ready
        </span>
      );
    }
    const template = templates.find(t => t.stage === stage);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200/80">
        Stage {stage}: {template?.name || `Stage ${stage}`}
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Metric Stat Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL' ? 'border-red-500 shadow-xs ring-1 ring-red-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Total Leads</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{leads.length}</p>
        </div>

        <div 
          onClick={() => setStatusFilter('Active')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Active' ? 'border-red-500 shadow-xs ring-1 ring-red-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Active Sequences</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
            {dueCount > 0 && (
              <span className="text-xs font-semibold text-red-600">({dueCount} due)</span>
            )}
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('Replied')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Replied' ? 'border-red-500 shadow-xs ring-1 ring-red-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Replies Detected</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-red-700">{repliedCount}</p>
            {repliedCount > 0 && (
              <span className="text-[11px] font-semibold text-red-600">Needs Reply</span>
            )}
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('Paused')}
          className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Paused' ? 'border-amber-500 shadow-xs ring-1 ring-amber-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">Paused Safety Overrides</span>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{pausedCount}</p>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="bg-white rounded-xl border border-red-100 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, company, email, or pain point..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
            />
          </div>

          {/* Quick Filters & Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Campaign filter dropdown */}
            {availableCampaigns.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="ALL">All Campaigns</option>
                  {availableCampaigns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage filter dropdown */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-red-500"
            >
              <option value="ALL">All Stages (0-7)</option>
              <option value="0">Stage 0: Ready</option>
              <option value="1">Stage 1: Introduction</option>
              <option value="2">Stage 2: Value Proposition</option>
              <option value="3">Stage 3: Proof</option>
              <option value="4">Stage 4: Solution</option>
              <option value="5">Stage 5: Pricing</option>
              <option value="6">Stage 6: Follow-up</option>
              <option value="7">Stage 7: Break-up</option>
            </select>

            {/* Check Replies button */}
            <button
              onClick={onCheckReplies}
              disabled={isCheckingReplies}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
              title="Check for any new replies"
            >
              <MessageSquareReply className={`w-3.5 h-3.5 text-red-600 ${isCheckingReplies ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isCheckingReplies ? 'Checking...' : 'Check Replies'}</span>
            </button>

            {/* Import Leads button */}
            <button
              id="btn-import-leads"
              onClick={onOpenImportLeads}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shadow-2xs"
              title="Import leads from CSV or Excel (.xlsx)"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Leads</span>
            </button>

            {/* Add Lead button */}
            <button
              onClick={onOpenAddLead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-xs shadow-red-500/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          </div>

        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">Status:</span>
          {(['ALL', 'Active', 'Replied', 'Paused', 'Completed', 'Broke Up'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-red-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              {st === 'ALL' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Lead</th>
                <th className="py-3 px-4">Company &amp; Role</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Next Send Date</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <span>Engagement</span>
                    <span
                      className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
                      title="Tracking requires a public deployment to receive external opens/clicks (sandbox requires auth/cookie check)."
                    >
                      <Info className="w-3 h-3 text-slate-400" />
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4">Thread ID</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-600">No leads found</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing your search keywords or status filter</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => {
                  const isDue = lead.status === 'Active' && isLeadDueForNextSend(lead.nextSendDate);
                  const isReplied = lead.status === 'Replied';
                  const nextStageNum = lead.currentStage + 1;

                  return (
                    <tr
                      key={lead.leadId || `lead-${lead.email || ''}-${idx}`}
                      className={`hover:bg-red-50/30 transition-colors ${
                        isReplied ? 'bg-red-50/40' : isDue ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Lead Name & Email & LinkedIn */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{lead.name}</span>
                          <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {lead.leadId}
                          </span>
                          {lead.linkedinUrl && (
                            <a
                              href={lead.linkedinUrl.startsWith('http') ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50"
                              title={`LinkedIn Profile: ${lead.linkedinUrl}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{lead.email}</span>
                        </div>
                        {lead.campaign && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {lead.campaign}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Company & Role & Pain Point */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.company}</span>
                        </div>
                        {lead.jobTitle && (
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            {lead.jobTitle}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 italic truncate mt-0.5" title={lead.painPoint}>
                          "{lead.painPoint || '—'}"
                        </div>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3.5 px-4">
                        {renderStageBadge(lead.currentStage)}
                        {lead.currentNodeId && (
                          <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span className="truncate max-w-[100px]" title={`Current Workflow Node: ${lead.currentNodeId}`}>
                              {lead.currentNodeId}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(lead.status)}
                      </td>

                      {/* Next Send Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${isDue ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                            {formatDisplayDate(lead.nextSendDate)}
                          </span>
                          {isDue && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-red-600 text-white rounded shadow-2xs">
                              DUE
                            </span>
                          )}
                        </div>
                        {lead.lastEmailSentDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Last: {formatDisplayDate(lead.lastEmailSentDate)}
                          </div>
                        )}
                      </td>

                      {/* Engagement: Opens & Clicks */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div 
                            className={`flex items-center gap-1 text-[11px] font-medium ${
                              (lead.opensCount || 0) > 0 ? 'text-blue-700' : 'text-slate-400'
                            }`}
                            title={lead.lastOpenedDate ? `Last opened: ${formatDisplayDate(lead.lastOpenedDate)}` : 'No opens yet'}
                          >
                            <Eye className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{lead.opensCount || 0} open{(lead.opensCount || 0) === 1 ? '' : 's'}</span>
                          </div>
                          <div 
                            className={`flex items-center gap-1 text-[11px] font-medium ${
                              (lead.clicksCount || 0) > 0 ? 'text-purple-700 font-bold' : 'text-slate-400'
                            }`}
                            title={lead.lastClickedDate ? `Last clicked: ${formatDisplayDate(lead.lastClickedDate)}` : 'No clicks yet'}
                          >
                            <MousePointer className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>{lead.clicksCount || 0} click{(lead.clicksCount || 0) === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Thread ID */}
                      <td className="py-3.5 px-4">
                        {lead.threadId ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] text-slate-600 truncate max-w-[90px]" title={lead.threadId}>
                              {lead.threadId}
                            </span>
                            <a
                              href={`https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(lead.threadId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-red-600 p-0.5"
                              title="Open in Outlook"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Pause / Resume Button */}
                          <button
                            onClick={() => onTogglePause(lead)}
                            className={`p-1.5 rounded-md transition-colors ${
                              lead.status === 'Paused'
                                ? 'text-amber-700 hover:bg-amber-100 bg-amber-50'
                                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                            title={lead.status === 'Paused' ? 'Resume sequence' : 'Pause sequence'}
                          >
                            {lead.status === 'Paused' ? (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          {/* Trigger Next Stage Send Button */}
                          {nextStageNum <= 7 && lead.status !== 'Replied' && lead.status !== 'Broke Up' && (
                            <button
                              onClick={() => onSendNextStage(lead)}
                              disabled={lead.status === 'Paused'}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:opacity-40 transition-colors"
                              title={`Send Stage ${nextStageNum} email now`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Detail & Thread */}
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                            title="View lead thread and history"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>

                          {/* Delete Lead Button */}
                          {onDeleteLead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeadToDelete(lead);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Delete lead from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> leads
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active ({activeCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Replied ({repliedCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Paused ({pausedCount})
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Non-blocking for iframes) */}
      {leadToDelete && onDeleteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Lead</h3>
                <p className="text-xs text-slate-500">Remove from campaign and database</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete lead <strong>"{leadToDelete.name}"</strong> ({leadToDelete.email})?
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLead(leadToDelete);
                  setLeadToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
