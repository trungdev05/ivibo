/**
 * Platform-wide TypeScript types matching the new Prisma schema.
 * Each module's types are grouped by section.
 */

// ─────────────────────────────────────────────
// ENUMS / LITERALS
// ─────────────────────────────────────────────

export type GlobalRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';

export type ProjectStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_hold'
  | 'delayed'
  | 'completed'
  | 'cancelled';

export type ProjectHealth = 'green' | 'yellow' | 'red';

export type ProjectType = 'omes' | 'it' | 'erp' | 'internal' | 'generic';

export type PhaseStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'sla_breached';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskStatus = 'open' | 'mitigating' | 'closed' | 'accepted';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type AttendanceType = 'check_in' | 'check_out' | 'leave' | 'overtime';

export type OkrStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery' | 'timeline';

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'user'
  | 'url'
  | 'formula';

export type ModuleCode =
  | 'PROJECT_MANAGEMENT'
  | 'PURCHASING'
  | 'APPROVAL'
  | 'ATTENDANCE'
  | 'OKR';

// ─────────────────────────────────────────────
// CORE: Users & Org
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  departmentId?: string;
  managerId?: string;
  globalRole: GlobalRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations (optional, populated on demand)
  department?: Department;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  headId?: string;
  createdAt: string;
  children?: Department[];
  users?: User[];
}

// ─────────────────────────────────────────────
// MODULE REGISTRY
// ─────────────────────────────────────────────

export interface PlatformModule {
  id: string;
  code: ModuleCode;
  name: string;
  description?: string;
  enabled: boolean;
  icon?: string;
  order: number;
  navigationConfig?: {
    path: string;
    children?: { label: string; path: string }[];
  };
  permissionConfig?: Record<string, string[]>;
}

export interface UserModulePermission {
  id: string;
  userId: string;
  moduleCode: ModuleCode;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  canConfig: boolean;
}

// ─────────────────────────────────────────────
// PROJECT MANAGEMENT
// ─────────────────────────────────────────────

export interface CustomFieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

export interface ProjectTypeConfig {
  id: string;
  type: ProjectType;
  label: string;
  customFields?: CustomFieldDef[];
  workflowConfig?: Record<string, unknown>;
  moduleList?: string[];
  defaultPhases?: string[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: ProjectType;
  typeConfigId?: string;
  customer?: string;
  industry?: string;
  ownerId?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: Priority;
  budget: number;
  actualCost: number;
  progress: number;
  // EVM (OMES/ERP only)
  pv?: number;
  ev?: number;
  ac?: number;
  cpi?: number;
  spi?: number;
  customData?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  owner?: User;
  members?: ProjectMember[];
  phases?: ProjectPhase[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinDate?: string;
  createdAt: string;
  user?: User;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
  status: PhaseStatus;
  owner?: string;
  progress: number;
  notes?: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  priority: Priority;
  status: IssueStatus;
  assigneeId?: string;
  reporterId?: string;
  dueDate?: string;
  resolvedAt?: string;
  rootCause?: string;
  resolution?: string;
  customData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  reporter?: User;
}

export interface Risk {
  id: string;
  code: string;
  projectId: string;
  category: string;
  title: string;
  description?: string;
  probability: number;
  impact: number;
  score: number;
  level: RiskLevel;
  status: RiskStatus;
  owner?: string;
  mitigation?: string;
  contingency?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  allocationPercent: number;
  availability: number;
  startDate?: string;
  endDate?: string;
  estimatedHours: number;
  actualHours: number;
  hourlyRate: number;
  notes?: string;
  createdAt: string;
  user?: User;
}

// ─────────────────────────────────────────────
// DYNAMIC WORK TABLE
// ─────────────────────────────────────────────

export type DynamicTableType = 'tasks' | 'daily_log' | 'action_items' | 'generic';

export interface DynamicTable {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  tableType: DynamicTableType;
  position: number;
  createdAt: string;
  updatedAt: string;
  fields?: DynamicField[];
  views?: DynamicView[];
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface DynamicField {
  id: string;
  tableId: string;
  name: string;
  type: FieldType;
  options?: SelectOption[];
  isRequired: boolean;
  isSystem: boolean;
  position: number;
  createdAt: string;
}

export interface DynamicRecord {
  id: string;
  tableId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  cells?: DynamicCell[];
}

export interface DynamicCell {
  id: string;
  recordId: string;
  fieldId: string;
  value?: unknown;
  updatedAt: string;
}

export interface DynamicView {
  id: string;
  tableId: string;
  name: string;
  type: ViewType;
  config?: Record<string, unknown>;
  position: number;
  createdAt: string;
  filters?: DynamicViewFilter[];
  sorts?: DynamicViewSort[];
}

export interface DynamicViewFilter {
  id: string;
  viewId: string;
  fieldId: string;
  operator: string;
  value?: unknown;
  order: number;
}

export interface DynamicViewSort {
  id: string;
  viewId: string;
  fieldId: string;
  direction: 'asc' | 'desc';
  order: number;
}

// ─────────────────────────────────────────────
// APPROVAL MODULE
// ─────────────────────────────────────────────

export interface ApprovalWorkflowStep {
  order: number;
  approverRole: string;
  required: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  moduleCode: ModuleCode;
  entityType: string;
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  workflowId?: string;
  projectId?: string;
  requesterId: string;
  entityType: string;
  entityId?: string;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  status: ApprovalStatus;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  requester?: User;
  actions?: ApprovalAction[];
}

export interface ApprovalAction {
  id: string;
  requestId: string;
  approverId: string;
  step: number;
  action: ApprovalStatus;
  comment?: string;
  actedAt: string;
  approver?: User;
}

// ─────────────────────────────────────────────
// PURCHASING MODULE
// ─────────────────────────────────────────────

export interface PurchaseItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  projectId?: string;
  requesterId: string;
  title: string;
  description?: string;
  items: PurchaseItem[];
  totalAmount: number;
  currency: string;
  status: ApprovalStatus;
  vendor?: string;
  expectedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// ATTENDANCE MODULE
// ─────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  type: AttendanceType;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user?: User;
}

// ─────────────────────────────────────────────
// OKR MODULE
// ─────────────────────────────────────────────

export interface Objective {
  id: string;
  ownerId: string;
  departmentId?: string;
  parentId?: string;
  title: string;
  description?: string;
  period: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  status: OkrStatus;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  children?: Objective[];
  keyResults?: KeyResult[];
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  progress: number;
  status: OkrStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────

export interface Comment {
  id: string;
  authorId: string;
  entityType: string;
  entityId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface AuditLog {
  id: string;
  userId?: string;
  projectId?: string;
  entityType: string;
  entityId: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
  user?: User;
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
