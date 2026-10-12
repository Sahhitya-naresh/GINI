import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Database,
  RefreshCw, 
  Settings as SettingsIcon, 
  FileEdit, 
  Users, 
  MessageSquareReply, 
  ExternalLink,
  LogOut,
  Play,
  TrendingUp,
  UploadCloud,
  AlertTriangle,
  X,
  CheckCircle2,
  Key,
  Menu,
  ChevronDown,
  Layers,
  CheckSquare
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AppUser } from '../types';

interface HeaderProps {
  currentUser?: AppUser | null;
  onLogout?: () => void;
  userEmail?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  dueCount: number;
  repliedCount: number;
  tasksCount?: number;
  currentTab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'users' | 'settings';
  onTabChange: (tab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'users' | 'settings') => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenScheduler: () => void;
  onOpenConnectSheet?: () => void;
  onOpenImportLeads?: () => void;
  customLogoUrl?: string;
  onLogoChange?: (url: string) => void;
  user?: any;
  token?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  isSigningIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  userEmail,
  dueCount,
  repliedCount,
  tasksCount = 0,
  currentTab,
  onTabChange,
  onSync,
  isSyncing,
  onOpenScheduler,
  customLogoUrl,
  onLogoChange
}) => {

  const [mongoStatus, setMongoStatus] = useState<{
    connected: boolean;
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
    database?: string;
    source?: string;
    error?: string;
    diagnostics?: any;
  }>({ connected: false, status: 'connecting', database: 'outreach_flow' });


  // Right-side Navigation Menu Dropdown state
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsNavMenuOpen(false);
    }
    if (isNavMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNavMenuOpen]);

  const currentTabLabel = useMemo(() => {
    switch (currentTab) {
      case 'leads': return 'All Leads';
      case 'replied': return `Needs Reply${repliedCount > 0 ? ` (${repliedCount})` : ''}`;
      case 'workflows': return 'Workflow Canvas';
      case 'tasks': return `Tasks${tasksCount > 0 ? ` (${tasksCount})` : ''}`;
      case 'templates': return 'Templates';
      case 'analytics': return 'Analytics';
      case 'users': return 'Users';
      case 'settings': return 'Settings';
      default: return 'Menu';
    }
  }, [currentTab, repliedCount, tasksCount]);

  const checkMongo = async () => {
    try {
      const res = await fetch('/api/mongodb/status');
      if (res.ok) {
        const data = await res.json();
        setMongoStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    checkMongo();
    const interval = setInterval(() => {
      if (mounted) checkMongo();
    }, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);


  return (
    <header className="bg-white border-b border-red-100 sticky top-0 z-30 shadow-xs">
      <div className="w-full px-3 sm:px-5">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center">
            <BrandLogo 
              customLogoUrl={customLogoUrl} 
              onLogoChange={onLogoChange}
              allowUploadDirectly={true}
            />
          </div>

          {/* Right actions: Run Scheduler, Sheet Status, Sync & Navigation Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Run Due Sends Button in Crisp Red */}
            <button
              id="btn-run-due-scheduler"
              onClick={onOpenScheduler}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs shadow-red-500/20 transition-all cursor-pointer"
              title="Check replies and send due emails"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden md:inline">Run Due Campaigns</span>
              <span className="md:hidden">Run</span>
              {dueCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold bg-white text-red-700 rounded-full">
                  {dueCount}
                </span>
              )}
            </button>

            {/* Discreet Storage Connection Status Indicator (Read-only status badge) */}
            <div 
              id="connection-status-indicator"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all shrink-0 select-none ${
                mongoStatus.connected 
                  ? 'bg-slate-50 border border-slate-200/90 text-slate-700' 
                  : 'bg-amber-50 border border-amber-300 text-amber-900'
              }`}
              title={`Storage: MongoDB (${mongoStatus.database || 'outreach_flow'}) — ${mongoStatus.connected ? 'Connected' : 'Disconnected'}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${mongoStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700 hidden sm:inline">Storage Connected</span>
              <span className="font-semibold text-slate-700 sm:hidden">Connected</span>
            </div>

            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-slate-200 hover:border-red-200 shrink-0"
              title="Refresh / Sync"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
            </button>

            {/* Navigation Menu Dropdown Button (Constant width so UI never shifts when changing tabs) */}
            <div className="relative shrink-0" ref={navMenuRef}>
              <button
                id="btn-nav-menu"
                type="button"
                onClick={() => setIsNavMenuOpen(prev => !prev)}
                className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border shadow-xs cursor-pointer w-[215px] sm:w-[230px] shrink-0 ${
                  isNavMenuOpen
                    ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-500/20 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-red-300'
                }`}
                title="Navigation Menu — Click to switch between All Leads, Needs Reply, Workflows, Tasks, Templates, Analytics, and Settings"
                aria-expanded={isNavMenuOpen}
              >
                {/* Visual Menu Pill Badge */}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shrink-0 shadow-2xs">
                  <Menu className="w-3 h-3 text-white stroke-[2.5]" />
                  <span>Menu</span>
                </span>

                {/* Active View Label (Constant container width to prevent header shift) */}
                <div className="flex-1 min-w-0 text-left px-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 group-hover:text-red-600 transition-colors truncate text-xs sm:text-[13px]">
                    {currentTabLabel}
                  </span>
                  {(repliedCount > 0 || tasksCount > 0) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shrink-0"></span>
                  )}
                </div>

                {/* Prominent Dropdown Arrow Box */}
                <div className="pl-1 border-l border-slate-200 group-hover:border-red-200 transition-colors shrink-0">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    isNavMenuOpen 
                      ? 'bg-red-600 text-white' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-red-100 group-hover:text-red-700'
                  }`}>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isNavMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Dropdown Menu Panel */}
              {isNavMenuOpen && (
                <div 
                  id="nav-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                >
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation Views</span>
                    <span className="text-[10px] text-red-600 font-semibold">Giniiris outreach</span>
                  </div>

                  <div className="p-1.5 space-y-1">
                    {/* Item 1: All Leads */}
                    <button
                      id="menu-tab-leads"
                      type="button"
                      onClick={() => { onTabChange('leads'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'leads'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'leads' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">All Leads</p>
                          <p className="text-[10px] text-slate-400 font-normal">Database & prospect sequences</p>
                        </div>
                      </div>
                      {currentTab === 'leads' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </button>

                    {/* Item 2: Needs Reply */}
                    <button
                      id="menu-tab-replied"
                      type="button"
                      onClick={() => { onTabChange('replied'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'replied'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'replied' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                          <MessageSquareReply className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Needs Reply</p>
                          <p className="text-[10px] text-slate-400 font-normal">Prospect responses</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {repliedCount > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 rounded-full animate-pulse shadow-xs">
                            {repliedCount}
                          </span>
                        )}
                        {currentTab === 'replied' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </div>
                    </button>

                    {/* Item 3: Workflow Canvas */}
                    <button
                      id="menu-tab-workflows"
                      type="button"
                      onClick={() => { onTabChange('workflows'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'workflows'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'workflows' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Workflow Canvas</p>
                          <p className="text-[10px] text-slate-400 font-normal">Visual node sequence builder</p>
                        </div>
                      </div>
                      {currentTab === 'workflows' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </button>

                    {/* Item 4: Tasks */}
                    <button
                      id="menu-tab-tasks"
                      type="button"
                      onClick={() => { onTabChange('tasks'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'tasks'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'tasks' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Tasks</p>
                          <p className="text-[10px] text-slate-400 font-normal">Manual call & outreach tasks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tasksCount > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full shadow-xs">
                            {tasksCount}
                          </span>
                        )}
                        {currentTab === 'tasks' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </div>
                    </button>

                    {/* Item 5: Templates */}
                    <button
                      id="menu-tab-templates"
                      type="button"
                      onClick={() => { onTabChange('templates'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'templates'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'templates' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <FileEdit className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Templates</p>
                          <p className="text-[10px] text-slate-400 font-normal">Email copy & stages (1-7)</p>
                        </div>
                      </div>
                      {currentTab === 'templates' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </button>

                    {/* Item 6: Analytics */}
                    <button
                      id="menu-tab-analytics"
                      type="button"
                      onClick={() => { onTabChange('analytics'); setIsNavMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        currentTab === 'analytics'
                          ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${currentTab === 'analytics' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Analytics</p>
                          <p className="text-[10px] text-slate-400 font-normal">Opens, clicks & metrics</p>
                        </div>
                      </div>
                      {currentTab === 'analytics' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </button>

                    {/* Item 7: Users & Access (Protected by users.manage permission) */}
                    {currentUser?.permissions?.includes('users.manage') && (
                      <button
                        id="menu-tab-users"
                        type="button"
                        onClick={() => { onTabChange('users'); setIsNavMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          currentTab === 'users'
                            ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${currentTab === 'users' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold leading-tight">Users & Access</p>
                            <p className="text-[10px] text-slate-400 font-normal">Team roles & permissions</p>
                          </div>
                        </div>
                        {currentTab === 'users' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </button>
                    )}

                    {/* Item 8: Settings (Protected by settings.edit permission) */}
                    {currentUser?.permissions?.includes('settings.edit') && (
                      <button
                        id="menu-tab-settings"
                        type="button"
                        onClick={() => { onTabChange('settings'); setIsNavMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          currentTab === 'settings'
                            ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${currentTab === 'settings' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <SettingsIcon className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold leading-tight">Settings</p>
                            <p className="text-[10px] text-slate-400 font-normal">Configuration & defaults</p>
                          </div>
                        </div>
                        {currentTab === 'settings' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout in Header Bar */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-200 shrink-0">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                    {currentUser.email}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-red-100 text-red-700 border border-red-200/80'
                    : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}>
                  {currentUser.role}
                </span>
                <button
                  id="btn-header-logout"
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200 cursor-pointer shadow-2xs shrink-0"
                  title={`Log out of ${currentUser.email}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



    </header>
  );
};
