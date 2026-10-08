import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  MessageSquareReply, 
  Clock, 
  Activity, 
  StickyNote, 
  Plus, 
  Trash2, 
  Check, 
  ExternalLink, 
  ChevronRight,
  Send,
  UserPlus,
  RefreshCw,
  FolderPlus,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Move,
  RotateCcw,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { Lead, TaskAlertItem } from '../types';

export interface AppActionLog {
  id: string;
  type: 'lead_add' | 'lead_import' | 'email_send' | 'reply_check' | 'pause_toggle' | 'workflow' | 'template' | 'general';
  title: string;
  description: string;
  timestamp: string;
}

export interface UserNote {
  id: string;
  text: string;
  isDone: boolean;
  createdAt: string;
}

interface NotificationHubProps {
  replyAlerts: Lead[];
  taskAlerts?: TaskAlertItem[];
  leads?: Lead[];
  onDismissReplyAlert: (leadId: string) => void;
  onDismissTaskAlert?: (alertId: string) => void;
  onClearAllReplyAlerts: () => void;
  onClearAllTaskAlerts?: () => void;
  onClearAllAlerts?: () => void;
  onOpenLead: (lead: Lead) => void;
  onNavigateToTab: (tab: 'leads' | 'replied' | 'workflows' | 'tasks' | 'templates' | 'analytics') => void;
  actionLogs: AppActionLog[];
  onClearActionLogs: () => void;
}

interface HubPosition {
  x: number;
  y: number;
}

const NOTES_STORAGE_KEY = 'gini_workspace_notes';
const HUB_POS_STORAGE_KEY = 'gini_activity_hub_pos';

