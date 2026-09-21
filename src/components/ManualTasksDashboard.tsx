import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
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
  ChevronRight
} from 'lucide-react';
import { LeadManualTask, Lead } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface ManualTasksDashboardProps {
  tasks: LeadManualTask[];
  onToggleTask: (taskId: string) => void;
  onSelectLead: (lead: Lead) => void;
  leads: Lead[];
}

export const ManualTasksDashboard: React.FC<ManualTasksDashboardProps> = ({
  tasks,
  onToggleTask,
  onSelectLead,
  leads
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleOpenLead = (leadId: string, leadEmail: string) => {
    const found = leads.find(l => l.leadId === leadId || l.email.toLowerCase() === leadEmail.toLowerCase());
    if (found) {
      onSelectLead(found);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Phone className="w-4 h-4" />
            <span>Workflow Action Center</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Manual Outreach Tasks & Phone Calls</h2>
          <p className="text-sm text-slate-500 mt-1">
            Action items automatically triggered by your campaign flows (e.g. phone calls, personalized voice notes, manual LinkedIn research). Marking a task complete allows the lead to advance to downstream nodes.
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
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'pending'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Tasks ({tasks.length})
          </button>

          <button
            onClick={() => setFilterStatus('completed')}
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

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No pending tasks match your current filter. When leads arrive at a "Call / Manual Task" node in your campaign workflows, actionable to-dos will appear here.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.isCompleted && task.dueDate < today;
            const isDueToday = !task.isCompleted && task.dueDate === today;

            return (
              <div 
                key={task.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  task.isCompleted 
                    ? 'border-slate-200 opacity-60 bg-slate-50/50' 
                    : isOverdue 
                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-100' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                
                {/* Checkbox & Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                    title={task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
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

                {/* Right: Due Date & Lead Inspector Link */}
                <div className="flex items-center gap-4 self-end md:self-auto shrink-0">
                  {/* Due Date Indicator */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`font-bold ${
                        isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-slate-700'
                      }`}>
                        {isOverdue ? 'Overdue: ' : isDueToday ? 'Due Today: ' : 'Due: '}
                        {task.dueDate}
                      </span>
                    </div>
                    {task.isCompleted && task.completedAt && (
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        Completed
                      </span>
                    )}
                  </div>

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

    </div>
  );
};
