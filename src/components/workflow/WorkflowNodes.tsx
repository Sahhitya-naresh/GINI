import React, { memo } from 'react';
import { Handle, Position, Node, NodeProps, useReactFlow } from '@xyflow/react';
import { 
  Send, 
  Clock, 
  GitBranch, 
  CheckSquare, 
  GitMerge, 
  Sparkles, 
  Mail, 
  Calendar, 
  UserCheck, 
  Linkedin, 
  Phone, 
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { WorkflowNodeData } from '../../types';

type CustomNodeProps = NodeProps<Node<WorkflowNodeData>>;

// --------------------------------------------------------------------------
// 1. START NODE
// --------------------------------------------------------------------------
export const StartNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  const schedule = data.schedule || { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: 'local' };
  const daysSummary = schedule.allowedDays?.length === 5 ? 'Mon–Fri' : `${schedule.allowedDays?.length || 5} Days/Wk`;
  const timeSummary = `${schedule.startHour || 9}:00 - ${schedule.endHour || 18}:00`;

  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm ${
      selected ? 'border-red-600 ring-4 ring-red-100 shadow-md' : 'border-slate-300 hover:border-slate-400'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider">Start Trigger</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
            Entry
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Delete this start trigger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{data.label || 'Campaign Start'}</h4>
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{data.description || 'Enrolls new leads'}</p>
        </div>

        {/* Sender & Schedule Pills */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
            <UserCheck className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="truncate font-medium text-[11px]">
              Sender: <strong className="text-slate-800">{data.senderEmail || (data.senderId && data.senderId !== 'sender-primary' ? data.senderId : 'Primary Workspace')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-[11px]">
              {daysSummary} • {timeSummary}
            </span>
          </div>
        </div>
      </div>

      {/* Source Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-red-600 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
StartNode.displayName = 'StartNode';

// --------------------------------------------------------------------------
// 2. EMAIL NODE
// --------------------------------------------------------------------------
export const EmailNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  const stageNum = data.templateStage;
  const isCustom = data.useCustomTemplate;

  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm ${
      selected ? 'border-red-600 ring-4 ring-red-100 shadow-md' : 'border-slate-300 hover:border-red-300'
    }`}>
      {/* Target Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      {/* Header */}
      <div className="bg-red-50/80 border-b border-red-100 p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center">
            <Mail className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-red-900">
            {stageNum ? `Email Stage ${stageNum}` : 'Custom Email'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
            Email Send
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-red-200/60 rounded text-slate-400 hover:text-red-700 transition-colors cursor-pointer"
            title="Delete this email node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5 text-xs">
        <h4 className="font-bold text-slate-900 line-clamp-1">{data.label}</h4>
        <p className="text-[11px] text-slate-500 line-clamp-2">
          {data.description || (isCustom ? data.customSubject : 'Direct outreach email step')}
        </p>

        {/* Sender Column Indicator */}
        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-200">
          <span className="text-slate-500 font-medium">Sender:</span>
          <span className="font-semibold text-slate-700 truncate max-w-[140px]">
            {data.senderEmail ? String(data.senderEmail) : (data.senderId && data.senderId !== 'sender-primary' ? String(data.senderId) : (data.senderId === 'sender-primary' ? 'Primary Workspace' : 'Campaign Default'))}
          </span>
        </div>

        <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
          <span>Merge tags: <strong className="text-slate-600 font-mono">{'{{first_name}}'}</strong></span>
          <span className="text-red-700 font-semibold flex items-center gap-0.5">
            Configure &rarr;
          </span>
        </div>
      </div>

      {/* Source Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-red-600 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
EmailNode.displayName = 'EmailNode';

// --------------------------------------------------------------------------
// 3. WAIT NODE
// --------------------------------------------------------------------------
export const WaitNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  const duration = data.waitDuration || 1;
  const unit = data.waitUnit || 'days';

  return (
    <div className={`w-64 bg-white rounded-xl border-2 transition-all shadow-sm ${
      selected ? 'border-amber-500 ring-4 ring-amber-100 shadow-md' : 'border-slate-300 hover:border-amber-300'
    }`}>
      {/* Target Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      <div className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Delay Step</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteElements({ nodes: [{ id }] });
              }}
              className="p-1 hover:bg-amber-100 rounded text-slate-400 hover:text-amber-700 transition-colors cursor-pointer"
              title="Delete this wait delay"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="font-bold text-slate-900 text-sm truncate">
            Wait {duration} {unit === 'days' ? (duration === 1 ? 'Day' : 'Days') : (duration === 1 ? 'Hour' : 'Hours')}
          </h4>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            Pauses automated sequence
          </p>
        </div>
      </div>

      {/* Source Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-amber-500 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
WaitNode.displayName = 'WaitNode';

// --------------------------------------------------------------------------
// 4. CONDITION (BRANCH) NODE
// --------------------------------------------------------------------------
export const ConditionNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  const condType = data.conditionType || 'email_opened';
  
  const getConditionTitle = () => {
    switch (condType) {
      case 'has_linkedin_url': return 'Has LinkedIn URL?';
      case 'has_replied': return 'Has Lead Replied?';
      case 'email_opened': return 'Email Was Opened?';
      case 'link_clicked': return 'Link Was Clicked?';
      default: return 'Custom Condition?';
    }
  };

  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm pb-2 ${
      selected ? 'border-purple-600 ring-4 ring-purple-100 shadow-md' : 'border-slate-300 hover:border-purple-300'
    }`}>
      {/* Target Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      {/* Header */}
      <div className="bg-purple-50/80 border-b border-purple-100 p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center">
            <GitBranch className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-purple-900">Branching Logic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
            If / Else
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-purple-200/60 rounded text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
            title="Delete this condition split"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 text-xs space-y-2">
        <div>
          <h4 className="font-bold text-slate-900">{getConditionTitle()}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{data.description || 'Evaluates lead telemetry'}</p>
        </div>

        {/* Dual Branch Output Footers with Direct Handle Anchors */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold px-1">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>YES Path &darr;</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 shadow-2xs">
            <span>NO Path &darr;</span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
        </div>
      </div>

      {/* Left Bottom Handle (YES Branch) */}
      <Handle
        type="source"
        id="yes"
        position={Position.Bottom}
        style={{ left: '26%' }}
        className="!w-4 !h-4 !bg-emerald-600 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      {/* Right Bottom Handle (NO Branch) */}
      <Handle
        type="source"
        id="no"
        position={Position.Bottom}
        style={{ left: '74%' }}
        className="!w-4 !h-4 !bg-rose-600 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
ConditionNode.displayName = 'ConditionNode';

// --------------------------------------------------------------------------
// 5. MANUAL TASK / CALL NODE
// --------------------------------------------------------------------------
export const ManualTaskNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  const priority = data.taskPriority || 'medium';

  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm ${
      selected ? 'border-blue-600 ring-4 ring-blue-100 shadow-md' : 'border-slate-300 hover:border-blue-300'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      {/* Header */}
      <div className="bg-blue-50/80 border-b border-blue-100 p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <Phone className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-blue-900">Call / Manual Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            priority === 'high' ? 'bg-red-100 text-red-800' :
            priority === 'low' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-800'
          }`}>
            {priority.toUpperCase()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-blue-200/60 rounded text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
            title="Delete this task node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 text-xs space-y-1.5">
        <h4 className="font-bold text-slate-900">{data.taskTitle || data.label || 'Phone Call to Decision Maker'}</h4>
        <p className="text-[11px] text-slate-500 line-clamp-2">
          {data.taskDescription || 'Creates an action item in your Tasks dashboard'}
        </p>
        <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100">
          <span>Due: Within {data.taskDueDateOffsetDays || 1} day(s)</span>
          <span className="text-blue-600 font-semibold">User To-Do</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-blue-600 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
ManualTaskNode.displayName = 'ManualTaskNode';

// --------------------------------------------------------------------------
// 6. LINKEDIN INVITATION (COMING SOON)
// --------------------------------------------------------------------------
export const LinkedinInviteNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm opacity-85 ${
      selected ? 'border-[#0a66c2] ring-4 ring-blue-100 shadow-md' : 'border-slate-300'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      <div className="bg-[#0a66c2]/10 border-b border-[#0a66c2]/20 p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0a66c2] text-white flex items-center justify-center">
            <Linkedin className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-[#0a66c2]">LinkedIn Invite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Coming Soon
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Delete this node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 text-xs space-y-1">
        <h4 className="font-bold text-slate-900">{data.label || 'Connect on LinkedIn'}</h4>
        <p className="text-[11px] text-slate-500">
          Automated connection invite with custom message. Inert until integration is configured.
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-[#0a66c2] !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
LinkedinInviteNode.displayName = 'LinkedinInviteNode';

// --------------------------------------------------------------------------
// 7. LINKEDIN CHAT MESSAGE (COMING SOON)
// --------------------------------------------------------------------------
export const LinkedinMessageNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  return (
    <div className={`w-72 bg-white rounded-xl border-2 transition-all shadow-sm opacity-85 ${
      selected ? 'border-[#0a66c2] ring-4 ring-blue-100 shadow-md' : 'border-slate-300'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-500 hover:!bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      <div className="bg-[#0a66c2]/10 border-b border-[#0a66c2]/20 p-2.5 px-3 rounded-t-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0a66c2] text-white flex items-center justify-center">
            <Linkedin className="w-3 h-3" />
          </div>
          <span className="font-bold text-xs text-[#0a66c2]">LinkedIn Message</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Coming Soon
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ nodes: [{ id }] });
            }}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Delete this node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 text-xs space-y-1">
        <h4 className="font-bold text-slate-900">{data.label || 'Send Direct InMail'}</h4>
        <p className="text-[11px] text-slate-500">
          Follow up message after connection acceptance. Inert until integration is enabled.
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-[#0a66c2] !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
LinkedinMessageNode.displayName = 'LinkedinMessageNode';

// --------------------------------------------------------------------------
// 8. MERGE POINT NODE
// --------------------------------------------------------------------------
export const MergeNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const { deleteElements } = useReactFlow();
  return (
    <div className={`w-60 bg-white rounded-xl border-2 transition-all shadow-sm ${
      selected ? 'border-slate-800 ring-4 ring-slate-100 shadow-md' : 'border-slate-300 hover:border-slate-500'
    }`}>
      {/* Accepts multiple incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />

      <div className="p-2.5 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
            <GitMerge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-xs truncate">{data.label || 'Merge Branches'}</h4>
            <p className="text-[10px] text-slate-400 truncate">Rejoins flows to single step</p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteElements({ nodes: [{ id }] });
          }}
          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          title="Delete this merge node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-slate-700 !border-2 !border-white shadow-xs hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
});
MergeNode.displayName = 'MergeNode';

export const nodeTypes = {
  startNode: StartNode,
  start: StartNode,
  emailNode: EmailNode,
  email: EmailNode,
  waitNode: WaitNode,
  wait: WaitNode,
  conditionNode: ConditionNode,
  condition: ConditionNode,
  manualTaskNode: ManualTaskNode,
  manual_task: ManualTaskNode,
  linkedinInviteNode: LinkedinInviteNode,
  linkedin_invite: LinkedinInviteNode,
  linkedinMessageNode: LinkedinMessageNode,
  linkedin_message: LinkedinMessageNode,
  mergeNode: MergeNode,
  merge: MergeNode
};

