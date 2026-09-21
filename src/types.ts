export type LeadStatus = 'Active' | 'Replied' | 'Paused' | 'Completed' | 'Broke Up';

export interface Lead {
  leadId: string;
  name: string;
  email: string;
  company: string;
  painPoint: string;
  currentStage: number; // 0 (Not started) to 7
  status: LeadStatus;
  lastEmailSentDate: string; // YYYY-MM-DD or ISO
  nextSendDate: string; // YYYY-MM-DD
  threadId: string;
  notes: string;
  rowIndex?: number; // 1-based index in the Google Sheet (row 1 = headers, data starts at row 2)

  // Extended fields for CSV/Excel Import, LinkedIn, and Campaign Grouping
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  industry?: string;
  campaign?: string;

  // Tracking metrics (Open pixel & Link clicks)
  opensCount?: number;
  firstOpenedDate?: string;
  lastOpenedDate?: string;
  clicksCount?: number;
  firstClickedDate?: string;
  lastClickedDate?: string;

  // Workflow Graph Engine fields
  currentNodeId?: string;
  campaignId?: string;
  nodeEnteredDate?: string;
  senderUsed?: string;
  taskPending?: boolean;
}

// Senders Management
export interface ConnectedSender {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: 'connected' | 'needs_reauth' | 'alias';
  isPrimary?: boolean;
  dailySendLimit: number;
  sendsToday: number;
  lastUsedAt?: string;
}

// Workflow Graph Node Types
export type WorkflowNodeType = 
  | 'start' 
  | 'email' 
  | 'wait' 
  | 'condition' 
  | 'linkedin_invite' 
  | 'linkedin_message' 
  | 'manual_task' 
  | 'merge';

export interface WorkflowSchedule {
  allowedDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (default: [1,2,3,4,5])
  startHour: number; // 0-23, default 9
  endHour: number; // 0-23, default 18
  timezone: string; // e.g. 'local', 'America/New_York', 'UTC'
}

export type ConditionEvaluationType = 
  | 'has_linkedin_url'
  | 'has_replied'
  | 'email_opened'
  | 'link_clicked';

export interface WorkflowNodeData {
  label: string;
  nodeType: WorkflowNodeType;
  description?: string;
  
  // Start node
  senderId?: string;
  schedule?: WorkflowSchedule;
  
  // Email node
  templateStage?: number; // 1 to 7 or custom
  customSubject?: string;
  customBody?: string;
  useCustomTemplate?: boolean;
  
  // Wait node
  waitDuration?: number;
  waitUnit?: 'days' | 'hours';
  
  // Condition node
  conditionType?: ConditionEvaluationType;
  conditionValue?: string;
  
  // Manual Task node
  taskTitle?: string;
  taskDescription?: string;
  taskDueDateOffsetDays?: number;
  taskPriority?: 'low' | 'medium' | 'high';
  
  // LinkedIn nodes
  messageText?: string;
  comingSoon?: boolean;

  [key: string]: unknown;
}

export interface WorkflowNodeItem {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdgeItem {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: string;
  animated?: boolean;
}

export interface CampaignWorkflow {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  created_date?: string;
  updated_date?: string;
  nodes: WorkflowNodeItem[];
  edges: WorkflowEdgeItem[];
}

export interface LeadManualTask {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  company: string;
  campaignId?: string;
  campaignName?: string;
  nodeId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface TrackingEvent {
  id: string;
  type: 'open' | 'click';
  leadId: string;
  stage: number;
  campaign?: string;
  timestamp: string;
  targetUrl?: string;
  ip?: string;
  userAgent?: string;
}

export interface LeadTrackingStats {
  opensCount: number;
  firstOpenedDate?: string;
  lastOpenedDate?: string;
  clicksCount: number;
  firstClickedDate?: string;
  lastClickedDate?: string;
  events?: TrackingEvent[];
}

export interface ImportCandidate {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  painPoint: string;
  industry: string;
  notes: string;
  campaign: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
}

export interface StageTemplate {
  stage: number; // 1 to 7
  name: string;
  purpose: string;
  defaultGapDays: number; // Business days
  subject: string;
  bodyHtml: string;
  senderId?: string;
  senderEmail?: string;
}

export interface EmailThreadMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  snippet: string;
  bodyHtml?: string;
  bodyText?: string;
  isFromLead: boolean;
  messageIdHeader?: string;
}

export interface AppSettings {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  defaultGapDays: number;
  stageGapDays: Record<number, number>; // stage number -> business days gap
  skipWeekends: boolean;
  senderName: string;
  senderEmail: string;
  customLogoUrl?: string;
  appName?: string;
}

export interface SendLogEntry {
  id: string;
  timestamp: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  stage: number;
  status: 'sent' | 'reply_detected' | 'failed' | 'skipped';
  details: string;
}
