import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  Edge, 
  Node,
  MarkerType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Plus, 
  Save, 
  Copy, 
  RotateCcw, 
  Play, 
  FolderPlus, 
  Sparkles, 
  Mail, 
  Clock, 
  GitBranch, 
  Phone, 
  Linkedin, 
  GitMerge, 
  ChevronDown, 
  Check, 
  Users, 
  Layers, 
  Info,
  Maximize2,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  ArrowRight,
  X
} from 'lucide-react';
import { 
  CampaignWorkflow, 
  WorkflowNodeItem, 
  WorkflowEdgeItem, 
  WorkflowNodeType, 
  WorkflowNodeData,
  StageTemplate, 
  ConnectedSender, 
  Lead 
} from '../../types';
import { nodeTypes } from './WorkflowNodes';
import { WorkflowNodeInspector } from './WorkflowNodeInspector';
import { 
  createBlankWorkflow
} from '../../services/workflowService';

interface WorkflowCanvasProps {
  workflows?: CampaignWorkflow[];
  allWorkflows?: CampaignWorkflow[];
  workflow?: CampaignWorkflow;
  activeWorkflowId?: string;
  onSelectWorkflow: (workflowId: string) => void;
  onSaveWorkflow: (workflow: CampaignWorkflow) => void;
  onCreateWorkflow: (newWorkflow: CampaignWorkflow) => void;
  onDuplicateWorkflow: (workflowId: string) => void;
  onDeleteWorkflow?: (workflowId: string) => void;
  onResetWorkflows?: () => void;
  templates: StageTemplate[];
  senders?: ConnectedSender[];
  leads?: Lead[];
  onStepLeadsExecution?: (workflowId: string) => void;
  onToggleActive?: (workflowId: string, isActive: boolean) => void;
}

function normalizeNodesForCanvas(rawNodes?: WorkflowNodeItem[] | any[]): Node[] {
  if (!Array.isArray(rawNodes)) return [];
  return rawNodes.map((n: any, idx: number) => {
    const rawType = n.type || n.data?.nodeType || 'startNode';
    let type = rawType;
    if (!type.endsWith('Node')) {
      if (type === 'manual_task') type = 'manualTaskNode';
      else if (type === 'linkedin_invite') type = 'linkedinInviteNode';
      else if (type === 'linkedin_message') type = 'linkedinMessageNode';
      else type = `${type}Node`;
    }

    const nodeType = n.data?.nodeType || (
      type === 'startNode' ? 'start' :
      type === 'emailNode' ? 'email' :
      type === 'waitNode' ? 'wait' :
      type === 'conditionNode' ? 'condition' :
      type === 'manualTaskNode' ? 'manual_task' :
      type === 'mergeNode' ? 'merge' :
      type === 'linkedinInviteNode' ? 'linkedin_invite' :
      type === 'linkedinMessageNode' ? 'linkedin_message' : 'start'
    );

    return {
      id: n.id || `node-${Date.now()}-${idx}`,
      type,
      position: {
        x: typeof n.position?.x === 'number' && !isNaN(n.position.x) ? n.position.x : 340,
        y: typeof n.position?.y === 'number' && !isNaN(n.position.y) ? n.position.y : 100 + idx * 140
      },
      data: {
        ...(n.data || {}),
        nodeType,
        label: n.data?.label || (
          type === 'startNode' ? 'Start Trigger' :
          type === 'emailNode' ? 'Email Step' :
          type === 'waitNode' ? 'Wait Step' :
          type === 'conditionNode' ? 'Condition' :
          type === 'mergeNode' ? 'Merge Branches' :
          type === 'manualTaskNode' ? 'Manual Task' : 'Workflow Step'
        )
      }
    };
  });
}

