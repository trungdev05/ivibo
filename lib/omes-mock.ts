import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ActivityLog,
  DailyUpdate,
  DocType,
  Issue,
  MonthlyReport,
  OmesModule,
  OmesProject,
  OmesTask,
  PersonalTask,
  PersonalTaskStatus,
  ProjectDocument,
  ProjectMilestone,
  Requirement,
  RequirementStatus,
  RequirementType,
  Resource,
  Risk,
  SlaRequest,
  AppNotification,
  ProjectComment,
  TaskComment,
  TaskCommentAttachment,
  TaskPriority,
  TaskStatus,
} from './omes-types';
import type { GlobalRole, ModuleCode } from './platform-types';

export type OmesUserStatus = 'active' | 'inactive' | 'invited';

export interface OmesUser {
  id: string;
  name: string;
  email: string;
  role: string;           // job title / functional role
  globalRole: GlobalRole;
  department: string;
  phone?: string;
  avatarUrl?: string;
  status: OmesUserStatus;
  createdAt: string;
  lastLogin?: string;
}

export interface UserModuleOverride {
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

type OmesDb = {
  projects: OmesProject[];
  modules: OmesModule[];
  dailyUpdates: DailyUpdate[];
  issues: Issue[];
  risks: Risk[];
  resources: Resource[];
  slaRequests: SlaRequest[];
  monthlyReports: MonthlyReport[];
  requirements: Requirement[];
  documents: ProjectDocument[];
  activityLog: ActivityLog[];
  milestones: ProjectMilestone[];
  tasks: OmesTask[];
  personalTasks: PersonalTask[];
  notifications: AppNotification[];
  projectComments: ProjectComment[];
  users: OmesUser[];
  userModuleOverrides: UserModuleOverride[];
};

const PROJECT_IDS = {
  printingPilot: '71401b3a-2136-469e-b3b2-9ae51332a745',
  warehouse: '7f8d1f11-2b6e-4d76-a2a2-8f3a4f0d2101',
  equipment: 'e6f2af1d-8f0b-4c3c-9132-5a3e6608bb21',
  dashboard: '2cb98f29-8c93-4e5d-ae52-d8f4b8d29c37',
  erp: 'cb903c4c-c92f-4a7e-8f0a-4dbaf6fd4f5a',
} as const;

export const OMES_USERS: OmesUser[] = [
  { id: 'u1',  name: 'Mr Dũng',   email: 'dung@company.com',   role: 'Project Manager',    globalRole: 'manager',     department: 'PMO',       status: 'active', createdAt: '2025-01-01T00:00:00Z', lastLogin: '2026-05-01T08:00:00Z' },
  { id: 'u2',  name: 'Ms Trang',  email: 'trang@company.com',  role: 'Business Analyst',   globalRole: 'employee',    department: 'PMO',       status: 'active', createdAt: '2025-01-01T00:00:00Z', lastLogin: '2026-05-01T09:00:00Z' },
  { id: 'u3',  name: 'Mr Khoa',   email: 'khoa@company.com',   role: 'Developer',          globalRole: 'employee',    department: 'Engineering', status: 'active', createdAt: '2025-02-01T00:00:00Z', lastLogin: '2026-05-01T10:00:00Z' },
  { id: 'u4',  name: 'Ms Vy',     email: 'vy@company.com',     role: 'QA Engineer',        globalRole: 'employee',    department: 'QA',        status: 'active', createdAt: '2025-02-01T00:00:00Z', lastLogin: '2026-04-30T17:00:00Z' },
  { id: 'u5',  name: 'Mr Hùng',   email: 'hung@company.com',   role: 'Developer',          globalRole: 'employee',    department: 'Engineering', status: 'active', createdAt: '2025-03-01T00:00:00Z', lastLogin: '2026-05-01T11:00:00Z' },
  { id: 'u6',  name: 'Ms Linh',   email: 'linh@company.com',   role: 'Designer',           globalRole: 'employee',    department: 'Design',    status: 'active', createdAt: '2025-03-01T00:00:00Z', lastLogin: '2026-04-28T14:00:00Z' },
  { id: 'u7',  name: 'Mr Nam',    email: 'nam@company.com',    role: 'DevOps',             globalRole: 'employee',    department: 'Engineering', status: 'active', createdAt: '2025-04-01T00:00:00Z', lastLogin: '2026-05-01T07:00:00Z' },
  { id: 'u8',  name: 'Ms Hoa',    email: 'hoa@company.com',    role: 'Scrum Master',       globalRole: 'manager',     department: 'PMO',       status: 'active', createdAt: '2025-04-01T00:00:00Z', lastLogin: '2026-04-29T16:00:00Z' },
  { id: 'u9',  name: 'Mr Tuấn',   email: 'tuan@company.com',   role: 'Developer',          globalRole: 'employee',    department: 'Engineering', status: 'active', createdAt: '2025-05-01T00:00:00Z', lastLogin: '2026-04-27T10:00:00Z' },
  { id: 'u10', name: 'Ms Ngọc',   email: 'ngoc@company.com',   role: 'Business Analyst',   globalRole: 'employee',    department: 'PMO',       status: 'inactive', createdAt: '2025-05-01T00:00:00Z' },
  { id: 'u11', name: 'Mr Thành',  email: 'thanh@company.com',  role: 'Stakeholder',        globalRole: 'viewer',      department: 'Sales',     status: 'active', createdAt: '2025-06-01T00:00:00Z', lastLogin: '2026-04-25T09:00:00Z' },
  { id: 'u12', name: 'Ms Mai',    email: 'mai@company.com',    role: 'QA Engineer',        globalRole: 'employee',    department: 'QA',        status: 'active', createdAt: '2025-06-01T00:00:00Z', lastLogin: '2026-05-01T08:30:00Z' },
  { id: 'u13', name: 'QA Lead',   email: 'qalead@company.com', role: 'QA Lead',            globalRole: 'manager',     department: 'QA',        status: 'active', createdAt: '2025-07-01T00:00:00Z', lastLogin: '2026-04-30T18:00:00Z' },
  { id: 'u14', name: 'Admin User', email: 'admin@omes.vn',     role: 'System Admin',       globalRole: 'super_admin', department: 'IT',        status: 'active', createdAt: '2024-12-01T00:00:00Z', lastLogin: '2026-05-02T00:00:00Z' },
];

function nowIso() {
  return new Date().toISOString();
}

// ── File persistence ──────────────────────────────────────────────────────────
const DB_FILE = path.join(process.cwd(), 'data', 'omes-db.json');

function readFromFile(): OmesDb | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as OmesDb;
  } catch {
    return null;
  }
}

function persist(): void {
  const g = globalThis as unknown as { __omesDb?: OmesDb };
  if (!g.__omesDb) return;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(g.__omesDb), 'utf-8');
  } catch (e) {
    console.error('[OMES] persist error:', e);
  }
}

function healthFromScore(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score <= 0.9) return 'red';
  if (score < 1) return 'orange';
  if (score <= 1.05) return 'yellow';
  return 'green';
}

function riskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (score <= 5) return 'Low';
  if (score <= 10) return 'Medium';
  if (score <= 15) return 'High';
  return 'Very High';
}

