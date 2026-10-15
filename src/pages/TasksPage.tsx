import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  MinusSquare,
  Clock, 
  Phone, 
  Calendar, 
  Building2, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  Loader2,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import { LeadManualTask, Lead } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface ManualTasksDashboardProps {
  tasks: LeadManualTask[];
  onToggleTask: (taskId: string, forceCompleted?: boolean) => void | Promise<void>;
  onBulkToggleTasks?: (taskIds: string[], targetCompleted: boolean) => void | Promise<void>;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
}

export const ManualTasksDashboard: React.FC<ManualTasksDashboardProps> = ({
  tasks,
  onToggleTask,
  onBulkToggleTasks,
  onSelectLead,
  leads
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state for bulk operations
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  // Processing tracking for async toggles
  const [processingTaskIds, setProcessingTaskIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const today = getTodayDateString();

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus === 'pending' && t.isCompleted) return false;
      if (filterStatus === 'completed' && !t.isCompleted) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchLead = t.leadName.toLowerCase().includes(q);
        const matchCompany = t.company.toLowerCase().includes(q);
        const matchEmail = t.leadEmail.toLowerCase().includes(q);
        if (!matchTitle && !matchLead && !matchCompany && !matchEmail) return false;
      }

      return true;
    });
  }, [tasks, filterStatus, priorityFilter, searchQuery]);

  const pendingCount = tasks.filter(t => !t.isCompleted).length;
  const overdueCount = tasks.filter(t => !t.isCompleted && t.dueDate < today).length;

  // Selected tasks breakdown
  const selectedList = useMemo(() => {
    return tasks.filter(t => selectedTaskIds.has(t.id));
  }, [tasks, selectedTaskIds]);

  const selectedPendingCount = selectedList.filter(t => !t.isCompleted).length;
  const selectedCompletedCount = selectedList.filter(t => t.isCompleted).length;

  const allFilteredSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.has(t.id));
  const someFilteredSelected = filteredTasks.some(t => selectedTaskIds.has(t.id));

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        filteredTasks.forEach(t => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        filteredTasks.forEach(t => next.add(t.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleSingleToggle = async (taskId: string, targetCompleted: boolean) => {
    setProcessingTaskIds(prev => new Set(prev).add(taskId));
    try {
      await onToggleTask(taskId, targetCompleted);
      // Remove from selection if it was selected
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    } finally {
      setProcessingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleBulkAction = async (targetCompleted: boolean) => {
    const targetIds = selectedList
      .filter(t => (targetCompleted ? !t.isCompleted : t.isCompleted))
      .map(t => t.id);

    if (targetIds.length === 0) return;

    setIsBulkOperating(true);
    try {
      if (onBulkToggleTasks) {
        await onBulkToggleTasks(targetIds, targetCompleted);
      } else {
        for (const id of targetIds) {
          await onToggleTask(id, targetCompleted);
        }
      }
      handleClearSelection();
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleOpenLead = (leadId: string, leadEmail: string) => {
    const found = leads.find(l => l.leadId === leadId || l.email.toLowerCase() === leadEmail.toLowerCase());
    if (found) {
      onSelectLead(found);
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200 pb-16 relative">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Phone className="w-4 h-4" />
            <span>Workflow Action Center</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Manual Outreach Tasks & Phone Calls</h2>
          <p className="text-sm text-slate-500 mt-1">
            Select tasks using checkboxes to complete in bulk, or complete individually. Completed tasks can also be reverted back to pending at any time.
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">Pending Tasks</span>
            <span className="text-xl font-black text-blue-900">{pendingCount}</span>
          </div>

          {overdueCount > 0 && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-red-700 block">Overdue</span>
              <span className="text-xl font-black text-red-900">{overdueCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => {
              setFilterStatus('pending');
              handleClearSelection();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'pending'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            onClick={() => {
              setFilterStatus('all');
              handleClearSelection();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Tasks ({tasks.length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('completed');
              handleClearSelection();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'completed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({tasks.length - pendingCount})
          </button>
        </div>

        {/* Priority & Search */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:outline-none focus:border-red-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, leads, companies..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Select All & Selection Action Bar */}
      {filteredTasks.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAllFiltered}
              className="flex items-center gap-2 font-semibold text-slate-800 hover:text-blue-600 transition-colors"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : someFilteredSelected ? (
                <MinusSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {allFilteredSelected 
                  ? 'Deselect All' 
                  : `Select All Filtered (${filteredTasks.length})`}
              </span>
            </button>

            {selectedTaskIds.size > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                {selectedTaskIds.size} selected
              </span>
            )}
          </div>

          {selectedTaskIds.size > 0 && (
            <div className="flex items-center gap-2">
              {selectedPendingCount > 0 && (
                <button
                  disabled={isBulkOperating}
                  onClick={() => handleBulkAction(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  {isBulkOperating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Mark Done ({selectedPendingCount})</span>
                </button>
              )}

              {selectedCompletedCount > 0 && (
                <button
                  disabled={isBulkOperating}
                  onClick={() => handleBulkAction(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  {isBulkOperating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Mark Not Done ({selectedCompletedCount})</span>
                </button>
              )}

              <button
                onClick={handleClearSelection}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No tasks match your current filter. When leads arrive at a "Call / Manual Task" node in your campaign workflows, actionable to-dos will appear here.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.isCompleted && task.dueDate < today;
            const isDueToday = !task.isCompleted && task.dueDate === today;
            const isSelected = selectedTaskIds.has(task.id);
            const isProcessing = processingTaskIds.has(task.id) || isBulkOperating;

            return (
              <div 
                key={task.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected 
                    ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' 
                    : task.isCompleted 
                    ? 'border-slate-200 bg-slate-50/60' 
                    : isOverdue 
                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-100' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                
                {/* Selection Checkbox & Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectTask(task.id)}
                    className="mt-0.5 transition-colors shrink-0 text-slate-400 hover:text-blue-600 cursor-pointer"
                    title={isSelected ? 'Deselect task' : 'Select task for bulk action'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 fill-blue-50" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-blue-600" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-sm ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {task.title}
                      </h4>

                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'low' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {task.priority}
                      </span>

                      {task.isCompleted ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : null}

                      {task.campaignName && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.2 rounded border border-slate-200">
                          {task.campaignName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {task.description}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.leadName}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.company}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.leadEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Due Date & Action Buttons */}
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0 flex-wrap justify-end">
                  {/* Due Date Indicator */}
                  <div className="text-right mr-1">
                    <div className="flex items-center gap-1 justify-end text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`font-bold ${
                        task.isCompleted 
                          ? 'text-slate-500' 
                          : isOverdue 
                          ? 'text-red-600' 
                          : isDueToday 
                          ? 'text-amber-600' 
                          : 'text-slate-700'
                      }`}>
                        {task.isCompleted ? 'Due: ' : isOverdue ? 'Overdue: ' : isDueToday ? 'Due Today: ' : 'Due: '}
                        {task.dueDate}
                      </span>
                    </div>
                    {task.isCompleted && task.completedAt && (
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        Done {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Mark Done / Mark Undone Button */}
                  {task.isCompleted ? (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleSingleToggle(task.id, false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      title="Mark as undone / revert to pending"
                    >
                      {processingTaskIds.has(task.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>Mark as Not Done</span>
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={() => handleSingleToggle(task.id, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                      title="Mark task done & advance workflow"
                    >
                      {processingTaskIds.has(task.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>Mark Done</span>
                    </button>
                  )}

                  {/* View Lead Button */}
                  <button
                    onClick={() => handleOpenLead(task.leadId, task.leadEmail)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                    title="Open prospect profile & email history"
                  >
                    <span>Inspect Lead</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Bulk Action Pill (when tasks are selected) */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            {selectedPendingCount > 0 && (
              <button
                disabled={isBulkOperating}
                onClick={() => handleBulkAction(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Mark Done ({selectedPendingCount})</span>
              </button>
            )}

            {selectedCompletedCount > 0 && (
              <button
                disabled={isBulkOperating}
                onClick={() => handleBulkAction(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Mark as Not Done ({selectedCompletedCount})</span>
              </button>
            )}

            <button
              onClick={handleClearSelection}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export const TasksPage = ManualTasksDashboard;