function normalizeEdgesForCanvas(rawEdges?: WorkflowEdgeItem[] | any[]): Edge[] {
  if (!Array.isArray(rawEdges)) return [];
  return rawEdges.map((e: any, idx: number) => {
    const isYes = e.sourceHandle === 'yes' || e.label === 'YES';
    const isNo = e.sourceHandle === 'no' || e.label === 'NO';
    const sourceHandle = isYes ? 'yes' : isNo ? 'no' : (e.sourceHandle || undefined);
    const label = isYes ? 'YES' : isNo ? 'NO' : (e.label || undefined);

    return {
      id: e.id || `e-${e.source}-${sourceHandle || 'def'}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      sourceHandle,
      targetHandle: e.targetHandle || undefined,
      type: e.type || 'smoothstep',
      label,
      animated: Boolean(e.animated),
      markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    };
  });
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflows = [],
  allWorkflows,
  workflow,
  activeWorkflowId,
  onSelectWorkflow,
  onSaveWorkflow,
  onCreateWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onResetWorkflows,
  templates = [],
  senders = [],
  leads = [],
  onStepLeadsExecution,
  onToggleActive
}) => {
  // Fallback blank workflow if list is empty
  const defaultBlank = useMemo(() => createBlankWorkflow('My Outreach Flow'), []);

  // Normalize workflow list
  const workflowList = useMemo(() => {
    if (Array.isArray(workflows) && workflows.length > 0) return workflows;
    if (Array.isArray(allWorkflows) && allWorkflows.length > 0) return allWorkflows;
    return [];
  }, [workflows, allWorkflows]);

  // Current active workflow object
  const activeWorkflow = useMemo(() => {
    if (workflow) return workflow;
    if (workflowList.length === 0) return null;
    const targetId = activeWorkflowId || workflowList[0]?.id;
    return workflowList.find(w => w.id === targetId) || workflowList[0] || null;
  }, [workflow, workflowList, activeWorkflowId]);

  const effectiveWorkflow = activeWorkflow || defaultBlank;

  // Track last synced workflow signature to prevent redundant overwrites while allowing reload sync
  const lastLoadedSignatureRef = useRef<string | null>(null);

  // React Flow state for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(normalizeNodesForCanvas(effectiveWorkflow.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizeEdgesForCanvas(effectiveWorkflow.edges));

  // Selected node & edge states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Modals for non-blocking confirmation (fixes window.confirm bugs in iframe)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Editable workflow metadata
  const [workflowName, setWorkflowName] = useState(effectiveWorkflow.name);
  const [workflowDescription, setWorkflowDescription] = useState(effectiveWorkflow.description);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync state whenever activeWorkflow changes or reloads from backend
  useEffect(() => {
    if (!activeWorkflow) return;
    const sig = `${activeWorkflow.id}-${activeWorkflow.version}-${activeWorkflow.updatedAt}-${activeWorkflow.nodes?.length}-${activeWorkflow.edges?.length}`;
    if (lastLoadedSignatureRef.current !== sig) {
      lastLoadedSignatureRef.current = sig;
      setNodes(normalizeNodesForCanvas(activeWorkflow.nodes));
      setEdges(normalizeEdgesForCanvas(activeWorkflow.edges));
      setWorkflowName(activeWorkflow.name);
      setWorkflowDescription(activeWorkflow.description || '');
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setHasUnsavedChanges(false);
    }
  }, [
    activeWorkflow?.id,
    activeWorkflow?.version,
    activeWorkflow?.updatedAt,
    activeWorkflow?.nodes?.length,
    activeWorkflow?.edges?.length,
    setNodes,
    setEdges
  ]);

  // Connect edges
  const onConnect = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return;
    setEdges((eds) => {
      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.sourceHandle || 'def'}-${connection.target}`,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        ...(connection.sourceHandle === 'yes' ? { label: 'YES' } : {}),
        ...(connection.sourceHandle === 'no' ? { label: 'NO' } : {})
      } as Edge;
      return addEdge(newEdge, eds);
    });
    setHasUnsavedChanges(true);
  }, [setEdges]);

  // Click on node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Click on edge
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Click canvas background -> deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  // Inspector node getter
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return (nodes.find(n => n.id === selectedNodeId) as unknown as WorkflowNodeItem) || null;
  }, [nodes, selectedNodeId]);

  // Selected edge getter
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find(e => e.id === selectedEdgeId) || null;
  }, [edges, selectedEdgeId]);

  // Delete selected edge
  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter(e => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
  };

  // Update node data from inspector
  const handleUpdateNodeData = (nodeId: string, updatedData: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedData
            }
          };
        }
        return node;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    setHasUnsavedChanges(true);
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode) return;

    const sourceData = sourceNode.data as unknown as WorkflowNodeData;
    const newId = `node-${sourceData.nodeType || 'step'}-${Date.now().toString().slice(-4)}`;
    const newNode: Node = {
      ...sourceNode,
      id: newId,
      position: {
        x: sourceNode.position.x + 40,
        y: sourceNode.position.y + 40
      },
      data: {
        ...sourceData,
        label: `${sourceData.label || 'Step'} (Copy)`
      },
      selected: true
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
    setHasUnsavedChanges(true);
  };

  // Add new node from palette
  const handleAddNode = (type: WorkflowNodeType) => {
    const id = `node-${type}-${Date.now().toString().slice(-4)}`;
    
    // Position below the lowest existing node or center
    let maxY = 100;
    nodes.forEach(n => {
      if (n.position.y > maxY) maxY = n.position.y;
    });

    let nodeTypeString = 'emailNode';
    let initialData: WorkflowNodeData = {
      label: 'New Step',
      nodeType: type
    };

    switch (type) {
      case 'start':
        nodeTypeString = 'startNode';
        initialData = {
          label: 'Campaign Start & Trigger',
          nodeType: 'start',
          description: 'Enrolls new leads and defines allowed sending windows',
          senderId: 'sender-primary',
          schedule: {
            allowedDays: [1, 2, 3, 4, 5],
            startHour: 9,
            endHour: 18,
            timezone: 'local'
          }
        };
        break;
      case 'email':
        nodeTypeString = 'emailNode';
        const existingEmailCount = nodes.filter(n => n.type === 'emailNode').length;
        const nextStage = existingEmailCount + 1;
        initialData = {
          label: `Email: Stage ${nextStage}`,
          nodeType: 'email',
          templateStage: nextStage,
          description: `Stage ${nextStage} outreach touchpoint`
        };
        break;
      case 'wait':
        nodeTypeString = 'waitNode';
        initialData = {
          label: 'Wait 3 Days',
          nodeType: 'wait',
          waitDuration: 3,
          waitUnit: 'days',
          description: 'Pauses automated sequence'
        };
        break;
      case 'condition':
        nodeTypeString = 'conditionNode';
        initialData = {
          label: 'Condition: Replied or Opened?',
          nodeType: 'condition',
          conditionType: 'email_opened',
          description: 'Branch based on lead activity'
        };
        break;
      case 'manual_task':
        nodeTypeString = 'manualTaskNode';
        initialData = {
          label: 'Task: Phone Call to Prospect',
          nodeType: 'manual_task',
          taskTitle: 'Call {{first_name}} at {{company}}',
          taskDescription: 'Direct outreach call regarding {{pain_point}}',
          taskDueDateOffsetDays: 1,
          taskPriority: 'high'
        };
        break;
      case 'merge':
        nodeTypeString = 'mergeNode';
        initialData = {
          label: 'Merge Branches',
          nodeType: 'merge',
          description: 'Rejoins branches into downstream flow'
        };
        break;
    }

    const selectedCurrentNode = nodes.find(n => n.id === selectedNodeId);
    let posX = 340;
    let posY = maxY + 140;

    // If a node was already selected, place right below it!
    if (selectedCurrentNode) {
      posX = selectedCurrentNode.position.x;
      posY = selectedCurrentNode.position.y + 140;
    }

    const newNode: Node = {
      id,
      type: nodeTypeString,
      position: { x: posX, y: posY },
      data: initialData
    };

    setNodes((nds) => [...nds, newNode]);

    // If a node was selected, auto-connect from selected node to new node
    if (selectedCurrentNode && selectedCurrentNode.type !== 'mergeNode') {
      const sourceHandle = selectedCurrentNode.type === 'conditionNode' ? 'yes' : undefined;
      const newEdge: Edge = {
        id: `e-${selectedCurrentNode.id}-${sourceHandle || 'def'}-${id}`,
        source: selectedCurrentNode.id,
        target: id,
        sourceHandle,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        ...(sourceHandle === 'yes' ? { label: 'YES' } : {})
      };
      setEdges((eds) => addEdge(newEdge, eds));
    }

    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
  };

  // Tidy / Auto-arrange flow layout top-to-bottom
  const handleAutoArrange = () => {
    if (nodes.length === 0) return;
    
    const startNodes = nodes.filter(n => n.type === 'startNode');
    const otherNodes = nodes.filter(n => n.type !== 'startNode');
    const ordered = [...startNodes, ...otherNodes];

    const updated = ordered.map((node, index) => ({
      ...node,
      position: {
        x: 340,
        y: 50 + index * 145
      }
    }));

    setNodes(updated);
    setHasUnsavedChanges(true);
    setSaveSuccessMessage('Flow layout tidied');
    setTimeout(() => setSaveSuccessMessage(null), 2000);
  };

  // Clear canvas / Reset flow
  const handleClearCanvas = () => {
    setShowClearModal(true);
  };

  const executeClearCanvas = (autoSave = true) => {
    const startNode: Node = {
      id: 'node-start',
      type: 'startNode',
      position: { x: 350, y: 50 },
      data: {
        label: 'Campaign Trigger',
        nodeType: 'start',
        description: 'Enrolls active leads due for contact'
      }
    };
    setNodes([startNode]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    if (autoSave && activeWorkflow) {
      const updatedWorkflow: CampaignWorkflow = {
        ...activeWorkflow,
        name: workflowName,
        description: workflowDescription,
        version: (activeWorkflow.version || 1) + 1,
        updatedAt: new Date().toISOString(),
        nodes: [{
          id: startNode.id,
          type: 'startNode',
          position: startNode.position,
          data: { ...(startNode.data as any) }
        }],
        edges: []
      };

      lastLoadedSignatureRef.current = `${updatedWorkflow.id}-${updatedWorkflow.version}-${updatedWorkflow.updatedAt}-1-0`;
      onSaveWorkflow(updatedWorkflow);
      setHasUnsavedChanges(false);
      setSaveSuccessMessage('Workflow cleared & saved');
    } else {
      setHasUnsavedChanges(true);
      setSaveSuccessMessage('Workflow cleared');
    }

    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  // Save current workflow
  const handleSave = () => {
    if (!activeWorkflow) return;

    // Clean and serialize nodes
    const serializedNodes: WorkflowNodeItem[] = nodes.map(n => ({
      id: n.id,
      type: n.type || 'startNode',
      position: {
        x: Math.round(n.position?.x ?? 340),
        y: Math.round(n.position?.y ?? 100)
      },
      data: { ...(n.data as any) }
    }));

    // Clean and serialize edges - preserving handles, branch labels, and types
    const serializedEdges: WorkflowEdgeItem[] = edges.map(e => {
      const isYes = e.sourceHandle === 'yes' || e.label === 'YES';
      const isNo = e.sourceHandle === 'no' || e.label === 'NO';
      const sourceHandle = isYes ? 'yes' : isNo ? 'no' : (e.sourceHandle || null);
      const label = isYes ? 'YES' : isNo ? 'NO' : (e.label || undefined);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle,
        targetHandle: e.targetHandle || null,
        label,
        type: e.type || 'smoothstep',
        animated: Boolean(e.animated)
      };
    });

    const updatedWorkflow: CampaignWorkflow = {
      ...activeWorkflow,
      name: workflowName,
      description: workflowDescription,
      version: (activeWorkflow.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      nodes: serializedNodes,
      edges: serializedEdges
    };

    lastLoadedSignatureRef.current = `${updatedWorkflow.id}-${updatedWorkflow.version}-${updatedWorkflow.updatedAt}-${serializedNodes.length}-${serializedEdges.length}`;
    onSaveWorkflow(updatedWorkflow);
    setHasUnsavedChanges(false);
    setSaveSuccessMessage('Workflow saved!');
    setTimeout(() => setSaveSuccessMessage(null), 2500);
  };

  // Count leads currently running in this campaign
  const campaignLeadsCount = useMemo(() => {
    if (!activeWorkflow) return 0;
    return leads.filter(l => 
      l.campaignId === activeWorkflow.id || 
      (l.campaign && l.campaign.toLowerCase() === activeWorkflow.name.toLowerCase()) ||
      (activeWorkflow.isDefault && (!l.campaign || l.campaign === 'Default'))
    ).length;
  }, [leads, activeWorkflow]);

  // Edge styling with active selection highlight
  const styledEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      style: e.id === selectedEdgeId 
        ? { stroke: '#dc2626', strokeWidth: 3.5 } 
        : { stroke: '#94a3b8', strokeWidth: 2 },
      animated: e.id === selectedEdgeId
    }));
  }, [edges, selectedEdgeId]);

  // Empty state if no workflows exist yet
  if (workflowList.length === 0 || !activeWorkflow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Build a Workflow From Scratch</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            All canned workflows have been removed. You can now build your automated outreach sequence completely from scratch with custom triggers, email stages, wait delays, and branches.
          </p>
          <button
            onClick={() => onCreateWorkflow(createBlankWorkflow('My Outreach Flow'))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create Workflow from Scratch</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs relative">
      
      {/* ================================================================== */}
      {/* TOP WORKFLOW TOOLBAR                                               */}
      {/* ================================================================== */}
      <div className="bg-white border-b border-slate-200 p-3 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 shrink-0">
        
        {/* Left: Workflow Selector & Name */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <GitBranch className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                id="select-active-workflow"
                value={activeWorkflow.id}
                onChange={(e) => onSelectWorkflow(e.target.value)}
                className="text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-red-500 cursor-pointer pr-8"
              >
                {workflowList.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? '• (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent hover:bg-slate-100 px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:outline-none focus:bg-white focus:border-red-500 w-48 sm:w-64"
              placeholder="Flow Name..."
              title="Click to rename workflow"
            />
          </div>

          {/* Active stats badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-200">
            <Users className="w-3.5 h-3.5 text-red-600" />
            <span>{campaignLeadsCount} Leads Enrolled</span>
          </div>

          {/* Active / Inactive Toggle Switch */}
          <button
            type="button"
            onClick={() => {
              const currentActive = Boolean(activeWorkflow.isActive ?? activeWorkflow.is_active);
              const nextState = !currentActive;
              if (onToggleActive) {
                onToggleActive(activeWorkflow.id, nextState);
              }
              const updated = {
                ...activeWorkflow,
                isActive: nextState,
                is_active: nextState
              };
              onSaveWorkflow(updated);
              setSaveSuccessMessage(nextState ? 'Campaign is now ACTIVE' : 'Campaign is now DRAFT');
              setTimeout(() => setSaveSuccessMessage(null), 2500);
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              Boolean(activeWorkflow.isActive ?? activeWorkflow.is_active)
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle between Active (eligible to run sends) and Inactive Draft"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                Boolean(activeWorkflow.isActive ?? activeWorkflow.is_active)
                  ? 'bg-emerald-600 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {Boolean(activeWorkflow.isActive ?? activeWorkflow.is_active) ? 'ACTIVE' : 'DRAFT (Inactive)'}
            </span>
          </button>
        </div>

        {/* Right: Actions (Save, Duplicate, New, Step Test) */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {saveSuccessMessage && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessMessage}</span>
            </span>
          )}

          {hasUnsavedChanges && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unsaved edits
            </span>
          )}

          {/* New Campaign Flow */}
          <button
            onClick={() => {
              const newFlow = createBlankWorkflow(`Custom Campaign Flow #${workflowList.length + 1}`);
              newFlow.isDefault = false;
              onCreateWorkflow(newFlow);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Create a fresh workflow from scratch"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ New Flow</span>
          </button>

          {/* Clear Canvas Trigger Button */}
          <button
            onClick={handleClearCanvas}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Clear canvas steps"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Flow</span>
          </button>

          {/* Tidy Flow Layout Button */}
          <button
            onClick={handleAutoArrange}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Auto-align nodes in clean vertical sequence"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>Tidy Layout</span>
          </button>

          {/* Duplicate Current */}
          <button
            onClick={() => onDuplicateWorkflow(activeWorkflow.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            title="Duplicate this flow as a starting point"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          {/* Delete Current Flow */}
          {onDeleteWorkflow && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
              title="Delete this workflow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* Save Workflow Button */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer ${
              hasUnsavedChanges 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Flow</span>
          </button>
        </div>

      </div>

      {/* ================================================================== */}
      {/* MAIN CANVAS AREA WITH REACT FLOW & PALETTE                         */}
      {/* ================================================================== */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        
        {/* Floating Add Node Palette on Left */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-2.5 shadow-md space-y-2 w-52">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
            Add Node to Canvas
          </span>

          <div className="space-y-1">
            <button
              onClick={() => handleAddNode('start')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all text-left cursor-pointer"
              title="Add campaign start & trigger node"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Campaign Trigger</span>
            </button>

            <button
              onClick={() => handleAddNode('email')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all text-left cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-red-600" />
              <span>Email Step</span>
            </button>

            <button
              onClick={() => handleAddNode('wait')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-amber-50 hover:text-amber-700 border border-transparent hover:border-amber-200 transition-all text-left cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Wait Delay</span>
            </button>

            <button
              onClick={() => handleAddNode('condition')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-purple-50 hover:text-purple-700 border border-transparent hover:border-purple-200 transition-all text-left cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-600" />
              <span>Condition Split (Yes/No)</span>
            </button>

            <button
              onClick={() => handleAddNode('manual_task')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 transition-all text-left cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Call / Manual Task</span>
            </button>

            <button
              onClick={() => handleAddNode('merge')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-300 transition-all text-left cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 text-slate-700" />
              <span>Merge Point</span>
            </button>
          </div>
        </div>

        {/* Hint helper when building from scratch */}
        {nodes.length <= 1 && (
          <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-3 shadow-sm max-w-xs text-xs text-slate-600 pointer-events-none">
            <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Build From Scratch</span>
            </p>
            <p className="leading-relaxed text-[11px] text-slate-500">
              Click nodes on the left palette (Email Step, Wait Delay, Condition Split), then connect them by dragging from one node handle to another.
            </p>
          </div>
        )}

        {/* Floating Selected Edge Deletion Bar */}
        {selectedEdge && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-950 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
            <span className="font-medium text-slate-300">
              Connection selected ({selectedEdge.sourceHandle === 'yes' ? 'YES Branch' : selectedEdge.sourceHandle === 'no' ? 'NO Branch' : 'Direct Link'})
            </span>
            <button
              onClick={handleDeleteSelectedEdge}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Line</span>
            </button>
            <button
              onClick={() => setSelectedEdgeId(null)}
              className="text-slate-400 hover:text-white px-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* React Flow Viewport */}
        <div className="flex-1 h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              setHasUnsavedChanges(true);
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setHasUnsavedChanges(true);
            }}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[15, 15]}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2, stroke: '#94a3b8' }
            }}
          >
            <Background gap={15} size={1} color="#e2e8f0" />
            <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
            <MiniMap 
              nodeColor={(n) => {
                if (n.type === 'startNode') return '#dc2626';
                if (n.type === 'emailNode') return '#ef4444';
                if (n.type === 'waitNode') return '#f59e0b';
                if (n.type === 'conditionNode') return '#9333ea';
                if (n.type === 'manualTaskNode') return '#2563eb';
                return '#94a3b8';
              }}
              className="!bottom-4 !right-4 !border-slate-200 !rounded-xl !shadow-sm" 
            />
          </ReactFlow>
        </div>

        {/* Slide-over Side Panel Inspector */}
        {selectedNode && (
          <WorkflowNodeInspector
            node={selectedNode}
            templates={templates}
            senders={senders}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

      </div>

      {/* ================================================================== */}
      {/* CLEAR WORKFLOW CONFIRMATION MODAL (Non-blocking for iframes)         */}
      {/* ================================================================== */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear Flow Steps</h3>
                <p className="text-xs text-slate-500">Reset canvas to trigger node</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all flow steps in <strong>"{workflowName}"</strong>? This will remove all action nodes and connections, keeping only the initial trigger.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  executeClearCanvas(true);
                  setShowClearModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Flow</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DELETE WORKFLOW CONFIRMATION MODAL                                 */}
      {/* ================================================================== */}
      {showDeleteModal && onDeleteWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Workflow</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{workflowName}"</strong>?
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteWorkflow(activeWorkflow.id);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Delete Flow
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