function getDb(): OmesDb {
  const g = globalThis as unknown as { __omesDb?: OmesDb };
  if (!g.__omesDb) {
    const fromFile = readFromFile();
    if (fromFile) {
      if (!fromFile.personalTasks) fromFile.personalTasks = initPersonalTasks();
      if (!fromFile.notifications) fromFile.notifications = [];
      if (!fromFile.projectComments) fromFile.projectComments = [];
      for (const task of fromFile.tasks ?? []) {
        if (!Array.isArray(task.comments)) task.comments = [];
      }
      for (const task of fromFile.personalTasks ?? []) {
        if (!Array.isArray(task.comments)) task.comments = [];
      }
      g.__omesDb = fromFile;
      return g.__omesDb;
    }
    const projects: OmesProject[] = [
      {
        id: PROJECT_IDS.printingPilot,
        projectCode: 'OMES-PRT-001',
        projectName: 'OMES Printing Pilot',
        projectType: 'non_software',
        customer: 'An Phat Print',
        industry: 'Packaging',
        pmOwner: 'Ms Trang',
        startDate: '2026-04-01',
        endDate: '2026-08-30',
        status: 'In Progress',
        priority: 'High',
        projectPhase: 'Printing',
        bacBudget: 120000,
        pv: 56000,
        ev: 51000,
        ac: 54000,
        cpi: 0.94,
        spi: 0.91,
        overallHealth: 'orange',
        notes: 'Pilot line with real-time work order sync',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: PROJECT_IDS.warehouse,
        projectCode: 'OMES-WHS-002',
        projectName: 'OMES Warehouse Module',
        projectType: 'non_software',
        customer: 'Bao Tin Label',
        industry: 'Label',
        pmOwner: 'Mr Dũng',
        startDate: '2026-03-15',
        endDate: '2026-07-15',
        status: 'In Progress',
        priority: 'Critical',
        projectPhase: 'Finishing',
        bacBudget: 90000,
        pv: 60000,
        ev: 58000,
        ac: 62000,
        cpi: 0.94,
        spi: 0.97,
        overallHealth: 'orange',
        notes: 'Inventory traceability by lot',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: PROJECT_IDS.equipment,
        projectCode: 'OMES-EQP-003',
        projectName: 'OMES Equipment Module',
        projectType: 'software',
        customer: 'Sunrise Print',
        industry: 'Commercial',
        pmOwner: 'Mr Khoa',
        startDate: '2026-05-01',
        endDate: '2026-09-15',
        status: 'Not Started',
        priority: 'Medium',
        projectPhase: 'Design',
        bacBudget: 75000,
        pv: 10000,
        ev: 7000,
        ac: 8000,
        cpi: 0.88,
        spi: 0.7,
        overallHealth: 'red',
        notes: 'Machine maintenance and downtime data model',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: PROJECT_IDS.dashboard,
        projectCode: 'OMES-DSH-004',
        projectName: 'OMES Production Dashboard',
        projectType: 'software',
        customer: 'VinaFlex',
        industry: 'Flexible Packaging',
        pmOwner: 'Ms Vy',
        startDate: '2026-02-01',
        endDate: '2026-06-30',
        status: 'In Progress',
        priority: 'High',
        projectPhase: 'Printing',
        bacBudget: 150000,
        pv: 120000,
        ev: 124000,
        ac: 118000,
        cpi: 1.05,
        spi: 1.03,
        overallHealth: 'green',
        notes: 'OEE live dashboard and line analytics',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: PROJECT_IDS.erp,
        projectCode: 'OMES-ERP-005',
        projectName: 'OMES ERP Integration API',
        projectType: 'software',
        customer: 'Global Pack',
        industry: 'Corrugated',
        pmOwner: 'Mr Dũng',
        startDate: '2026-01-15',
        endDate: '2026-05-30',
        status: 'Delayed',
        priority: 'Critical',
        projectPhase: 'Delivery',
        bacBudget: 180000,
        pv: 160000,
        ev: 130000,
        ac: 170000,
        cpi: 0.76,
        spi: 0.81,
        overallHealth: 'red',
        notes: 'ERP async queue mismatch with work order states',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ];

    const modules: OmesModule[] = [
      {
        id: randomUUID(),
        moduleName: 'Inventory / Warehouse Module',
        relatedProjectId: projects[1].id,
        owner: 'Mr Dũng',
        status: 'Doing',
        plannedProgress: 75,
        actualProgress: 64,
        startDate: '2026-03-20',
        dueDate: '2026-06-20',
        uatStatus: 'Pending',
        bugCount: 13,
        releaseStatus: 'Not Ready',
        notes: 'Need barcode scanner stability fixes',
      },
      {
        id: randomUUID(),
        moduleName: 'Equipment Module',
        relatedProjectId: projects[2].id,
        owner: 'Mr Khoa',
        status: 'Backlog',
        plannedProgress: 20,
        actualProgress: 8,
        startDate: '2026-05-02',
        dueDate: '2026-08-10',
        uatStatus: 'Pending',
        bugCount: 2,
        releaseStatus: 'Not Ready',
        notes: 'Machine telemetry mapping in progress',
      },
      {
        id: randomUUID(),
        moduleName: 'Production Dashboard',
        relatedProjectId: projects[3].id,
        owner: 'Ms Vy',
        status: 'UAT',
        plannedProgress: 90,
        actualProgress: 88,
        startDate: '2026-02-20',
        dueDate: '2026-05-25',
        uatStatus: 'Passed',
        bugCount: 4,
        releaseStatus: 'Ready',
        notes: 'Final KPI drill-down validations',
      },
      {
        id: randomUUID(),
        moduleName: 'ERP Integration API',
        relatedProjectId: projects[4].id,
        owner: 'Ms Trang',
        status: 'Blocked',
        plannedProgress: 95,
        actualProgress: 70,
        startDate: '2026-01-20',
        dueDate: '2026-05-01',
        uatStatus: 'Failed',
        bugCount: 27,
        releaseStatus: 'Not Ready',
        notes: 'ERP side schema drift and retry storms',
      },
      {
        id: randomUUID(),
        moduleName: 'Work Order Management',
        relatedProjectId: projects[0].id,
        owner: 'Ms Trang',
        status: 'Doing',
        plannedProgress: 65,
        actualProgress: 59,
        startDate: '2026-04-05',
        dueDate: '2026-07-01',
        uatStatus: 'Pending',
        bugCount: 6,
        releaseStatus: 'Not Ready',
        notes: 'Needs route optimization for shift split',
      },
    ];

    const issues: Issue[] = [
      {
        id: randomUUID(),
        issueCode: 'ISS-001',
        projectId: projects[4].id,
        moduleId: modules[3].id,
        issueType: 'Integration Issue',
        description: 'ERP queue duplicates work order status updates',
        severity: 'Critical',
        priority: 'P1',
        owner: 'Mr Khoa',
        reporter: 'Ms Trang',
        createdDate: nowIso(),
        dueDate: '2026-05-03',
        slaTargetHours: 24,
        responseTimeHours: 30,
        status: 'SLA Breached',
        rootCause: 'No idempotency key on callback',
        countermeasure: 'Add dedupe and ack strategy',
        resolution: '',
        relatedTasks: 'DEV-245, DEV-246',
        milestoneId: null,
        linkedReqId: null,
        stepsToReproduce: '',
        expectedResult: '',
        actualResult: '',
      },
      {
        id: randomUUID(),
        issueCode: 'ISS-002',
        projectId: projects[1].id,
        moduleId: modules[0].id,
        issueType: 'Bug',
        description: 'Stock transfer UI hangs after 2000 rows',
        severity: 'High',
        priority: 'P2',
        owner: 'Ms Vy',
        reporter: 'QA Team',
        createdDate: nowIso(),
        dueDate: '2026-05-05',
        slaTargetHours: 48,
        responseTimeHours: 20,
        status: 'Doing',
        rootCause: 'Unvirtualized list rendering',
        countermeasure: 'Implement row virtualization',
        resolution: '',
        relatedTasks: 'UI-101',
        milestoneId: null,
        linkedReqId: null,
        stepsToReproduce: '1. Open Stock Transfer screen\n2. Load 2000+ rows\n3. Try to scroll',
        expectedResult: 'List scrolls smoothly',
        actualResult: 'UI hangs for 5-10 seconds',
      },
    ];

    const risks: Risk[] = [
      {
        id: randomUUID(),
        riskCode: 'RISK-001',
        projectId: projects[3].id,
        riskGroup: 'Resource',
        description: 'Chậm fix bug do QA chưa đủ người',
        probability: 4,
        impact: 4,
        riskScore: 16,
        riskLevel: 'Very High',
        owner: 'Ms Trang',
        mitigationPlan: 'Borrow QA from warehouse stream for 2 sprints',
        dueDate: '2026-05-10',
        status: 'Mitigating',
      },
      {
        id: randomUUID(),
        riskCode: 'RISK-002',
        projectId: projects[0].id,
        riskGroup: 'Scope',
        description: 'Tài liệu nghiệp vụ thay đổi giữa chừng',
        probability: 3,
        impact: 4,
        riskScore: 12,
        riskLevel: 'High',
        owner: 'Mr Dũng',
        mitigationPlan: 'Freeze BRD baseline and change-control board',
        dueDate: '2026-05-12',
        status: 'Open',
      },
      {
        id: randomUUID(),
        riskCode: 'RISK-003',
        projectId: projects[4].id,
        riskGroup: 'Integration',
        description: 'Rủi ro tích hợp ERP không đồng bộ dữ liệu',
        probability: 5,
        impact: 5,
        riskScore: 25,
        riskLevel: 'Very High',
        owner: 'Mr Khoa',
        mitigationPlan: 'CDC reconciliation and replay mechanism',
        dueDate: '2026-05-04',
        status: 'Mitigating',
      },
      {
        id: randomUUID(),
        riskCode: 'RISK-004',
        projectId: projects[1].id,
        riskGroup: 'Data',
        description: 'Thiếu dữ liệu nguồn',
        probability: 3,
        impact: 3,
        riskScore: 9,
        riskLevel: 'Medium',
        owner: 'Ms Vy',
        mitigationPlan: 'Build temporary staging adapters',
        dueDate: '2026-05-20',
        status: 'Open',
      },
      {
        id: randomUUID(),
        riskCode: 'RISK-005',
        projectId: projects[2].id,
        riskGroup: 'Customer',
        description: 'Chậm nghiệm thu do thay đổi yêu cầu khách hàng',
        probability: 4,
        impact: 3,
        riskScore: 12,
        riskLevel: 'High',
        owner: 'Mr Dũng',
        mitigationPlan: 'Milestone acceptance checklist with sign-off gate',
        dueDate: '2026-06-01',
        status: 'Open',
      },
    ];

    const resources: Resource[] = [
      {
        id: randomUUID(),
        person: 'Mr Dũng',
        role: 'Project Manager',
        projectId: projects[1].id,
        allocationType: 'Fixed',
        fullOrPartTime: 'Full-time',
        startDate: '2026-03-15',
        endDate: '2026-07-15',
        availability: 100,
        skill: 'PM, ERP',
        responsibility: 'Owner and SPOC',
        backupPerson: 'Ms Trang',
        estimatedHours: 500,
        actualHours: 280,
        hourlyRate: 50,
      },
      {
        id: randomUUID(),
        person: 'Ms Trang',
        role: 'Tech Lead',
        projectId: projects[4].id,
        allocationType: 'Shared',
        fullOrPartTime: 'Part-time',
        startDate: '2026-01-15',
        endDate: '2026-05-30',
        availability: 60,
        skill: 'Integration',
        responsibility: 'Integration architecture',
        backupPerson: 'Mr Khoa',
        estimatedHours: 400,
        actualHours: 350,
        hourlyRate: 65,
      },
      {
        id: randomUUID(),
        person: 'Mr Khoa',
        role: 'Developer',
        projectId: projects[4].id,
        allocationType: 'Fixed',
        fullOrPartTime: 'Full-time',
        startDate: '2026-01-20',
        endDate: '2026-05-30',
        availability: 100,
        skill: 'Backend, API',
        responsibility: 'Connector services',
        backupPerson: 'Ms Vy',
        estimatedHours: 600,
        actualHours: 520,
        hourlyRate: 55,
      },
      {
        id: randomUUID(),
        person: 'Ms Vy',
        role: 'QA',
        projectId: projects[3].id,
        allocationType: 'Shared',
        fullOrPartTime: 'Part-time',
        startDate: '2026-02-20',
        endDate: '2026-06-30',
        availability: 50,
        skill: 'QA automation',
        responsibility: 'UAT and release checks',
        backupPerson: 'Mr Dũng',
        estimatedHours: 300,
        actualHours: 210,
        hourlyRate: 45,
      },
    ];

    const slaRequests: SlaRequest[] = [
      {
        id: randomUUID(),
        requestCode: 'REQ-001',
        projectId: projects[4].id,
        customer: projects[4].customer,
        requestType: 'Critical bug fix',
        requestDateTime: nowIso(),
        firstResponseDateTime: new Date(Date.now() + 28 * 3600 * 1000).toISOString(),
        targetSlaHours: 24,
        actualResponseTimeHours: 28,
        slaStatus: 'Breached',
        owner: 'Ms Trang',
        escalationLevel: 2,
        notes: 'Escalated to PMO and Tech Lead',
      },
      {
        id: randomUUID(),
        requestCode: 'REQ-002',
        projectId: projects[1].id,
        customer: projects[1].customer,
        requestType: 'Data correction',
        requestDateTime: nowIso(),
        firstResponseDateTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        targetSlaHours: 48,
        actualResponseTimeHours: 8,
        slaStatus: 'Met',
        owner: 'Mr Dũng',
        escalationLevel: 0,
        notes: '',
      },
    ];

    const dailyUpdates: DailyUpdate[] = [
      {
        id: randomUUID(),
        date: '2026-04-30',
        projectId: projects[0].id,
        moduleId: modules[4].id,
        workDoneToday: 'Completed route split for finishing stage',
        planForTomorrow: 'Run performance test with 50k work orders',
        blockers: '',
        owner: 'Ms Trang',
        status: 'Done',
        relatedIssues: [issues[1].id],
        customerFeedback: 'Positive on operator screen speed',
        internalNotes: 'Need extra metrics for shift handover',
      },
      {
        id: randomUUID(),
        date: '2026-04-30',
        projectId: projects[4].id,
        moduleId: modules[3].id,
        workDoneToday: 'Investigated duplicate callback sequence',
        planForTomorrow: 'Ship dedupe middleware patch',
        blockers: 'Await ERP sandbox logs',
        owner: 'Mr Khoa',
        status: 'Blocked',
        relatedIssues: [issues[0].id],
        customerFeedback: 'Need recovery ETA',
        internalNotes: 'Escalation already triggered',
      },
    ];

    const monthlyReports: MonthlyReport[] = projects.map((p) => ({
      id: randomUUID(),
      month: '2026-04',
      projectId: p.id,
      plannedProgress: Math.min(100, Math.round((p.pv / p.bacBudget) * 100)),
      actualProgress: Math.min(100, Math.round((p.ev / p.bacBudget) * 100)),
      bac: p.bacBudget,
      pv: p.pv,
      ev: p.ev,
      ac: p.ac,
      cpi: p.cpi,
      spi: p.spi,
      riskSummary: 'Key risks under active mitigation',
      resourceGap: p.overallHealth === 'red' ? 'Need 1 QA + 1 backend' : 'No major gap',
      issuesSummary: 'Focus on integration and UAT defects',
      nextMonthPlan: 'Close critical issues and freeze release scope',
      recommendations: 'Prioritize SLA and integration stabilization',
    }));

    g.__omesDb = {
      projects,
      modules,
      dailyUpdates,
      issues,
      risks,
      resources,
      slaRequests,
      monthlyReports,
      requirements: initRequirements(),
      documents: initDocuments(),
      activityLog: [],
      milestones: initMilestones(),
      tasks: initTasks(),
      personalTasks: initPersonalTasks(),
      notifications: [],
      projectComments: [],
      users: [...OMES_USERS],
      userModuleOverrides: [],
    };
    persist();
  }
  return g.__omesDb;
}

// ── Milestones ────────────────────────────────────────────────────────────────

function initMilestones(): ProjectMilestone[] {
  const pid = PROJECT_IDS.printingPilot;
  return [
    { id: randomUUID(), projectId: pid, phase: 'Kickoff & Requirements', startDate: '2026-04-01', endDate: '2026-04-15', owner: 'Ms Trang', status: 'Done', dependencies: '', delay: false, completionPct: 100, actualDate: '2026-04-14' },
    { id: randomUUID(), projectId: pid, phase: 'System Design', startDate: '2026-04-16', endDate: '2026-05-10', owner: 'Ms Trang', status: 'Done', dependencies: 'Kickoff & Requirements', delay: false, completionPct: 100, actualDate: '2026-05-09' },
    { id: randomUUID(), projectId: pid, phase: 'Development Sprint 1', startDate: '2026-05-11', endDate: '2026-06-10', owner: 'Mr Khoa', status: 'In Progress', dependencies: 'System Design', delay: false, completionPct: 65, actualDate: '' },
    { id: randomUUID(), projectId: pid, phase: 'Development Sprint 2', startDate: '2026-06-11', endDate: '2026-07-10', owner: 'Mr Khoa', status: 'Not Started', dependencies: 'Development Sprint 1', delay: false, completionPct: 0, actualDate: '' },
    { id: randomUUID(), projectId: pid, phase: 'UAT & Acceptance', startDate: '2026-07-11', endDate: '2026-08-10', owner: 'Ms Vy', status: 'Not Started', dependencies: 'Development Sprint 2', delay: false, completionPct: 0, actualDate: '' },
    { id: randomUUID(), projectId: pid, phase: 'Go-Live', startDate: '2026-08-11', endDate: '2026-08-30', owner: 'Ms Trang', status: 'Not Started', dependencies: 'UAT & Acceptance', delay: false, completionPct: 0, actualDate: '' },
  ];
}

export function listMilestones(projectId: string): ProjectMilestone[] {
  return getDb().milestones.filter((m) => m.projectId === projectId);
}

export function upsertMilestone(projectId: string, payload: Partial<ProjectMilestone> & { phase: string }): ProjectMilestone {
  const db = getDb();
    const inferDelay = (endDate: string, status: string) => status !== 'Done' && new Date(endDate).getTime() < Date.now();
  if (payload.id) {
    const idx = db.milestones.findIndex((m) => m.id === payload.id);
    if (idx >= 0) {
      const merged = { ...db.milestones[idx], ...payload };
      db.milestones[idx] = { ...merged, delay: payload.delay ?? inferDelay(merged.endDate, merged.status) };
      persist();
      return db.milestones[idx];
    }
  }
  const item: ProjectMilestone = {
    id: randomUUID(),
    projectId,
    phase: payload.phase,
    startDate: payload.startDate ?? nowIso().slice(0, 10),
    endDate: payload.endDate ?? nowIso().slice(0, 10),
    owner: payload.owner ?? '',
    status: payload.status ?? 'Not Started',
    dependencies: payload.dependencies ?? '',
    delay: payload.delay ?? inferDelay(payload.endDate ?? nowIso().slice(0, 10), payload.status ?? 'Not Started'),
    completionPct: payload.completionPct ?? 0,
    actualDate: payload.actualDate ?? '',
  };
  db.milestones.push(item);
  persist();
  return item;
}

export function deleteMilestone(id: string): boolean {
  const db = getDb();
  const idx = db.milestones.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  db.milestones.splice(idx, 1);
  persist();
  return true;
}

// ── Requirements ───────────────────────────────────────────────────────────────

function initRequirements(): Requirement[] {
  const pid = PROJECT_IDS.printingPilot;
  return [
    { id: 'REQ-001', code: 'REQ-001', projectId: pid, title: 'Quản lý lệnh sản xuất', description: 'Hệ thống cần quản lý toàn bộ vòng đời lệnh sản xuất từ tạo mới đến hoàn thành.', type: 'Business', status: 'Approved', priority: 'High', createdBy: 'PM', createdAt: '2026-04-01', milestoneId: null, version: '1.0', changeLog: [] },
    { id: 'REQ-002', code: 'REQ-002', projectId: pid, title: 'Tích hợp với ERP', description: 'Đồng bộ dữ liệu hai chiều với hệ thống ERP hiện tại qua REST API.', type: 'Technical', status: 'In Progress', priority: 'High', createdBy: 'Tech Lead', createdAt: '2026-04-03', milestoneId: null, version: '1.0', changeLog: [] },
    { id: 'REQ-003', code: 'REQ-003', projectId: pid, title: 'Báo cáo tiến độ thời gian thực', description: 'Dashboard hiển thị OEE, tiến độ theo dây chuyền, cảnh báo sự cố.', type: 'Functional', status: 'Reviewing', priority: 'Medium', createdBy: 'PM', createdAt: '2026-04-05', milestoneId: null, version: '1.1', changeLog: [{ version: '1.1', date: '2026-04-12', by: 'PM', summary: 'Added OEE drill-down requirement' }] },
    { id: 'REQ-004', code: 'REQ-004', projectId: pid, title: 'Quản lý phân quyền người dùng', description: 'Hỗ trợ phân quyền theo vai trò: Admin, PM, Operator, Viewer.', type: 'Non-functional', status: 'Done', priority: 'Medium', createdBy: 'Tech Lead', createdAt: '2026-04-07', milestoneId: null, version: '1.0', changeLog: [] },
    { id: 'REQ-005', code: 'REQ-005', projectId: pid, title: 'Thay đổi luồng phê duyệt', description: 'Bổ sung bước phê duyệt cấp 2 từ Director cho các lệnh > 10.000 units.', type: 'Change Request', status: 'Draft', priority: 'Low', createdBy: 'Customer', createdAt: '2026-04-20', milestoneId: null, version: '1.0', changeLog: [] },
  ];
}

export function listRequirements(projectId: string): Requirement[] {
  return getDb().requirements.filter((r) => r.projectId === projectId);
}

export function upsertRequirement(projectId: string, payload: Partial<Requirement> & { title: string }): Requirement {
  const db = getDb();
  if (payload.id) {
    const idx = db.requirements.findIndex((r) => r.id === payload.id);
    if (idx >= 0) {
      db.requirements[idx] = { ...db.requirements[idx], ...payload };
      persist();
      return db.requirements[idx];
    }
  }
  const existing = db.requirements.filter((r) => r.projectId === projectId);
  const maxNum = existing.length === 0 ? 0 : Math.max(...existing.map((r) => parseInt(r.code.replace(/\D/g, '')) || 0));
  const seq = maxNum + 1;
  const code = `REQ-${String(seq).padStart(3, '0')}`;
  const newReq: Requirement = {
    id: randomUUID(),
    code,
    projectId,
    title: payload.title,
    description: payload.description ?? '',
    type: (payload.type as RequirementType) ?? 'Business',
    status: (payload.status as RequirementStatus) ?? 'Draft',
    priority: payload.priority ?? 'Medium',
    requester: payload.requester ?? payload.createdBy ?? 'PM',
    analyst: payload.analyst ?? '',
    createdBy: payload.createdBy ?? 'PM',
    createdAt: new Date().toISOString().slice(0, 10),
    approvedAt: payload.approvedAt,
    milestoneId: payload.milestoneId ?? null,
    linkedTaskIds: payload.linkedTaskIds ?? [],
    linkedTicketIds: payload.linkedTicketIds ?? [],
    linkedDocumentIds: payload.linkedDocumentIds ?? [],
    parentRequirementId: payload.parentRequirementId ?? null,
    version: payload.version ?? '1.0',
    changeLog: payload.changeLog ?? [],
  };
  db.requirements.push(newReq);
  persist();
  return newReq;
}

export function deleteRequirement(id: string): boolean {
  const db = getDb();
  const idx = db.requirements.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  db.requirements.splice(idx, 1);
  persist();
  return true;
}

// ── Documents ──────────────────────────────────────────────────────────────────

function initDocuments(): ProjectDocument[] {
  const pid = PROJECT_IDS.printingPilot;
  return [
    { id: 'd1', projectId: pid, name: 'Business Requirements Document v1.0', type: 'BRD', version: '1.0', url: '#', uploadedBy: 'PM', updatedAt: '2026-04-05' },
    { id: 'd2', projectId: pid, name: 'Software Requirements Specification', type: 'SRS', version: '1.2', url: '#', uploadedBy: 'Tech Lead', updatedAt: '2026-04-10' },
    { id: 'd3', projectId: pid, name: 'API Integration Spec v2', type: 'API Spec', version: '2.0', url: '#', uploadedBy: 'Tech Lead', updatedAt: '2026-04-15' },
    { id: 'd4', projectId: pid, name: 'Meeting Minutes - Sprint Review W1', type: 'Meeting Minutes', version: '1.0', url: '#', uploadedBy: 'PM', updatedAt: '2026-04-07' },
    { id: 'd5', projectId: pid, name: 'UAT Test Plan', type: 'UAT', version: '1.0', url: '#', uploadedBy: 'QA', updatedAt: '2026-04-20' },
  ];
}

export function listDocuments(projectId: string): ProjectDocument[] {
  return getDb().documents.filter((d) => d.projectId === projectId);
}

export function upsertDocument(projectId: string, payload: Partial<ProjectDocument> & { name: string }): ProjectDocument {
  const db = getDb();
  if (payload.id) {
    const idx = db.documents.findIndex((d) => d.id === payload.id);
    if (idx >= 0) {
      db.documents[idx] = {
        ...db.documents[idx],
        ...payload,
        lastUpdatedBy: payload.lastUpdatedBy ?? payload.uploadedBy ?? db.documents[idx].uploadedBy,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      persist();
      return db.documents[idx];
    }
  }
  const newDoc: ProjectDocument = {
    id: randomUUID(),
    code: payload.code ?? `DOC-${Math.floor(Math.random() * 900 + 100)}`,
    projectId,
    name: payload.name,
    type: (payload.type as DocType) ?? 'Other',
    version: payload.version ?? '1.0',
    url: payload.url ?? '#',
    createdBy: payload.createdBy ?? payload.uploadedBy ?? 'PM',
    lastUpdatedBy: payload.lastUpdatedBy ?? payload.uploadedBy ?? 'PM',
    createdAt: payload.createdAt ?? new Date().toISOString().slice(0, 10),
    uploadedBy: payload.uploadedBy ?? 'PM',
    updatedAt: new Date().toISOString().slice(0, 10),
    tags: payload.tags ?? [],
    linkedRequirementId: payload.linkedRequirementId ?? null,
    linkedTaskId: payload.linkedTaskId ?? null,
    linkedTicketId: payload.linkedTicketId ?? null,
    linkedMilestoneId: payload.linkedMilestoneId ?? null,
  };
  db.documents.push(newDoc);
  persist();
  return newDoc;
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  const idx = db.documents.findIndex((d) => d.id === id);
  if (idx < 0) return false;
  db.documents.splice(idx, 1);
  persist();
  return true;
}

// ── Activity Log ───────────────────────────────────────────────────────────────

export function addActivityLog(entry: Omit<ActivityLog, 'id'>): ActivityLog {
  const db = getDb();
  const log: ActivityLog = { id: randomUUID(), ...entry };
  db.activityLog.unshift(log);
  persist();
  return log;
}

export function listActivityLog(projectId: string): ActivityLog[] {
  return getDb().activityLog.filter((a) => a.projectId === projectId);
}

export function resetDb(): void {
  const g = globalThis as unknown as { __omesDb?: OmesDb };
  // Setting to undefined allows getDb() to re-seed from initTasks/initMilestones etc. on next call.
  g.__omesDb = undefined;
  const dbFile = path.join(process.cwd(), 'data', 'omes-db.json');
  try {
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  } catch { /* ignore */ }
  // Do NOT call persist() here — let getDb() re-seed and persist naturally on next request.
}

export function listProjects() {
  return [...getDb().projects];
}

export function upsertProject(payload: Partial<OmesProject>) {
  const db = getDb();
  if (payload.id) {
    const idx = db.projects.findIndex((x) => x.id === payload.id);
    if (idx >= 0) {
      db.projects[idx] = {
        ...db.projects[idx],
        ...payload,
        cpi: payload.ev && payload.ac ? payload.ev / payload.ac : db.projects[idx].cpi,
        spi: payload.ev && payload.pv ? payload.ev / payload.pv : db.projects[idx].spi,
        updatedAt: nowIso(),
      } as OmesProject;
      db.projects[idx].overallHealth = healthFromScore(Math.min(db.projects[idx].cpi, db.projects[idx].spi));
        persist();
      return db.projects[idx];
    }
  }

  const ev = payload.ev ?? 0;
  const ac = payload.ac ?? 1;
  const pv = payload.pv ?? 1;
  const cpi = ev / ac;
  const spi = ev / pv;

  const record: OmesProject = {
    id: randomUUID(),
    projectCode: payload.projectCode ?? 'OMES-NEW',
    projectName: payload.projectName ?? 'New Project',
    projectType: payload.projectType ?? 'software',
    customer: payload.customer ?? '',
    industry: payload.industry ?? '',
    pmOwner: payload.pmOwner ?? '',
    startDate: payload.startDate ?? nowIso().slice(0, 10),
    endDate: payload.endDate ?? nowIso().slice(0, 10),
    status: payload.status ?? 'Not Started',
    priority: payload.priority ?? 'Medium',
    projectPhase: payload.projectPhase ?? 'Design',
    bacBudget: payload.bacBudget ?? 0,
    pv,
    ev,
    ac,
    cpi,
    spi,
    overallHealth: healthFromScore(Math.min(cpi, spi)),
    notes: payload.notes ?? '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.projects.push(record);
    persist();
  return record;
}

function upsertGeneric<T extends { id: string }>(arr: T[], payload: Partial<T>, factory: () => T): T {
  if (payload.id) {
    const idx = arr.findIndex((x) => x.id === payload.id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...payload } as T;
        persist();
      return arr[idx];
    }
  }
  const record = factory();
  arr.push(record);
    persist();
  return record;
}

export function listModules() {
  return [...getDb().modules];
}

export function upsertModule(payload: Partial<OmesModule>) {
  return upsertGeneric(getDb().modules, payload, () => ({
    id: randomUUID(),
    moduleName: payload.moduleName ?? 'New Module',
    relatedProjectId: payload.relatedProjectId ?? '',
    owner: payload.owner ?? '',
    status: payload.status ?? 'Backlog',
    plannedProgress: payload.plannedProgress ?? 0,
    actualProgress: payload.actualProgress ?? 0,
    startDate: payload.startDate ?? nowIso().slice(0, 10),
    dueDate: payload.dueDate ?? nowIso().slice(0, 10),
    uatStatus: payload.uatStatus ?? 'Pending',
    bugCount: payload.bugCount ?? 0,
    releaseStatus: payload.releaseStatus ?? 'Not Ready',
    notes: payload.notes ?? '',
  }));
}

export function listDailyUpdates() {
  return [...getDb().dailyUpdates];
}

export function upsertDailyUpdate(payload: Partial<DailyUpdate>) {
  return upsertGeneric(getDb().dailyUpdates, payload, () => ({
    id: randomUUID(),
    date: payload.date ?? nowIso().slice(0, 10),
    projectId: payload.projectId ?? '',
    moduleId: payload.moduleId ?? null,
    workDoneToday: payload.workDoneToday ?? '',
    planForTomorrow: payload.planForTomorrow ?? '',
    blockers: payload.blockers ?? '',
    owner: payload.owner ?? '',
    status: payload.status ?? 'Doing',
    relatedIssues: payload.relatedIssues ?? [],
    customerFeedback: payload.customerFeedback ?? '',
    internalNotes: payload.internalNotes ?? '',
  }));
}

export function listIssues() {
  const db = getDb();
  const now = Date.now();
  db.issues = db.issues.map((i) => {
    const isClosed = i.status === 'Done' || i.status === 'Closed' || i.status === 'Resolved';
    const dueOver = new Date(i.dueDate).getTime() < now && !isClosed;
    const unresolved48h = now - new Date(i.createdDate).getTime() > 48 * 3600 * 1000 && !isClosed;
    const slaBreached = i.responseTimeHours > i.slaTargetHours || dueOver || unresolved48h;
    return {
      ...i,
      status: slaBreached && !isClosed ? 'SLA Breached' : i.status,
    };
  });
  return [...db.issues];
}

export function upsertIssue(payload: Partial<Issue>) {
  const db = getDb();
  if (payload.id) {
    const idx = db.issues.findIndex((i) => i.id === payload.id);
    if (idx >= 0) {
      db.issues[idx] = { ...db.issues[idx], ...payload };
      persist();
      return db.issues[idx];
    }
  }

  // Auto-compute SLA breach on creation
  const slaTargetHours = payload.slaTargetHours ?? 72;
  const responseTimeHours = payload.responseTimeHours ?? 0;
  const providedStatus = payload.status ?? 'Open';
  const isClosed = providedStatus === 'Done' || providedStatus === 'Closed' || providedStatus === 'Resolved';
  const autoStatus = (!isClosed && responseTimeHours > slaTargetHours) ? 'SLA Breached' : providedStatus;

  const item: Issue = {
    id: randomUUID(),
    issueCode: payload.issueCode ?? `ISS-${Math.floor(Math.random() * 900 + 100)}`,
    projectId: payload.projectId ?? '',
    moduleId: payload.moduleId ?? null,
    title: payload.title ?? payload.description ?? '',
    milestoneId: payload.milestoneId ?? null,
    linkedReqId: payload.linkedReqId ?? null,
    taskId: payload.taskId ?? null,
    issueType: payload.issueType ?? 'Bug',
    description: payload.description ?? '',
    severity: payload.severity ?? 'Medium',
    priority: payload.priority ?? 'P3',
    owner: payload.owner ?? '',
    reporter: payload.reporter ?? '',
    createdDate: payload.createdDate ?? nowIso(),
    dueDate: payload.dueDate ?? nowIso().slice(0, 10),
    slaTargetHours,
    responseTimeHours,
    status: autoStatus,
    rootCause: payload.rootCause ?? '',
    countermeasure: payload.countermeasure ?? '',
    resolution: payload.resolution ?? '',
    relatedTasks: payload.relatedTasks ?? '',
    environment: payload.environment ?? '',
    stepsToReproduce: payload.stepsToReproduce ?? '',
    expectedResult: payload.expectedResult ?? '',
    actualResult: payload.actualResult ?? '',
    attachmentUrls: payload.attachmentUrls ?? [],
    comments: payload.comments ?? [],
  };
  db.issues.push(item);
  persist();
  return item;
}

export function deleteIssue(id: string): boolean {
  const db = getDb();
  const idx = db.issues.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  db.issues.splice(idx, 1);
  persist();
  return true;
}

export function listResources(projectId: string): Resource[] {
  return getDb().resources.filter((r) => r.projectId === projectId);
}

/** Returns projects where a user appears as a resource (matched by email or name). */
export function getProjectsForUser(userId: string): Array<OmesProject & { resourceRole: string; resourceStatus: string }> {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];
  const matches = db.resources.filter(
    (r) => r.email === user.email || r.person === user.name,
  );
  const seen = new Set<string>();
  const result: Array<OmesProject & { resourceRole: string; resourceStatus: string }> = [];
  for (const res of matches) {
    if (seen.has(res.projectId)) continue;
    seen.add(res.projectId);
    const proj = db.projects.find((p) => p.id === res.projectId);
    if (proj) result.push({ ...proj, resourceRole: res.role ?? '', resourceStatus: res.status ?? 'Active' });
  }
  return result;
}

export function upsertResource(projectId: string, payload: Partial<Resource> & { person: string }): Resource {
  const db = getDb();
  if (payload.id) {
    const idx = db.resources.findIndex((r) => r.id === payload.id);
    if (idx >= 0) {
      db.resources[idx] = { ...db.resources[idx], ...payload };
      persist();
      return db.resources[idx];
    }
  }
  const item: Resource = {
    id: randomUUID(),
    projectId,
    person: payload.person,
    email: payload.email ?? '',
    role: payload.role ?? '',
    projectPermission: payload.projectPermission ?? 'Member',
    allocationType: payload.allocationType ?? 'Fixed',
    fullOrPartTime: payload.fullOrPartTime ?? 'Full-time',
    joinDate: payload.joinDate ?? nowIso().slice(0, 10),
    status: payload.status ?? 'Active',
    startDate: payload.startDate ?? '',
    endDate: payload.endDate ?? '',
    availability: payload.availability ?? 100,
    skill: payload.skill ?? '',
    responsibility: payload.responsibility ?? '',
    backupPerson: payload.backupPerson ?? '',
    estimatedHours: payload.estimatedHours ?? 0,
    actualHours: payload.actualHours ?? 0,
    hourlyRate: payload.hourlyRate ?? 0,
  };
  db.resources.push(item);
  persist();
  return item;
}

export function deleteResource(id: string): boolean {
  const db = getDb();
  const idx = db.resources.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  db.resources.splice(idx, 1);
  persist();
  return true;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

function initTasks(): OmesTask[] {
  const pid = PROJECT_IDS.printingPilot;
  const wid = PROJECT_IDS.warehouse;
  const eid = PROJECT_IDS.equipment;
  const did = PROJECT_IDS.dashboard;
  const erpId = PROJECT_IDS.erp;
  const now = nowIso().slice(0, 10);
  return [
    // ── OMES Printing Pilot ──────────────────────────────────────────────────
    { id: randomUUID(), code: 'TASK-001', projectId: pid, title: 'Phân tích yêu cầu nghiệp vụ', description: 'Thu thập và phân tích toàn bộ yêu cầu từ khách hàng', note: '', projectLabel: 'I-VIBO', completedAt: '2026-03-18T11:00:00', status: 'Done', priority: 'High', assignee: 'Ms Trang', reporter: 'Mr Dũng', startDate: '2026-03-18', dueDate: '2026-03-18', estimatedHours: 40, actualHours: 38, milestoneId: null, tags: ['BA', 'Requirements'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-002', projectId: pid, title: 'Thiết kế database schema', description: 'Thiết kế cấu trúc database cho module quản lý lệnh sản xuất', note: '', projectLabel: 'I-VIBO', completedAt: '2026-03-18T09:00:00', status: 'Done', priority: 'High', assignee: 'Mr Khoa', reporter: 'Ms Trang', startDate: '2026-03-18', dueDate: '2026-03-18', estimatedHours: 24, actualHours: 28, milestoneId: null, tags: ['Backend', 'Design'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-003', projectId: pid, title: 'Xây dựng REST API lệnh sản xuất', description: 'Implement các endpoint CRUD cho work order', note: 'Chờ xác nhận mapping mới', projectLabel: 'I-VIBO', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Mr Khoa', reporter: 'Ms Trang', startDate: '2026-04-21', dueDate: '2026-05-15', estimatedHours: 80, actualHours: 45, milestoneId: null, tags: ['Backend', 'API'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-004', projectId: pid, title: 'Thiết kế UI/UX màn hình operator', description: 'Wireframe và mockup cho màn hình operator dashboard', note: '', projectLabel: 'Thăng Long', completedAt: '2026-03-18T17:00:00', status: 'Done', priority: 'Medium', assignee: 'Ms Linh', reporter: 'Mr Dũng', startDate: '2026-03-18', dueDate: '2026-03-18', estimatedHours: 32, actualHours: 35, milestoneId: null, tags: ['Design', 'UI'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-005', projectId: pid, title: 'Implement ERP sync middleware', description: 'Xây dựng middleware đồng bộ dữ liệu với ERP', note: '', projectLabel: 'I-VIBO', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Mr Khoa', reporter: 'Ms Trang', startDate: '2026-05-01', dueDate: '2026-05-20', estimatedHours: 60, actualHours: 20, milestoneId: null, tags: ['Integration', 'Backend'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-006', projectId: pid, title: 'Viết test case cho work order flow', description: 'Chuẩn bị test scenario cho toàn bộ luồng lệnh sản xuất', note: '', projectLabel: 'I-VIBO', completedAt: '', status: 'Review', priority: 'Medium', assignee: 'Ms Vy', reporter: 'Ms Trang', startDate: '2026-04-25', dueDate: '2026-05-10', estimatedHours: 24, actualHours: 22, milestoneId: null, tags: ['QA', 'Testing'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-007', projectId: pid, title: 'Deploy lên môi trường staging', description: 'Cấu hình và deploy ứng dụng lên staging server', note: '', projectLabel: 'I-VIBO', completedAt: '', status: 'Todo', priority: 'Medium', assignee: 'Mr Nam', reporter: 'Mr Khoa', startDate: '2026-05-20', dueDate: '2026-05-25', estimatedHours: 16, actualHours: 0, milestoneId: null, tags: ['DevOps'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-008', projectId: pid, title: 'Tài liệu hóa API', description: 'Viết tài liệu Swagger/OpenAPI cho tất cả endpoint', note: '', projectLabel: 'I-VIBO', completedAt: '', status: 'Todo', priority: 'Low', assignee: 'Mr Khoa', reporter: 'Mr Dũng', startDate: '2026-05-15', dueDate: '2026-05-30', estimatedHours: 20, actualHours: 0, milestoneId: null, tags: ['Documentation'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-009', projectId: pid, title: 'Performance testing', description: 'Kiểm tra hiệu năng với 10,000 lệnh sản xuất đồng thời', note: 'Môi trường test chưa ổn định', projectLabel: 'I-VIBO', completedAt: '', status: 'Blocked', priority: 'High', assignee: 'Ms Vy', reporter: 'Ms Trang', startDate: '2026-05-10', dueDate: '2026-05-18', estimatedHours: 16, actualHours: 4, milestoneId: null, tags: ['QA', 'Performance'], createdAt: now, updatedAt: now },

    // ── Admin User — system-level tasks (admin@omes.vn) ─────────────────────
    { id: randomUUID(), code: 'TASK-A01', projectId: pid, title: 'Kiểm tra bảo mật hệ thống OMES Printing', description: 'Rà soát cấu hình phân quyền và audit log toàn bộ module', note: 'Ưu tiên xử lý trước go-live', projectLabel: 'Security', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Admin User', reporter: 'Admin User', startDate: '2026-04-28', dueDate: '2026-05-08', estimatedHours: 12, actualHours: 5, milestoneId: null, tags: ['Security', 'Audit'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-A02', projectId: wid, title: 'Phê duyệt cấu hình môi trường Warehouse', description: 'Review và sign-off cấu hình server, database, backup cho dự án Warehouse', note: '', projectLabel: 'Infra', completedAt: '', status: 'Todo', priority: 'High', assignee: 'Admin User', reporter: 'Mr Dũng', startDate: '2026-05-03', dueDate: '2026-05-10', estimatedHours: 8, actualHours: 0, milestoneId: null, tags: ['Infra', 'Approval'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-A03', projectId: eid, title: 'Review kiến trúc hệ thống Equipment Module', description: 'Đánh giá thiết kế kiến trúc và đưa ra phản hồi cho team kỹ thuật', note: '', projectLabel: 'Architecture', completedAt: '', status: 'Todo', priority: 'Medium', assignee: 'Admin User', reporter: 'Mr Khoa', startDate: '2026-05-05', dueDate: '2026-05-15', estimatedHours: 6, actualHours: 0, milestoneId: null, tags: ['Architecture', 'Review'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-A04', projectId: did, title: 'Ký nghiệm thu Dashboard v2.0', description: 'Kiểm tra và ký biên bản nghiệm thu phiên bản Dashboard mới', note: 'Đang chờ QA confirm', projectLabel: 'UAT', completedAt: '', status: 'Blocked', priority: 'High', assignee: 'Admin User', reporter: 'Ms Vy', startDate: '2026-05-01', dueDate: '2026-05-06', estimatedHours: 4, actualHours: 0, milestoneId: null, tags: ['UAT', 'Sign-off'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-A05', projectId: erpId, title: 'Họp steering committee dự án ERP', description: 'Chuẩn bị tài liệu và chủ trì họp ban lãnh đạo về tiến độ ERP', note: '', projectLabel: 'Governance', completedAt: '2026-04-30T16:00:00', status: 'Done', priority: 'High', assignee: 'Admin User', reporter: 'Admin User', startDate: '2026-04-29', dueDate: '2026-04-30', estimatedHours: 3, actualHours: 3, milestoneId: null, tags: ['Management', 'Steering'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-A06', projectId: pid, title: 'Theo dõi SLA vi phạm tháng 5', description: 'Tổng hợp báo cáo các yêu cầu SLA bị vi phạm và biện pháp khắc phục', note: '', projectLabel: 'SLA', completedAt: '', status: 'In Progress', priority: 'Medium', assignee: 'Admin User', reporter: 'Admin User', startDate: '2026-05-01', dueDate: '2026-05-31', estimatedHours: 10, actualHours: 2, milestoneId: null, tags: ['SLA', 'Reporting'], createdAt: now, updatedAt: now },

    // ── Mr Dũng — thêm tasks từ dự án Warehouse & ERP ───────────────────────
    { id: randomUUID(), code: 'TASK-D01', projectId: wid, title: 'Lập kế hoạch sprint Warehouse tháng 5', description: 'Xác định backlog và phân công sprint 3 cho dự án Warehouse', note: '', projectLabel: 'Planning', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Mr Dũng', reporter: 'Mr Dũng', startDate: '2026-05-01', dueDate: '2026-05-05', estimatedHours: 8, actualHours: 6, milestoneId: null, tags: ['PM', 'Sprint'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-D02', projectId: erpId, title: 'Review tiến độ ERP tháng 4', description: 'Đánh giá KPI đội và báo cáo lên ban lãnh đạo', note: '', projectLabel: 'Reporting', completedAt: '2026-04-30T17:00:00', status: 'Done', priority: 'Medium', assignee: 'Mr Dũng', reporter: 'Admin User', startDate: '2026-04-28', dueDate: '2026-04-30', estimatedHours: 5, actualHours: 5, milestoneId: null, tags: ['PM', 'Report'], createdAt: now, updatedAt: now },

    // ── Ms Trang — thêm tasks từ dự án Warehouse ────────────────────────────
    { id: randomUUID(), code: 'TASK-T01', projectId: wid, title: 'Viết BRD cho module nhập kho', description: 'Thu thập yêu cầu và soạn thảo tài liệu nghiệp vụ cho module nhập kho', note: '', projectLabel: 'Documentation', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Ms Trang', reporter: 'Mr Dũng', startDate: '2026-04-25', dueDate: '2026-05-08', estimatedHours: 20, actualHours: 12, milestoneId: null, tags: ['BA', 'BRD'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-T02', projectId: wid, title: 'Hướng dẫn demo cho khách hàng Bao Tin', description: 'Chuẩn bị kịch bản demo và hướng dẫn sử dụng cho stakeholder', note: '', projectLabel: 'Delivery', completedAt: '', status: 'Todo', priority: 'Medium', assignee: 'Ms Trang', reporter: 'Mr Dũng', startDate: '2026-05-10', dueDate: '2026-05-20', estimatedHours: 12, actualHours: 0, milestoneId: null, tags: ['Demo', 'Stakeholder'], createdAt: now, updatedAt: now },

    // ── Mr Hùng — thêm tasks từ dự án ERP ───────────────────────────────────
    { id: randomUUID(), code: 'TASK-H01', projectId: erpId, title: 'Implement ERP connector module', description: 'Xây dựng connector tích hợp ERP với hệ thống kế toán', note: '', projectLabel: 'Integration', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Mr Hùng', reporter: 'Mr Khoa', startDate: '2026-04-20', dueDate: '2026-05-10', estimatedHours: 60, actualHours: 40, milestoneId: null, tags: ['Backend', 'Integration'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-H02', projectId: erpId, title: 'Fix lỗi đồng bộ dữ liệu ERP', description: 'Sửa bug duplicate record khi sync từ ERP sang OMES', note: 'Bug #2341', projectLabel: 'Bugfix', completedAt: '', status: 'Blocked', priority: 'High', assignee: 'Mr Hùng', reporter: 'Admin User', startDate: '2026-05-02', dueDate: '2026-05-07', estimatedHours: 16, actualHours: 4, milestoneId: null, tags: ['Bugfix', 'ERP'], createdAt: now, updatedAt: now },

    // ── Ms Hoa — Scrum Master tasks ──────────────────────────────────────────
    { id: randomUUID(), code: 'TASK-HOA01', projectId: eid, title: 'Tổ chức Daily Standup Equipment team', description: 'Điều phối daily standup và ghi nhận impediment', note: '', projectLabel: 'Scrum', completedAt: '', status: 'In Progress', priority: 'Medium', assignee: 'Ms Hoa', reporter: 'Ms Hoa', startDate: '2026-05-01', dueDate: '2026-05-31', estimatedHours: 10, actualHours: 3, milestoneId: null, tags: ['Scrum', 'Ceremony'], createdAt: now, updatedAt: now },
    { id: randomUUID(), code: 'TASK-HOA02', projectId: pid, title: 'Retro Sprint 2 Printing Pilot', description: 'Tổ chức họp Retrospective và cập nhật action items', note: '', projectLabel: 'Retro', completedAt: '2026-04-29T17:00:00', status: 'Done', priority: 'Low', assignee: 'Ms Hoa', reporter: 'Ms Hoa', startDate: '2026-04-29', dueDate: '2026-04-29', estimatedHours: 2, actualHours: 2, milestoneId: null, tags: ['Scrum', 'Retro'], createdAt: now, updatedAt: now },

    // ── Mr Nam — DevOps tasks ────────────────────────────────────────────────
    { id: randomUUID(), code: 'TASK-N01', projectId: eid, title: 'Thiết lập CI/CD pipeline Equipment', description: 'Cài đặt GitHub Actions pipeline cho dự án Equipment Module', note: '', projectLabel: 'DevOps', completedAt: '', status: 'In Progress', priority: 'High', assignee: 'Mr Nam', reporter: 'Admin User', startDate: '2026-05-01', dueDate: '2026-05-12', estimatedHours: 24, actualHours: 10, milestoneId: null, tags: ['DevOps', 'CI/CD'], createdAt: now, updatedAt: now },
  ];
}

function initPersonalTasks(): PersonalTask[] {
  const now = nowIso();
  return [
    {
      id: randomUUID(),
      code: 'PT-001',
      title: 'Chuẩn bị báo cáo tuần',
      description: 'Tổng hợp các đầu việc trong tuần để gửi quản lý',
      status: 'In Progress',
      priority: 'Medium',
      ownerName: 'Ms Trang',
      dueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: 'PT-002',
      title: 'Họp nội bộ phòng dự án',
      description: 'Chuẩn bị nội dung họp và biên bản',
      status: 'Todo',
      priority: 'High',
      ownerName: 'Mr Dũng',
      dueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: 'PT-003',
      title: 'Đánh giá backlog cá nhân',
      description: 'Rà soát và ưu tiên đầu việc hàng ngày',
      status: 'Todo',
      priority: 'Low',
      ownerName: 'Mr Khoa',
      dueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: 'PT-004',
      title: 'Ký duyệt báo cáo tháng 4',
      description: 'Xem xét và phê duyệt báo cáo tiến độ tháng 4 của tất cả dự án',
      status: 'In Progress',
      priority: 'High',
      ownerName: 'Admin User',
      dueDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      code: 'PT-005',
      title: 'Chuẩn bị ngân sách Q3 cho OMES',
      description: 'Lập dự trù ngân sách quý 3 bao gồm nhân sự và hạ tầng',
      status: 'Todo',
      priority: 'Medium',
      ownerName: 'Admin User',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function listTasks(projectId: string): OmesTask[] {
  const db = getDb();
  if (!db.tasks) db.tasks = initTasks();
  return db.tasks.filter((t) => t.projectId === projectId);
}

export function upsertTask(projectId: string, payload: Partial<OmesTask> & { title: string }): OmesTask {
  const db = getDb();
  if (!db.tasks) db.tasks = initTasks();
  if (payload.id) {
    const idx = db.tasks.findIndex((t) => t.id === payload.id);
    if (idx >= 0) {
      db.tasks[idx] = { ...db.tasks[idx], ...payload, updatedAt: nowIso() };
      persist();
      return db.tasks[idx];
    }
  }
  const projectTasks = db.tasks.filter((t) => t.projectId === projectId);
  const maxNum = projectTasks.length === 0 ? 0 : Math.max(...projectTasks.map((t) => parseInt(t.code.replace(/\D/g, '')) || 0));
  const seq = maxNum + 1;
  const item: OmesTask = {
    id: randomUUID(),
    code: `TASK-${String(seq).padStart(3, '0')}`,
    projectId,
    title: payload.title,
    description: payload.description ?? '',
    note: payload.note ?? '',
    projectLabel: payload.projectLabel ?? 'I-VIBO',
    completedAt: payload.completedAt ?? '',
    status: (payload.status as TaskStatus) ?? 'Todo',
    priority: (payload.priority as TaskPriority) ?? 'Medium',
    assignee: payload.assignee ?? '',
    reporter: payload.reporter ?? '',
    startDate: payload.startDate ?? '',
    dueDate: payload.dueDate ?? nowIso().slice(0, 10),
    estimatedHours: payload.estimatedHours ?? 0,
    actualHours: payload.actualHours ?? 0,
    milestoneId: payload.milestoneId ?? null,
    tags: payload.tags ?? [],
    comments: payload.comments ?? [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.tasks.push(item);
  persist();
  return item;
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  if (!db.tasks) return false;
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  db.tasks.splice(idx, 1);
  persist();
  return true;
}

export function listPersonalTasks(ownerName: string): PersonalTask[] {
  const db = getDb();
  if (!db.personalTasks) db.personalTasks = initPersonalTasks();
  return db.personalTasks.filter((t) => t.ownerName === ownerName);
}

export function createPersonalTask(
  ownerName: string,
  payload: { title: string; description?: string; status?: PersonalTaskStatus; priority?: TaskPriority; dueDate?: string },
): PersonalTask {
  const db = getDb();
  if (!db.personalTasks) db.personalTasks = initPersonalTasks();
  const maxNum = db.personalTasks.length === 0
    ? 0
    : Math.max(...db.personalTasks.map((t) => parseInt(t.code.replace(/\D/g, '')) || 0));
  const item: PersonalTask = {
    id: randomUUID(),
    code: `PT-${String(maxNum + 1).padStart(3, '0')}`,
    title: payload.title,
    description: payload.description ?? '',
    status: payload.status ?? 'Todo',
    priority: payload.priority ?? 'Medium',
    ownerName,
    dueDate: payload.dueDate,
    comments: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.personalTasks.push(item);
  persist();
  return item;
}

export function updatePersonalTask(
  ownerName: string,
  id: string,
  payload: Partial<Pick<PersonalTask, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'comments'>>,
): PersonalTask | null {
  const db = getDb();
  if (!db.personalTasks) db.personalTasks = initPersonalTasks();
  const idx = db.personalTasks.findIndex((t) => t.id === id && t.ownerName === ownerName);
  if (idx < 0) return null;
  db.personalTasks[idx] = {
    ...db.personalTasks[idx],
    ...payload,
    updatedAt: nowIso(),
  };
  persist();
  return db.personalTasks[idx];
}

export function deletePersonalTask(ownerName: string, id: string): boolean {
  const db = getDb();
  if (!db.personalTasks) db.personalTasks = initPersonalTasks();
  const idx = db.personalTasks.findIndex((t) => t.id === id && t.ownerName === ownerName);
  if (idx < 0) return false;
  db.personalTasks.splice(idx, 1);
  persist();
  return true;
}

// ── Personal work queries (cross-project, union rule: assigned-to-me OR created-by-me) ──

export type MyTask = {
  id: string;
  code: string;
  projectId: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  reporter?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  projectCode: string;
  isPersonal: boolean;
};
export type MyTicket = Issue & { projectName: string; projectCode: string };

function isSoftwareProject(project?: OmesProject): boolean {
  if (!project) return false;
  if (project.projectType) return project.projectType === 'software';
  const code = (project.projectCode ?? '').toUpperCase();
  return code.includes('ERP') || code.includes('DSH') || code.includes('EQP');
}

export function listMyTasks(userFullName: string): MyTask[] {
  const db = getDb();
  if (!db.tasks) db.tasks = initTasks();
  const projectTasks: MyTask[] = db.tasks
    .filter((t) => t.assignee === userFullName || t.reporter === userFullName)
    .map((t) => {
      const project = db.projects.find((p) => p.id === t.projectId);
      return {
        ...t,
        projectName: project?.projectName ?? '',
        projectCode: project?.projectCode ?? '',
        isPersonal: false,
      } as MyTask;
    });

  const personalTasks: MyTask[] = listPersonalTasks(userFullName).map((t) => ({
    id: t.id,
    code: t.code,
    projectId: null,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority,
    assignee: t.ownerName,
    reporter: t.ownerName,
    dueDate: t.dueDate ?? '',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    projectName: 'Cá nhân',
    projectCode: 'CÁ NHÂN',
    isPersonal: true,
  })) as MyTask[];

  return [...projectTasks, ...personalTasks].sort((a, b) => {
    const aDue = a.dueDate || '9999-12-31';
    const bDue = b.dueDate || '9999-12-31';
    return aDue.localeCompare(bDue);
  });
}

export function listMyTickets(userFullName: string): MyTicket[] {
  const db = getDb();
  const issues = listIssues(); // auto-computes SLA Breached status
  return issues
    .filter((i) => i.owner === userFullName || i.reporter === userFullName)
    .filter((i) => {
      const project = db.projects.find((p) => p.id === i.projectId);
      return isSoftwareProject(project);
    })
    .map((i) => {
      const project = db.projects.find((p) => p.id === i.projectId);
      return { ...i, projectName: project?.projectName ?? '', projectCode: project?.projectCode ?? '' };
    });
}

export function hasMyTickets(userFullName: string) {
  const tickets = listMyTickets(userFullName);
  return {
    hasTickets: tickets.length > 0,
    ticketCount: tickets.length,
  };
}

export function canAccessTicketWorkspace(input: { fullName: string; department?: string; role?: string }) {
  const db = getDb();
  const user = OMES_USERS.find((u) => u.name === input.fullName);
  if (!user) return false;

  const assignedProjectIds = new Set(
    db.resources
      .filter((r) => r.person === user.name || (!!user.email && r.email === user.email))
      .map((r) => r.projectId),
  );

  if (assignedProjectIds.size > 0) {
    for (const pid of assignedProjectIds) {
      const p = db.projects.find((proj) => proj.id === pid);
      if (isSoftwareProject(p)) return true;
    }
  }

  // Fallback: if user already has ticket involvement, still allow access.
  return hasMyTickets(input.fullName).hasTickets;
}

export function getMyWorkSummary(userFullName: string) {
  const tasks = listMyTasks(userFullName);
  const tickets = listMyTickets(userFullName);
  const today = new Date().toISOString().slice(0, 10);

  const taskOverdue = tasks.filter((t) => {
    const closed = t.status === 'Done' || t.status === 'Cancelled';
    return !closed && t.dueDate && t.dueDate < today;
  }).length;

  const ticketOpen = tickets.filter(
    (i) => i.status === 'Open' || i.status === 'Doing' || i.status === 'In Progress' || i.status === 'Reopened',
  ).length;
  const ticketSlaBreached = tickets.filter((i) => i.status === 'SLA Breached').length;
  const ticketDone = tickets.filter(
    (i) => i.status === 'Done' || i.status === 'Closed' || i.status === 'Resolved',
  ).length;

  return {
    tasks: {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'Todo').length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      review: tasks.filter((t) => t.status === 'Review').length,
      done: tasks.filter((t) => t.status === 'Done' || t.status === 'Cancelled').length,
      blocked: tasks.filter((t) => t.status === 'Blocked').length,
      overdue: taskOverdue,
    },
    tickets: {
      total: tickets.length,
      open: ticketOpen,
      slaBreached: ticketSlaBreached,
      done: ticketDone,
    },
  };
}

export function listRisks() {
  return [...getDb().risks];
}

export function upsertRisk(payload: Partial<Risk>) {
  const prob = payload.probability ?? 1;
  const impact = payload.impact ?? 1;
  const score = prob * impact;
  return upsertGeneric(getDb().risks, payload, () => ({
    id: randomUUID(),
    riskCode: payload.riskCode ?? `RISK-${Math.floor(Math.random() * 900 + 100)}`,
    projectId: payload.projectId ?? '',
    riskGroup: payload.riskGroup ?? 'General',
    description: payload.description ?? '',
    probability: prob,
    impact,
    riskScore: score,
    riskLevel: riskLevel(score),
    owner: payload.owner ?? '',
    mitigationPlan: payload.mitigationPlan ?? '',
    dueDate: payload.dueDate ?? nowIso().slice(0, 10),
    status: payload.status ?? 'Open',
  }));
}

export function listSlaRequests() {
  return [...getDb().slaRequests];
}

export function upsertSlaRequest(payload: Partial<SlaRequest>) {
  const isBreached =
    Boolean(payload.actualResponseTimeHours) &&
    Boolean(payload.targetSlaHours) &&
    (payload.actualResponseTimeHours as number) > (payload.targetSlaHours as number);

  return upsertGeneric(getDb().slaRequests, payload, () => ({
    id: randomUUID(),
    requestCode: payload.requestCode ?? `REQ-${Math.floor(Math.random() * 900 + 100)}`,
    projectId: payload.projectId ?? '',
    customer: payload.customer ?? '',
    requestType: payload.requestType ?? '',
    requestDateTime: payload.requestDateTime ?? nowIso(),
    firstResponseDateTime: payload.firstResponseDateTime ?? nowIso(),
    targetSlaHours: payload.targetSlaHours ?? 72,
    actualResponseTimeHours: payload.actualResponseTimeHours ?? 0,
    slaStatus: (isBreached ? 'Breached' : 'Met') as SlaRequest['slaStatus'],
    owner: payload.owner ?? '',
    escalationLevel: payload.escalationLevel ?? 0,
    notes: payload.notes ?? '',
  }));
}

export function listMonthlyReports() {
  return [...getDb().monthlyReports];
}

export function getDashboard() {
  const db = getDb();
  const delayed = db.projects.filter((p) => p.status === 'Delayed').length;
  const issueList = listIssues();
  const openIssues = issueList.filter((i) => i.status !== 'Done').length;
  const openCriticalIssues = issueList.filter((i) => i.status !== 'Done' && i.severity === 'Critical').length;
  const slaBreached = db.issues.filter((i) => i.status === 'SLA Breached').length;
  const highRiskProjects = db.risks.filter((r) => r.riskLevel === 'High' || r.riskLevel === 'Very High').length;
  const resourceGap = db.resources.filter((r) => r.availability < 50).length;
  const avgCpi = db.projects.reduce((sum, p) => sum + p.cpi, 0) / Math.max(db.projects.length, 1);
  const avgSpi = db.projects.reduce((sum, p) => sum + p.spi, 0) / Math.max(db.projects.length, 1);
  const averageProjectProgress = db.projects.reduce((sum, p) => sum + (p.ev / Math.max(p.bacBudget, 1)) * 100, 0) / Math.max(db.projects.length, 1);
  const moduleCompletionRate = db.modules.reduce((sum, m) => sum + m.actualProgress, 0) / Math.max(db.modules.length, 1);
  const healthDistribution = [
    { name: 'green', value: db.projects.filter((p) => p.overallHealth === 'green').length },
    { name: 'yellow', value: db.projects.filter((p) => p.overallHealth === 'yellow').length },
    { name: 'orange', value: db.projects.filter((p) => p.overallHealth === 'orange').length },
    { name: 'red', value: db.projects.filter((p) => p.overallHealth === 'red').length },
  ];
  const monthlyTrend = db.monthlyReports.map((r) => ({ month: r.month, ev: r.ev, pv: r.pv }));

  return {
    totalProjects: db.projects.length,
    delayedProjects: delayed,
    openIssues,
    openCriticalIssues,
    slaBreached,
    highRiskProjects,
    resourceOverload: resourceGap,
    avgCpi: Number(avgCpi.toFixed(2)),
    avgSpi: Number(avgSpi.toFixed(2)),
    averageProjectProgress: Number(averageProjectProgress.toFixed(1)),
    moduleCompletionRate: Number(moduleCompletionRate.toFixed(1)),
    healthDistribution,
    projectHealth: db.projects.map((p) => ({ projectName: p.projectName, overallHealth: p.overallHealth })),
    moduleProgress: db.modules.map((m) => ({ moduleName: m.moduleName, actualProgress: m.actualProgress })),
    monthlyTrend,
  };
}

export function getProjectById(projectId: string) {
  return getDb().projects.find((p) => p.id === projectId) ?? null;
}

export function getProjectOverviewList() {
  const db = getDb();
  return db.projects.map((project) => {
    const progress = Math.min(100, Math.round((project.ev / Math.max(project.bacBudget, 1)) * 100));
    const budgetStatus = project.ac <= project.pv ? 'On budget' : 'Over budget';
    const projectRisks = db.risks.filter((r) => r.projectId === project.id);
    const riskStatus =
      projectRisks.some((r) => r.riskLevel === 'Very High') ? 'Critical' :
      projectRisks.some((r) => r.riskLevel === 'High') ? 'Watch' : 'Stable';
    const projectSla = db.slaRequests.filter((s) => s.projectId === project.id);
    const slaStatus = projectSla.some((s) => s.slaStatus === 'Breached') ? 'Breached' : 'Met';
    const latestUpdate = db.dailyUpdates
      .filter((d) => d.projectId === project.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const nextMilestone = getTimelinePhases(project.id)
      .filter((phase) => phase.status !== 'Done')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

    return {
      ...project,
      progress,
      budgetStatus,
      riskStatus,
      slaStatus,
      latestUpdate: latestUpdate?.workDoneToday ?? 'No updates yet',
      nextMilestone: nextMilestone?.phase ?? 'N/A',
    };
  });
}

export function getDefaultModuleTemplates() {
  return [
    'Work Order Management',
    'Shopfloor Tracking',
    'OEE Monitoring',
    'Inventory / Warehouse',
    'Equipment Management',
    'Production Dashboard',
    'ERP Integration API',
    'Quality & Traceability',
  ];
}

export function getModuleBoard(projectId?: string) {
  const db = getDb();
  const projectModules = projectId
    ? db.modules.filter((m) => m.relatedProjectId === projectId)
    : db.modules;

  if (!projectId) return projectModules;

  const templates = getDefaultModuleTemplates();
  return templates.map((templateName) => {
    const found = projectModules.find((m) =>
      m.moduleName.toLowerCase().includes(templateName.toLowerCase().split(' ')[0])
    );
    return (
      found ?? {
        id: `template-${projectId}-${templateName}`,
        moduleName: templateName,
        relatedProjectId: projectId,
        owner: 'Unassigned',
        status: 'Backlog' as const,
        plannedProgress: 0,
        actualProgress: 0,
        startDate: '',
        dueDate: '',
        uatStatus: 'Pending' as const,
        bugCount: 0,
        releaseStatus: 'Not Ready' as const,
        notes: '',
      }
    );
  });
}

export function getTimelinePhases(projectId: string) {
  const project = getProjectById(projectId);
  const startMs = new Date(project?.startDate ?? nowIso().slice(0, 10)).getTime();
  const endMs = new Date(project?.endDate ?? nowIso().slice(0, 10)).getTime();
  const owner = project?.pmOwner ?? 'PM';
  const totalMs = endMs - startMs;

  function phaseDate(fraction: number) {
    return new Date(startMs + totalMs * fraction).toISOString().slice(0, 10);
  }

  return [
    { phase: 'Requirement', startDate: phaseDate(0), endDate: phaseDate(0.1), owner, status: 'Done', dependencies: '-', delay: false },
    { phase: 'Design', startDate: phaseDate(0.08), endDate: phaseDate(0.22), owner, status: 'Done', dependencies: 'Requirement', delay: false },
    { phase: 'Development', startDate: phaseDate(0.2), endDate: phaseDate(0.7), owner: 'Tech Lead', status: 'In Progress', dependencies: 'Design', delay: false },
    { phase: 'SIT', startDate: phaseDate(0.65), endDate: phaseDate(0.8), owner: 'QA', status: 'Not Started', dependencies: 'Development', delay: false },
    { phase: 'UAT', startDate: phaseDate(0.78), endDate: phaseDate(0.9), owner: 'PM + Customer', status: 'Not Started', dependencies: 'SIT', delay: false },
    { phase: 'Go-live', startDate: phaseDate(0.88), endDate: phaseDate(0.95), owner: 'PMO', status: 'Not Started', dependencies: 'UAT', delay: false },
    { phase: 'Hypercare', startDate: phaseDate(0.93), endDate: phaseDate(1), owner: 'Support', status: 'Not Started', dependencies: 'Go-live', delay: false },
  ];
}

export function getProjectDetail(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) return null;

  const db = getDb();
  return {
    project,
    modules: getModuleBoard(projectId),
    timeline: getTimelinePhases(projectId),
    risks: db.risks.filter((r) => r.projectId === projectId),
    sla: db.slaRequests.filter((s) => s.projectId === projectId),
    resources: db.resources.filter((r) => r.projectId === projectId),
    reports: db.monthlyReports.filter((r) => r.projectId === projectId),
    issues: listIssues().filter((i) => i.projectId === projectId),
    dailyUpdates: db.dailyUpdates.filter((d) => d.projectId === projectId),
  };
}

export function getSlaDashboard(projectId?: string) {
  const sla = projectId ? listSlaRequests().filter((s) => s.projectId === projectId) : listSlaRequests();
  const issues = projectId ? listIssues().filter((i) => i.projectId === projectId) : listIssues();
  const open = issues.filter((i) => i.status !== 'Done');
  const criticalOpen = open.filter((i) => i.severity === 'Critical');
  const avgResponse = sla.reduce((sum, x) => sum + x.actualResponseTimeHours, 0) / Math.max(sla.length, 1);

  return {
    totalRequests: sla.length,
    openRequests: open.length,
    breachedSla: sla.filter((x) => x.slaStatus === 'Breached').length,
    averageResponseTime: Number(avgResponse.toFixed(1)),
    criticalOpenIssues: criticalOpen.length,
    requestsBySeverity: [
      { severity: 'Critical', value: issues.filter((i) => i.severity === 'Critical').length },
      { severity: 'High', value: issues.filter((i) => i.severity === 'High').length },
      { severity: 'Medium', value: issues.filter((i) => i.severity === 'Medium').length },
      { severity: 'Low', value: issues.filter((i) => i.severity === 'Low').length },
    ],
    requestsByOwner: Array.from(new Set(sla.map((x) => x.owner))).map((owner) => ({
      owner,
      value: sla.filter((x) => x.owner === owner).length,
    })),
    defaultSla: {
      Critical: '24h',
      High: '48h',
      Medium: '72h',
      Low: '5 business days',
    },
  };
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

export function listUsers(): OmesUser[] {
  return getDb().users;
}

export function getUserById(id: string): OmesUser | undefined {
  return getDb().users.find((u) => u.id === id);
}

export function upsertUser(payload: Partial<OmesUser> & { name: string; email: string }): OmesUser {
  const db = getDb();
  if (payload.id) {
    const idx = db.users.findIndex((u) => u.id === payload.id);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], ...payload };
      persist();
      return db.users[idx];
    }
  }
  const item: OmesUser = {
    id: randomUUID(),
    name: payload.name,
    email: payload.email,
    role: payload.role ?? 'Employee',
    globalRole: payload.globalRole ?? 'employee',
    department: payload.department ?? '',
    phone: payload.phone,
    avatarUrl: payload.avatarUrl,
    status: payload.status ?? 'active',
    createdAt: nowIso(),
  };
  db.users.push(item);
  persist();
  return item;
}

export function deleteUser(id: string): boolean {
  const db = getDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx < 0) return false;
  db.users.splice(idx, 1);
  persist();
  return true;
}

// ── User module permission overrides ─────────────────────────────────────────

export function getUserModuleOverrides(userId: string): UserModuleOverride[] {
  return getDb().userModuleOverrides.filter((o) => o.userId === userId);
}

export function setUserModuleOverride(override: UserModuleOverride): UserModuleOverride {
  const db = getDb();
  const idx = db.userModuleOverrides.findIndex(
    (o) => o.userId === override.userId && o.moduleCode === override.moduleCode,
  );
  if (idx >= 0) {
    db.userModuleOverrides[idx] = override;
  } else {
    db.userModuleOverrides.push(override);
  }
  persist();
  return override;
}

export function deleteUserModuleOverride(userId: string, moduleCode: string): boolean {
  const db = getDb();
  const idx = db.userModuleOverrides.findIndex(
    (o) => o.userId === userId && o.moduleCode === moduleCode,
  );
  if (idx < 0) return false;
  db.userModuleOverrides.splice(idx, 1);
  persist();
  return true;
}

// ── Task comment + mention notifications ─────────────────────────────────────

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase();
}

export function listTaskCommentsById(taskId: string): TaskComment[] {
  const db = getDb();
  const projectTask = db.tasks.find((t) => t.id === taskId);
  if (projectTask) return projectTask.comments ?? [];
  const personalTask = db.personalTasks.find((t) => t.id === taskId);
  if (personalTask) return personalTask.comments ?? [];
  return [];
}

export function extractMentionedUserIds(content: string): string[] {
  const normalized = normalizeText(content);
  const users = listUsers().filter((u) => u.status === 'active');
  const ids = users
    .filter((u) => normalized.includes(`@${normalizeText(u.name)}`))
    .map((u) => u.id);
  return unique(ids);
}

export function addTaskCommentById(input: {
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentionUserIds?: string[];
  attachments?: TaskCommentAttachment[];
}): { comment: TaskComment; projectId?: string; taskCode?: string; title?: string } | null {
  const db = getDb();
  const comment: TaskComment = {
    id: randomUUID(),
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    createdAt: nowIso(),
    mentionUserIds: unique(input.mentionUserIds ?? []),
    attachments: input.attachments ?? [],
  };

  const projectTaskIdx = db.tasks.findIndex((t) => t.id === input.taskId);
  if (projectTaskIdx >= 0) {
    const current = db.tasks[projectTaskIdx].comments ?? [];
    db.tasks[projectTaskIdx].comments = [...current, comment];
    db.tasks[projectTaskIdx].updatedAt = nowIso();
    persist();
    return {
      comment,
      projectId: db.tasks[projectTaskIdx].projectId,
      taskCode: db.tasks[projectTaskIdx].code,
      title: db.tasks[projectTaskIdx].title,
    };
  }

  const personalTaskIdx = db.personalTasks.findIndex((t) => t.id === input.taskId);
  if (personalTaskIdx >= 0) {
    const current = db.personalTasks[personalTaskIdx].comments ?? [];
    db.personalTasks[personalTaskIdx].comments = [...current, comment];
    db.personalTasks[personalTaskIdx].updatedAt = nowIso();
    persist();
    return {
      comment,
      taskCode: db.personalTasks[personalTaskIdx].code,
      title: db.personalTasks[personalTaskIdx].title,
    };
  }

  return null;
}

export function createMentionNotifications(input: {
  actorName: string;
  actorId: string;
  taskId: string;
  taskCode?: string;
  taskTitle?: string;
  projectId?: string;
  content: string;
  mentionedUserIds: string[];
}) {
  const db = getDb();
  if (!db.notifications) db.notifications = [];
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const message = input.content.length > 140 ? `${input.content.slice(0, 140)}...` : input.content;

  for (const userId of unique(input.mentionedUserIds)) {
    if (userId === input.actorId) continue;
    const target = usersById.get(userId);
    if (!target || target.status !== 'active') continue;
    db.notifications.push({
      id: randomUUID(),
      type: 'mention',
      userId,
      userName: target.name,
      title: `${input.actorName} đã tag bạn`,
      message,
      createdAt: nowIso(),
      unread: true,
      actorName: input.actorName,
      taskId: input.taskId,
      taskCode: input.taskCode,
      projectId: input.projectId,
      link: `/work?taskId=${input.taskId}&openTab=comments`,
    });
  }
  persist();
}

export function listNotificationsForUser(userId: string, opts?: { unreadOnly?: boolean; limit?: number }): AppNotification[] {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
  let items = (db.notifications ?? [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts?.unreadOnly) items = items.filter((n) => n.unread);
  return items.slice(0, limit);
}

export function markNotificationRead(userId: string, id: string): boolean {
  const db = getDb();
  const idx = (db.notifications ?? []).findIndex((n) => n.id === id && n.userId === userId);
  if (idx < 0) return false;
  db.notifications[idx].unread = false;
  persist();
  return true;
}

export function markAllNotificationsRead(userId: string): number {
  const db = getDb();
  let count = 0;
  for (const n of db.notifications ?? []) {
    if (n.userId === userId && n.unread) {
      n.unread = false;
      count += 1;
    }
  }
  if (count > 0) persist();
  return count;
}

// ── Project Comments ──────────────────────────────────────────────────────────

export function listProjectComments(projectId: string): ProjectComment[] {
  const db = getDb();
  if (!db.projectComments) db.projectComments = [];
  return db.projectComments
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addProjectComment(input: {
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentionUserIds: string[];
}): ProjectComment {
  const db = getDb();
  if (!db.projectComments) db.projectComments = [];
  const comment: ProjectComment = {
    id: randomUUID(),
    projectId: input.projectId,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    mentionUserIds: input.mentionUserIds,
    createdAt: new Date().toISOString(),
  };
  db.projectComments.push(comment);
  persist();
  return comment;
}

