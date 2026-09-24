import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Database,
  FileSpreadsheet, 
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
  Key
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  user: User | null;
  token?: string | null;
  userEmail: string;
  spreadsheetId: string;
  spreadsheetName: string;
  dueCount: number;
  repliedCount: number;
  tasksCount?: number;
  currentTab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'settings';
  onTabChange: (tab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics' | 'settings') => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenScheduler: () => void;
  onOpenConnectSheet: () => void;
  onOpenImportLeads?: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isSigningIn: boolean;
  customLogoUrl?: string;
  onLogoChange?: (url: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  token,
  userEmail,
  spreadsheetId,
  spreadsheetName,
  dueCount,
  repliedCount,
  tasksCount = 0,
  currentTab,
  onTabChange,
  onSync,
  isSyncing,
  onOpenScheduler,
  onOpenConnectSheet,
  onOpenImportLeads,
  onSignIn,
  onSignOut,
  isSigningIn,
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

  const [showMongoModal, setShowMongoModal] = useState(false);
  const [mongoUriInput, setMongoUriInput] = useState('mongodb+srv://sahhityanaresh_db_user:test12345678@cluster0.zebcge8.mongodb.net/?appName=Cluster0');
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [mongoFeedback, setMongoFeedback] = useState<{ success?: boolean; message: string; code?: any } | null>(null);

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

  const handleTestAndConnect = async () => {
    if (!mongoUriInput.trim()) return;
    setIsTestingMongo(true);
    setMongoFeedback(null);
    try {
      const res = await fetch('/api/mongodb/update-uri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUriInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMongoStatus(data.status || { connected: true, status: 'connected', database: data.database });
        setMongoFeedback({
          success: true,
          message: `Successfully connected to MongoDB database "${data.database || 'outreach_flow'}"!`
        });
      } else {
        setMongoFeedback({
          success: false,
          message: data.error || 'Connection failed',
          code: data.code
        });
        if (data.status) {
          setMongoStatus(data.status);
        }
      }
    } catch (e: any) {
      setMongoFeedback({ success: false, message: e.message || 'Network request error' });
    } finally {
      setIsTestingMongo(false);
    }
  };
  return (
    <header className="bg-white border-b border-red-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center">
            <BrandLogo 
              customLogoUrl={customLogoUrl} 
              onLogoChange={onLogoChange}
              allowUploadDirectly={true}
            />
          </div>

          {/* Navigation Tabs in Red & White */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
            <button
              id="tab-leads"
              onClick={() => onTabChange('leads')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
                currentTab === 'leads'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <Users className={`w-4 h-4 ${currentTab === 'leads' ? 'text-white' : 'text-slate-500'}`} />
              <span>All Leads</span>
            </button>

            <button
              id="tab-replied"
              onClick={() => onTabChange('replied')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative shrink-0 ${
                currentTab === 'replied'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <MessageSquareReply className={`w-4 h-4 ${currentTab === 'replied' ? 'text-white' : 'text-red-600'}`} />
              <span className="hidden sm:inline">Needs Reply</span>
              <span className="sm:hidden">Replies</span>
              {repliedCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold leading-none text-red-700 bg-white rounded-full animate-pulse shadow-xs">
                  {repliedCount}
                </span>
              )}
            </button>

            <button
              id="tab-workflows"
              onClick={() => onTabChange('workflows')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
                currentTab === 'workflows'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <span className="font-bold text-xs px-1 py-0.2 rounded bg-red-100 text-red-800">Flow</span>
              <span>Workflow Canvas</span>
            </button>

            <button
              id="tab-tasks"
              onClick={() => onTabChange('tasks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative shrink-0 ${
                currentTab === 'tasks'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <span>Tasks</span>
              {tasksCount > 0 && (
                <span className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  currentTab === 'tasks' ? 'bg-white text-red-700' : 'bg-blue-600 text-white'
                }`}>
                  {tasksCount}
                </span>
              )}
            </button>

            <button
              id="tab-templates"
              onClick={() => onTabChange('templates')}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
                currentTab === 'templates'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <FileEdit className={`w-4 h-4 ${currentTab === 'templates' ? 'text-white' : 'text-slate-500'}`} />
              <span>Templates</span>
            </button>

            <button
              id="tab-analytics"
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 ${
                currentTab === 'analytics'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${currentTab === 'analytics' ? 'text-white' : 'text-slate-500'}`} />
              <span>Analytics</span>
            </button>

            <button
              id="tab-settings"
              onClick={() => onTabChange('settings')}
              className={`p-1.5 rounded-lg transition-all shrink-0 ${
                currentTab === 'settings' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-red-700 hover:bg-red-50/60'
              }`}
              title="Campaign Settings & Logo"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </nav>

          {/* Right actions: Run Scheduler, Sheet Status, User Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Run Due Sends Button in Crisp Red */}
            <button
              id="btn-run-due-scheduler"
              onClick={onOpenScheduler}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs shadow-red-500/20 transition-all"
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

            {/* Persistent, clickable MongoDB connection status indicator */}
            <button 
              id="connection-status-indicator"
              onClick={() => setShowMongoModal(true)}
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-all shrink-0 cursor-pointer ${
                mongoStatus.connected 
                  ? 'bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 hover:bg-emerald-100/90' 
                  : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
              title="Click to view MongoDB connection details or test credentials"
            >
              {mongoStatus.connected ? (
                <>
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950 hidden sm:inline">MongoDB:</span>
                  <span className="sm:hidden font-semibold text-emerald-950">DB:</span>
                  <span className="max-w-[100px] sm:max-w-[150px] truncate font-semibold text-emerald-900">
                    {mongoStatus.database || 'outreach_flow'}
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline font-medium">MongoDB: Disconnected</span>
                  <span className="sm:hidden font-medium">DB Offline</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-0.5" />
                </>
              )}
            </button>

            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Sync with Google Sheet"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-red-600' : ''}`} />
            </button>

            {/* User Profile / Google Sign-In */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div 
                  className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden ring-1 ring-slate-200"
                  title={userEmail || user.displayName || 'Google Account'}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    (user.displayName || userEmail || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MongoDB Atlas Connection Modal */}
      {showMongoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${mongoStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">MongoDB Atlas Connection</h3>
                  <p className="text-xs text-slate-500">Persistent database storage for leads, campaigns & workflows</p>
                </div>
              </div>
              <button
                onClick={() => setShowMongoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Card */}
            <div className="mt-4">
              {mongoStatus.connected ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-emerald-900">Connected to MongoDB Atlas</div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Database: <span className="font-semibold">{mongoStatus.database || 'outreach_flow'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-amber-900">Authentication Failed (Error Code 8000)</div>
                    <div className="text-xs text-amber-800 mt-1 leading-relaxed">
                      MongoDB Atlas reached at <span className="font-semibold">cluster0.zebcge8.mongodb.net</span>, but rejected the credentials with <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-mono">bad auth : authentication failed</code>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Connection URI Form */}
            <div className="mt-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>MongoDB Connection String:</span>
                <span className="text-[11px] text-slate-400 font-normal">SRV format</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={mongoUriInput}
                  onChange={(e) => setMongoUriInput(e.target.value)}
                  placeholder="mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster0"
                  className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all pr-10"
                />
                <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Feedback Message */}
            {mongoFeedback && (
              <div className={`mt-3 p-3 rounded-lg text-xs leading-relaxed ${
                mongoFeedback.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {mongoFeedback.message}
                {mongoFeedback.code && <span className="font-mono ml-1 text-[11px]">({mongoFeedback.code})</span>}
              </div>
            )}

            {/* Atlas Checklist Guide */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-semibold text-slate-800">Atlas Troubleshooting Checklist:</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-700">Database User vs Project Account:</strong> Must be created in Atlas under <span className="font-medium">Security → Database Access</span> (username: <code className="bg-slate-200 px-1 rounded">sahhityanaresh_db_user</code>).
                </li>
                <li>
                  <strong className="text-slate-700">Password Update:</strong> In Database Access, click <em>Edit</em> on the user, reset the password to <code className="bg-slate-200 px-1 rounded">outreachconnect</code>, and click <strong className="text-slate-900">Update User</strong>. Wait ~30s for the banner to finish deploying.
                </li>
                <li>
                  <strong className="text-slate-700">Network Access:</strong> Ensure IP <code className="bg-slate-200 px-1 rounded">0.0.0.0/0</code> (Allow Access from Anywhere) is added under <span className="font-medium">Security → Network Access</span>.
                </li>
              </ul>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMongoModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTestAndConnect}
                disabled={isTestingMongo || !mongoUriInput.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isTestingMongo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Test & Save Connection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
