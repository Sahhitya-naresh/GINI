import React, { useState, useEffect, useMemo } from 'react';
import { Lead, StageTemplate, CampaignWorkflow } from '../types';
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
  campaigns?: CampaignWorkflow[];
  onBulkAssignCampaign?: (leadIds: string[], campaignId: string) => Promise<void> | void;
  lastCheckedTime?: Date | null;
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
  initialCampaignFilter,
  campaigns = [],
  onBulkAssignCampaign,
  lastCheckedTime
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const lastCheckedText = lastCheckedTime
    ? `Last checked: ${Math.max(0, Math.floor((currentTime - lastCheckedTime.getTime()) / 60000))} min ago`
    : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Lead['status']>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [campaignFilter, setCampaignFilter] = useState<string>(initialCampaignFilter || 'ALL');
  const [engagementFilter, setEngagementFilter] = useState<'ALL' | 'opened' | 'clicked' | 'both' | 'unopened'>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [dueFilter, setDueFilter] = useState<'ALL' | 'due' | 'upcoming'>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'opens' | 'clicks' | 'name' | 'company' | 'nextSendDate'>('default');
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkCampaignId, setBulkCampaignId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false);

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
    campaigns.forEach(c => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set).sort();
  }, [leads, campaigns]);

  // Discover distinct industries
  const availableIndustries = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.industry && l.industry.trim()) set.add(l.industry.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Discover distinct companies
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.company && l.company.trim()) set.add(l.company.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.leadId)));
    }
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleApplyBulkCampaign = async () => {
    if (!onBulkAssignCampaign || selectedLeadIds.size === 0 || !bulkCampaignId) return;
    setIsBulkAssigning(true);
    try {
      await onBulkAssignCampaign(Array.from(selectedLeadIds), bulkCampaignId);
      setSelectedLeadIds(new Set());
      setBulkCampaignId('');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Filtered and deduplicated leads
  const filteredLeads = useMemo(() => {
    const seen = new Set<string>();
    const list = leads.filter((lead, idx) => {
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
          (lead.industry && lead.industry.toLowerCase().includes(query)) ||
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

      // Engagement
      if (engagementFilter === 'opened' && (lead.opensCount || 0) <= 0) return false;
      if (engagementFilter === 'clicked' && (lead.clicksCount || 0) <= 0) return false;
      if (engagementFilter === 'both' && ((lead.opensCount || 0) <= 0 || (lead.clicksCount || 0) <= 0)) return false;
      if (engagementFilter === 'unopened' && (lead.opensCount || 0) > 0) return false;

      // Industry
      if (industryFilter !== 'ALL' && lead.industry !== industryFilter) return false;

      // Company
      if (companyFilter !== 'ALL' && lead.company !== companyFilter) return false;

      // Due Filter
      if (dueFilter === 'due') {
        const isDue = lead.status === 'Active' && isLeadDueForNextSend(lead.nextSendDate);
        if (!isDue) return false;
      }
      if (dueFilter === 'upcoming') {
        const isDue = lead.status === 'Active' && isLeadDueForNextSend(lead.nextSendDate);
        if (isDue || !lead.nextSendDate) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'opens') {
      list.sort((a, b) => (b.opensCount || 0) - (a.opensCount || 0));
    } else if (sortBy === 'clicks') {
      list.sort((a, b) => (b.clicksCount || 0) - (a.clicksCount || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'company') {
      list.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    } else if (sortBy === 'nextSendDate') {
      list.sort((a, b) => {
        if (!a.nextSendDate) return 1;
        if (!b.nextSendDate) return -1;
        return a.nextSendDate.localeCompare(b.nextSendDate);
      });
    }

    return list;
  }, [leads, searchQuery, statusFilter, stageFilter, campaignFilter, engagementFilter, industryFilter, companyFilter, dueFilter, sortBy]);

  const activeAdvancedFilterCount = [
    engagementFilter !== 'ALL',
    industryFilter !== 'ALL',
    companyFilter !== 'ALL',
    dueFilter !== 'ALL',
    sortBy !== 'default'
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setEngagementFilter('ALL');
    setIndustryFilter('ALL');
    setCompanyFilter('ALL');
    setDueFilter('ALL');
    setSortBy('default');
    setStatusFilter('ALL');
    setStageFilter('ALL');
    setCampaignFilter('ALL');
    setSearchQuery('');
  };

  const activeCount = leads.filter(l => l.status === 'Active').length;
  const repliedCount = leads.filter(l => l.status === 'Replied' && l.replySentiment !== 'negative').length;
  const negativeReplyCount = leads.filter(l => l.status === 'Negative Reply' || l.replySentiment === 'negative').length;
  const pausedCount = leads.filter(l => l.status === 'Paused').length;
  const completedCount = leads.filter(l => l.status === 'Completed').length;
  const closedCount = leads.filter(l => l.status === 'Completed' || l.status === 'Broke Up').length;

  const renderStatusBadge = (status: Lead['status'], sentiment?: string) => {
    if (status === 'Negative Reply' || sentiment === 'negative') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 font-bold">Negative Reply</span>;
    }
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
      case 'Replied':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Replied</span>;
      case 'Paused':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Paused</span>;
      case 'Broke Up':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Broke Up</span>;
      case 'Completed':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E3F2FD] text-[#1976D2] border border-[#90CAF9]">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const renderStageBadge = (stage: number) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Stage {stage}
      </span>
    );
  };

  return (
    <div className="space-y-3.5 w-full pb-8">
      
      {/* Metric Stat Strips with Top Color Accent Lines - All 5 tabs aligned in the same single line on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Leads - Blue #1976D2 */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`relative overflow-hidden p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL' 
              ? 'border-[#1976D2] shadow-xs ring-1 ring-[#1976D2]' 
              : 'border-slate-200 hover:border-[#1976D2]'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-[#1976D2]" />
          <span className="text-xs font-medium text-slate-500">Total Leads</span>
          <p className="text-xl font-bold text-[#1976D2] mt-0.5">{leads.length}</p>
        </div>

        {/* Active Sequences - Green */}
        <div 
          onClick={() => setStatusFilter('Active')}
          className={`relative overflow-hidden p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Active' 
              ? 'border-emerald-500 shadow-xs ring-1 ring-emerald-500' 
              : 'border-slate-200 hover:border-emerald-500'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
          <span className="text-xs font-medium text-slate-500">Active Sequences</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-emerald-700">{activeCount}</p>
            {dueCount > 0 && (
              <span className="text-xs font-semibold text-red-600">({dueCount} due)</span>
            )}
          </div>
        </div>

        {/* Replies Detected - Amber */}
        <div 
          onClick={() => setStatusFilter('Replied')}
          className={`relative overflow-hidden p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Replied' 
              ? 'border-amber-500 shadow-xs ring-1 ring-amber-500' 
              : 'border-slate-200 hover:border-amber-500'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <span className="text-xs font-medium text-slate-500">Replies Detected</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-amber-600">{repliedCount}</p>
            {repliedCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700">Needs Reply</span>
            )}
          </div>
        </div>

        {/* Negative Replies - Light Red Accent */}
        <div 
          onClick={() => setStatusFilter('Negative Reply')}
          className={`relative overflow-hidden p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Negative Reply' 
              ? 'border-red-400 shadow-xs ring-1 ring-red-400 bg-red-50/40' 
              : 'border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
          <span className="text-xs font-medium text-slate-500">Negative Replies</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-bold text-red-600">{negativeReplyCount}</p>
            {negativeReplyCount > 0 ? (
              <span className="text-[11px] font-semibold text-red-700 bg-red-100/80 px-1.5 py-0.2 rounded border border-red-200">
                Do Not Contact
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">0</span>
            )}
          </div>
        </div>

        {/* Paused Safety Overrides - Slate */}
        <div 
          onClick={() => setStatusFilter('Paused')}
          className={`relative overflow-hidden p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Paused' 
              ? 'border-slate-500 shadow-xs ring-1 ring-slate-500' 
              : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-slate-400" />
          <span className="text-xs font-medium text-slate-500">Paused Safety Overrides</span>
          <p className="text-xl font-bold text-slate-700 mt-0.5">{pausedCount}</p>
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
            <div className="flex items-center gap-2">
              <button
                id="btn-check-replies"
                onClick={onCheckReplies}
                disabled={isCheckingReplies}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                title="Check for any new replies"
              >
                <MessageSquareReply className={`w-3.5 h-3.5 text-red-600 ${isCheckingReplies ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isCheckingReplies ? 'Checking...' : 'Check Replies'}</span>
              </button>
              {lastCheckedText && (
                <span id="text-last-checked" className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                  {lastCheckedText}
                </span>
              )}
            </div>

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

        {/* Filter Toolbar: Status Pills + Advanced Filters Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 lg:pb-0 shrink-0">
            <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1 shrink-0">Status:</span>
            {(['ALL', 'Active', 'Replied', 'Negative Reply', 'Paused', 'Completed', 'Broke Up'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Advanced Filters Strip */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
            {/* Engagement Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs w-[138px]">
              <Eye className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={engagementFilter}
                onChange={(e) => setEngagementFilter(e.target.value as any)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer w-full truncate"
                title="Filter by recipient engagement"
              >
                <option value="ALL">All Engagement</option>
                <option value="opened">Opened (&gt;0 opens)</option>
                <option value="clicked">Clicked Link (&gt;0 clicks)</option>
                <option value="both">High Intent (Opens + Clicks)</option>
                <option value="unopened">Unopened (0 opens)</option>
              </select>
            </div>

            {/* Company Filter */}
            {availableCompanies.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs w-[138px]">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer w-full truncate"
                  title="Filter by company"
                >
                  <option value="ALL">All Companies</option>
                  {availableCompanies.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Industry Filter */}
            {availableIndustries.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs w-[138px]">
                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer w-full truncate"
                  title="Filter by industry"
                >
                  <option value="ALL">All Industries</option>
                  {availableIndustries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Due / Schedule Filter */}
            <div className="w-[130px]">
              <select
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer w-full truncate"
                title="Filter by next send due status"
              >
                <option value="ALL">All Schedules</option>
                <option value="due">Due Now / Overdue</option>
                <option value="upcoming">Scheduled Ahead</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="w-[138px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer w-full truncate"
                title="Sort leads list"
              >
                <option value="default">Sort: Default</option>
                <option value="opens">Sort: Most Opens</option>
                <option value="clicks">Sort: Most Clicks</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="company">Sort: Company (A-Z)</option>
                <option value="nextSendDate">Sort: Next Send Date</option>
              </select>
            </div>

            {/* Reset All Filters button (slot preserved so elements never jump horizontally) */}
            <div className="w-16 flex items-center justify-start shrink-0">
              <button
                onClick={handleResetFilters}
                className={`flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-opacity cursor-pointer ${
                  (activeAdvancedFilterCount > 0 || statusFilter !== 'ALL' || stageFilter !== 'ALL' || campaignFilter !== 'ALL' || searchQuery.trim())
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                }`}
                title="Reset all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Campaign Assignment Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="font-bold px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">
              {selectedLeadIds.size} Lead{selectedLeadIds.size > 1 ? 's' : ''} Selected
            </span>
            <span className="text-slate-300 font-medium">Assign to Campaign:</span>
            <select
              value={bulkCampaignId}
              onChange={(e) => setBulkCampaignId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-red-500 font-medium text-xs cursor-pointer"
            >
              <option value="">Choose Campaign...</option>
              <option value="__default__">No campaign / Default</option>
              {campaigns.map(c => {
                const isActive = Boolean(c.is_active ?? (c as any).isActive);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({isActive ? 'Active' : 'Inactive'})
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleApplyBulkCampaign}
              disabled={!bulkCampaignId || isBulkAssigning}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isBulkAssigning ? 'Applying...' : 'Apply Campaign'}
            </button>
          </div>
          <button
            onClick={() => setSelectedLeadIds(new Set())}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Main Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-2.5 px-2.5 w-9 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-red-600 focus:ring-red-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                    title="Select / Deselect all visible leads"
                  />
                </th>
                <th className="py-2.5 px-3">Lead</th>
                <th className="py-2.5 px-3">Company &amp; Role</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Current Stage</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Next Send Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span>Engagement</span>
                    <span
                      className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
                      title="Live recipient engagement metrics for email opens and link clicks."
                    >
                      <Info className="w-3 h-3 text-slate-400" />
                    </span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
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
                  const isNegative = lead.status === 'Negative Reply' || lead.replySentiment === 'negative';
                  const isReplied = lead.status === 'Replied' && !isNegative;
                  const isCompleted = lead.status === 'Completed';

                  const assignedCampaign = campaigns.find(w => w.id === lead.campaignId || (lead.campaign && w.name.toLowerCase() === lead.campaign.toLowerCase()));
                  const emailNodes = assignedCampaign ? (assignedCampaign.nodes || (assignedCampaign as any).workflow_graph?.nodes || []).filter((n: any) => n.type === 'emailNode' || n.data?.nodeType === 'email') : [];
                  const maxStages = assignedCampaign && emailNodes.length > 0 ? emailNodes.length : (assignedCampaign ? 0 : 7);
                  const nextStageNum = lead.currentStage + 1;
                  const hasMoreStages = nextStageNum <= maxStages && !isCompleted && !isReplied && !isNegative && lead.status !== 'Broke Up';

                  return (
                    <tr
                      key={lead.leadId || `lead-${lead.email || ''}-${idx}`}
                      className={`transition-colors ${
                        isNegative
                          ? 'bg-red-50/70 hover:bg-red-100/60 border-l-4 border-l-red-500'
                          : isReplied
                          ? 'bg-amber-50/80 hover:bg-amber-100/70'
                          : isCompleted
                          ? 'hover:bg-[#E3F2FD]'
                          : 'hover:bg-emerald-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.leadId)}
                          onChange={() => handleToggleSelectLead(lead.leadId)}
                          className="rounded text-red-600 focus:ring-red-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      {/* Lead Name & Email & LinkedIn */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className="truncate">{lead.name}</span>
                          <span className="text-[10px] font-mono font-normal text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {lead.leadId}
                          </span>
                          {lead.linkedinUrl && (
                            <a
                              href={lead.linkedinUrl.startsWith('http') ? lead.linkedinUrl : `https://${lead.linkedinUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50 shrink-0"
                              title={`LinkedIn Profile: ${lead.linkedinUrl}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        {lead.campaign && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[180px]">
                              {lead.campaign}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Company & Role & Pain Point */}
                      <td className="py-2.5 px-3 max-w-[170px]">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.company}</span>
                        </div>
                        {lead.jobTitle && (
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
                            {lead.jobTitle}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 italic truncate mt-0.5" title={lead.painPoint}>
                          "{lead.painPoint || '—'}"
                        </div>
                      </td>

                      {/* Current Stage */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderStageBadge(lead.currentStage)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderStatusBadge(lead.status, lead.replySentiment)}
                      </td>

                      {/* Next Send Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
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
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
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

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
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
                          {hasMoreStages && (
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
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Replied ({repliedCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Paused ({pausedCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1976D2]" /> Completed ({completedCount})
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

export const LeadsPage = LeadsTable;