export const NotificationHub: React.FC<NotificationHubProps> = ({
  replyAlerts,
  taskAlerts = [],
  leads = [],
  onDismissReplyAlert,
  onDismissTaskAlert,
  onClearAllReplyAlerts,
  onClearAllTaskAlerts,
  onClearAllAlerts,
  onOpenLead,
  onNavigateToTab,
  actionLogs,
  onClearActionLogs
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'actions' | 'notes'>('alerts');
  const [notes, setNotes] = useState<UserNote[]>(() => {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newNoteText, setNewNoteText] = useState('');
  const hubRef = useRef<HTMLDivElement | null>(null);

  // Position state for drag & drop
  const [position, setPosition] = useState<HubPosition | null>(() => {
    try {
      const saved = localStorage.getItem(HUB_POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);

  // Handle drag pointer events
  const startDrag = (clientX: number, clientY: number, target: HTMLElement, pointerId?: number) => {
    const rect = hubRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (position?.x ?? (window.innerWidth - 180));
    const currentY = rect ? rect.top : (position?.y ?? (window.innerHeight - 70));

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
      hasMoved: false
    };

    if (pointerId !== undefined && target.setPointerCapture) {
      try {
        target.setPointerCapture(pointerId);
      } catch {}
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button:not(#btn-notification-hub)')) return;
    startDrag(e.clientX, e.clientY, e.currentTarget, e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (!dragStartRef.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      dragStartRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragStartRef.current.hasMoved) {
      const rawX = dragStartRef.current.initialX + dx;
      const rawY = dragStartRef.current.initialY + dy;
      const maxX = Math.max(16, window.innerWidth - 170);
      const maxY = Math.max(16, window.innerHeight - 65);
      const newPos = {
        x: Math.min(maxX, Math.max(16, rawX)),
        y: Math.min(maxY, Math.max(16, rawY))
      };
      setPosition(newPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasDrag = dragStartRef.current.hasMoved;
    dragStartRef.current = null;
    setIsDragging(false);

    if (wasDrag) {
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 120);

      setPosition(currentPos => {
        if (currentPos) {
          try {
            localStorage.setItem(HUB_POS_STORAGE_KEY, JSON.stringify(currentPos));
          } catch {}
        }
        return currentPos;
      });
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(HUB_POS_STORAGE_KEY);
    } catch {}
    setPosition(null);
  };

  // Adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return null;
        const maxX = Math.max(16, window.innerWidth - 170);
        const maxY = Math.max(16, window.innerHeight - 65);
        return {
          x: Math.min(maxX, Math.max(16, prev.x)),
          y: Math.min(maxY, Math.max(16, prev.y))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save user notes:', e);
    }
  }, [notes]);

  // Click outside to close drawer
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote: UserNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: newNoteText.trim(),
      isDone: false,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotes(prev => [newNote, ...prev]);
    setNewNoteText('');
  };

  const handleToggleNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isDone: !n.isDone } : n));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const unreadAlertsCount = replyAlerts.length + taskAlerts.length;

  const getActionIcon = (type: AppActionLog['type']) => {
    switch (type) {
      case 'lead_add':
      case 'lead_import':
        return <UserPlus className="w-3.5 h-3.5 text-blue-600" />;
      case 'email_send':
        return <Send className="w-3.5 h-3.5 text-red-600" />;
      case 'reply_check':
        return <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />;
      case 'pause_toggle':
        return <Pause className="w-3.5 h-3.5 text-amber-600" />;
      case 'workflow':
        return <FolderPlus className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  // Determine popup placement based on coordinates
  const isTopHalf = position ? position.y < 400 : false;
  const isLeftHalf = position ? position.x < 420 : false;

  return (
    <div 
      className={`fixed z-50 select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      ref={hubRef}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : { right: '20px', bottom: '20px' }
      }
    >
      {/* Floating Toggle Button (Draggable) */}
      <button
        id="btn-notification-hub"
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => {
          if (justDraggedRef.current) return;
          setIsOpen(prev => !prev);
        }}
        className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-xl transition-all border touch-none cursor-grab active:cursor-grabbing ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-red-500/30'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-red-300 shadow-slate-900/10'
        }`}
        title="Activity Hub • Drag anywhere on screen, click to open"
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />

        <div className="relative shrink-0">
          <Bell className={`w-4 h-4 transition-transform ${unreadAlertsCount > 0 ? 'text-red-600 animate-bounce' : 'text-slate-600 group-hover:text-red-600'}`} />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-xs">
              {unreadAlertsCount}
            </span>
          )}
        </div>

        <span className="text-xs font-bold tracking-tight hidden sm:inline">
          Activity Hub
        </span>

        {unreadAlertsCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
            {unreadAlertsCount} New
          </span>
        )}
      </button>

      {/* Expanded Notifications Drawer Panel */}
      {isOpen && (
        <div
          id="notification-hub-panel"
          className={`absolute w-[360px] sm:w-[410px] max-h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 ${
            isTopHalf ? 'top-14' : 'bottom-14'
          } ${
            isLeftHalf ? 'left-0' : 'right-0'
          }`}
        >
          {/* Header (Also Draggable) */}
          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="p-3.5 bg-slate-900 text-white flex items-center justify-between touch-none cursor-grab active:cursor-grabbing border-b border-slate-800"
            title="Drag header to move Activity Hub"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-600 text-white shadow-xs shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>Activity &amp; Notifications</span>
                  <Move className="w-3 h-3 text-slate-400" />
                </h3>
                <p className="text-[10px] text-slate-400">Giniiris Workspace Hub • Drag to move</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {position && (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset to bottom-right position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-2 pt-2 gap-1 text-xs">
            <button
              id="hub-tab-alerts"
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 flex items-center justify-center gap-1.5 pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'alerts'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquareReply className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {unreadAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white shadow-2xs">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            <button
              id="hub-tab-actions"
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`flex-1 flex items-center justify-center gap-1.5 pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'actions'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Actions</span>
              <span className="text-[10px] font-medium text-slate-400">({actionLogs.length})</span>
            </button>

            <button
              id="hub-tab-notes"
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center gap-1.5 pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes</span>
              <span className="text-[10px] font-medium text-slate-400">({notes.length})</span>
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-3 max-h-[400px] min-h-[260px] divide-y divide-slate-100">
            {/* ========================================================= */}
            {/* TAB 1: ALERTS (REPLACES REPLY MODAL POPUP)                */}
            {/* ========================================================= */}
            {activeTab === 'alerts' && (
              <div className="space-y-2.5">
                {unreadAlertsCount === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No Pending Alerts</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      When prospects reply to outreach or manual tasks are assigned, alerts will appear here peacefully without interrupting your screen.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-1 text-[11px]">
                      <span className="font-bold text-slate-800">
                        <span className="text-red-600 font-extrabold">{unreadAlertsCount}</span> Pending Alert{unreadAlertsCount > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => {
                          if (onClearAllAlerts) {
                            onClearAllAlerts();
                          } else {
                            onClearAllReplyAlerts();
                            onClearAllTaskAlerts?.();
                          }
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-600 font-semibold underline cursor-pointer"
                      >
                        Dismiss All
                      </button>
                    </div>

                    {/* Task Alerts */}
                    {taskAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 border rounded-xl space-y-2 transition-all text-xs ${
                          alert.state === 'overdue'
                            ? 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50'
                            : alert.state === 'due_today'
                            ? 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50'
                            : 'bg-blue-50/50 border-blue-200/80 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{alert.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 truncate max-w-[220px]">
                              <span className="font-semibold text-slate-800">{alert.leadName}</span>
                              {alert.leadCompany && <span> &bull; {alert.leadCompany}</span>}
                            </p>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-2xs text-white ${
                              alert.state === 'overdue'
                                ? 'bg-rose-600'
                                : alert.state === 'due_today'
                                ? 'bg-amber-600'
                                : 'bg-blue-600'
                            }`}
                          >
                            {alert.state === 'overdue' ? 'Overdue' : alert.state === 'due_today' ? 'Due Today' : 'New Task'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              alert.priority === 'high'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : alert.priority === 'low'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                          >
                            {alert.priority} Priority
                          </span>

                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Due: {alert.dueDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-200/60">
                          <button
                            onClick={() => {
                              onNavigateToTab('tasks');
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          >
                            <CheckSquare className="w-3 h-3" />
                            <span>Tasks Tab</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {(() => {
                              const leadObj = leads.find(l =>
                                (alert.leadId && l.leadId === alert.leadId) ||
                                (alert.leadEmail && l.email && l.email.toLowerCase() === alert.leadEmail.toLowerCase())
                              );
                              if (leadObj) {
                                return (
                                  <button
                                    onClick={() => {
                                      onOpenLead(leadObj);
                                      setIsOpen(false);
                                    }}
                                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                                  >
                                    Open Lead
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            <button
                              onClick={() => onDismissTaskAlert?.(alert.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Dismiss notification"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Reply Alerts */}
                    {replyAlerts.map((lead) => (
                      <div
                        key={lead.leadId || lead.email}
                        className="p-3 bg-red-50/50 border border-red-200/80 rounded-xl space-y-2 hover:bg-red-50 transition-all text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{lead.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.2 rounded border border-red-100">
                                {lead.leadId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                              {lead.email} &bull; {lead.company}
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shrink-0 shadow-2xs">
                            Stage {lead.currentStage} Replied
                          </span>
                        </div>

                        {lead.painPoint && (
                          <p className="text-[11px] text-slate-600 italic bg-white/80 p-1.5 rounded border border-red-100/60 line-clamp-2">
                            "{lead.painPoint}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 gap-2 border-t border-red-100/80">
                          <button
                            onClick={() => {
                              onOpenLead(lead);
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>Open Thread</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onNavigateToTab('replied');
                                setIsOpen(false);
                              }}
                              className="text-[11px] font-semibold text-slate-600 hover:text-red-600 cursor-pointer"
                            >
                              Needs Reply Tab
                            </button>
                            <button
                              onClick={() => onDismissReplyAlert(lead.leadId)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Dismiss notification"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: ACTIONS LOG (WHAT ALL IS DONE IN THE APP)           */}
            {/* ========================================================= */}
            {activeTab === 'actions' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 text-[11px]">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Recent System &amp; User Activity
                  </span>
                  {actionLogs.length > 0 && (
                    <button
                      onClick={onClearActionLogs}
                      className="text-[10px] text-slate-400 hover:text-red-600 font-semibold underline cursor-pointer"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                {actionLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No recent actions recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Actions like adding leads, sending campaigns, or syncing replies will be logged here.
                    </p>
                  </div>
                ) : (
                  actionLogs.slice(0, 30).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                        {getActionIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-slate-900 truncate">{log.title}</p>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {log.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: NOTES & REMINDERS                                   */}
            {/* ========================================================= */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                {/* Note creation input */}
                <form onSubmit={handleAddNote} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add reminder or task note..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="p-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Add note"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {notes.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <StickyNote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No reminder notes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Jot down follow-up reminders, to-dos, or notes for your outreach flow.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 text-xs ${
                          note.isDone 
                            ? 'bg-slate-50 border-slate-200 text-slate-400' 
                            : 'bg-amber-50/50 border-amber-200/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={note.isDone}
                            onChange={() => handleToggleNote(note.id)}
                            className="rounded text-red-600 focus:ring-red-500 border-slate-300 w-3.5 h-3.5 mt-0.5 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium break-words leading-snug ${note.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {note.text}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {note.createdAt}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
