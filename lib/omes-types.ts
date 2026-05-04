export type UserRole =
  | 'admin'
  | 'pmo'
  | 'project_manager'
  | 'tech_lead'
  | 'developer'
  | 'qa'
  | 'viewer'
  | 'customer_viewer';

export type HealthColor = 'green' | 'yellow' | 'orange' | 'red';

export interface OmesProject {
  id: string;
  projectCode: string;
  projectName: string;
  projectType?: 'software' | 'non_software';
  description?: string;
  customer: string;
  industry: string;
  pmOwner: string;
  projectOwner?: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: 'Not Started' | 'In Progress' | 'On Hold' | 'Done' | 'Delayed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  projectPhase: string;
  bacBudget: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  overallHealth: HealthColor;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OmesModule {
  id: string;
  moduleName: string;
  relatedProjectId: string;
  owner: string;
  status: 'Backlog' | 'Doing' | 'UAT' | 'Done' | 'Blocked';
  plannedProgress: number;
  actualProgress: number;
  startDate: string;
  dueDate: string;
  uatStatus: 'Pending' | 'Passed' | 'Failed';
  bugCount: number;
  releaseStatus: 'Not Ready' | 'Ready' | 'Released';
  notes: string;
}

export interface DailyUpdate {
  id: string;
  date: string;
  projectId: string;
  moduleId: string | null;
  workDoneToday: string;
  planForTomorrow: string;
  blockers: string;
  owner: string;
  status: 'Done' | 'Doing' | 'Blocked';
  relatedIssues: string[];
  customerFeedback: string;
  internalNotes: string;
}

export interface Issue {
  id: string;
  issueCode: string;
  projectId: string;
  moduleId: string | null;
  title?: string;
  issueType:
    | 'Requirement Change'
    | 'Bug'
    | 'Data Issue'
    | 'Integration Issue'
    | 'Resource Issue'
    | 'Customer Dependency'
    | 'Production Blocking Issue'
    | 'Issue'
    | 'Support'
    | 'Question'
    | 'Risk-related';
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  owner: string;
  reporter: string;
  createdDate: string;
  dueDate: string;
  slaTargetHours: number;
  responseTimeHours: number;
  status: 'Open' | 'Doing' | 'Done' | 'SLA Breached' | 'In Progress' | 'Resolved' | 'Closed' | 'Reopened';
  rootCause: string;
  countermeasure: string;
  resolution: string;
  relatedTasks: string;
  taskId?: string | null;
  milestoneId: string | null;
  linkedReqId: string | null;
  environment?: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  attachmentUrls?: string[];
  comments?: Array<{ id: string; author: string; content: string; createdAt: string }>;
}

export interface Risk {
  id: string;
  riskCode: string;
  projectId: string;
  riskGroup: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  owner: string;
  mitigationPlan: string;
  dueDate: string;
  status: 'Open' | 'Mitigating' | 'Closed';
}

export interface Resource {
  id: string;
  person: string;
  email?: string;
  role: string;
  projectPermission?: 'Admin' | 'Project Manager' | 'Member' | 'Viewer' | 'Stakeholder';
  projectId: string;
  allocationType: 'Fixed' | 'Shared';
  fullOrPartTime: 'Full-time' | 'Part-time';
  joinDate?: string;
  status?: 'Active' | 'Inactive';
  startDate: string;
  endDate: string;
  availability: number;
  skill: string;
  responsibility: string;
  backupPerson: string;
  estimatedHours: number;
  actualHours: number;
  hourlyRate: number;
}

export interface SlaRequest {
  id: string;
  requestCode: string;
  projectId: string;
  customer: string;
  requestType: string;
  requestDateTime: string;
  firstResponseDateTime: string;
  targetSlaHours: number;
  actualResponseTimeHours: number;
  slaStatus: 'Met' | 'Breached';
  owner: string;
  escalationLevel: number;
  notes: string;
}

export interface MonthlyReport {
  id: string;
  month: string;
  projectId: string;
  plannedProgress: number;
  actualProgress: number;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  riskSummary: string;
  resourceGap: string;
  issuesSummary: string;
  nextMonthPlan: string;
  recommendations: string;
}

export type RequirementType = 'Business' | 'Functional' | 'Technical' | 'Non-functional' | 'Change Request';
export type RequirementStatus = 'Draft' | 'Reviewing' | 'Approved' | 'Rejected' | 'In Progress' | 'Done';

export interface ChangeLogEntry {
  version: string;
  date: string;
  by: string;
  summary: string;
}

export interface Requirement {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description: string;
  type: RequirementType;
  status: RequirementStatus;
  priority: 'High' | 'Medium' | 'Low';
  requester?: string;
  analyst?: string;
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  milestoneId: string | null;
  linkedTaskIds?: string[];
  linkedTicketIds?: string[];
  linkedDocumentIds?: string[];
  parentRequirementId?: string | null;
  version: string;
  changeLog: ChangeLogEntry[];
}

export type DocType = 'BRD' | 'SRS' | 'API Spec' | 'Design' | 'Meeting Minutes' | 'UAT' | 'Deployment' | 'Contract' | 'Other';

export interface ProjectDocument {
  id: string;
  code?: string;
  projectId: string;
  name: string;
  type: DocType;
  version: string;
  url: string;
  createdBy?: string;
  lastUpdatedBy?: string;
  createdAt?: string;
  uploadedBy: string;
  updatedAt: string;
  tags?: string[];
  linkedRequirementId?: string | null;
  linkedTaskId?: string | null;
  linkedTicketId?: string | null;
  linkedMilestoneId?: string | null;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  actor: string;
  action: string;
  module: string;
  entity: string;
  timestamp: string;
  status: string;
  notes: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TaskCommentAttachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  mentionUserIds?: string[];
  attachments?: TaskCommentAttachment[];
}

export interface ProjectComment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentionUserIds: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'mention' | 'task' | 'ticket' | 'system';
  userId: string;
  userName: string;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  actorName?: string;
  taskId?: string;
  taskCode?: string;
  projectId?: string;
  link?: string;
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Review' | 'Done' | 'Blocked' | 'Cancelled';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type PersonalTaskStatus = 'Todo' | 'In Progress' | 'Done' | 'Cancelled';

export interface OmesTask {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description?: string;
  note?: string;
  projectLabel?: string;
  completedAt?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  reporter?: string;
  startDate?: string;
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
  milestoneId?: string | null;
  tags?: string[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTask {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: PersonalTaskStatus;
  priority: TaskPriority;
  ownerName: string;
  dueDate?: string;
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  code?: string;
  projectId: string;
  phase: string;
  description?: string;
  phaseGroup?: string;
  startDate: string;
  endDate: string;
  owner: string;
  status: string;
  dependencies: string;
  delay: boolean;
  completionPct: number;
  actualDate: string;
  linkedTaskIds?: string[];
  linkedRequirementIds?: string[];
  linkedTicketIds?: string[];
}
