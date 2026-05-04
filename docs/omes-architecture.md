# OMES Platform Architecture (Dedicated Domain + WorkBase)

## 1. Revised Architecture

### Layer A: OMES Domain (Structured)
- Projects
- Project phases / timeline
- Module management
- Risk management
- SLA management
- Resource allocation
- Reports
- Executive dashboard

All entities above use fixed, structured schema and dedicated custom screens.

### Layer B: WorkBase Module (Reusable Dynamic Table)
- Purpose-limited to work/task tracking only:
  - Tasks
  - Daily Updates
  - Issues
  - Action Items
- Reuses existing base-table capabilities:
  - Inline editing
  - Dynamic fields
  - Search / filter / sort
  - Grid / Kanban / Gallery
  - Bulk delete
  - Add field / hide column

WorkBase is embedded inside project detail Work tab and Work Management screen.

## 2. Database Schema (Logical)

### Core OMES Structured Models
- User
- Role
- Project
- ProjectPhase
- OMESModule
- Task
- DailyUpdate
- Issue
- ActionItem
- Risk
- SLARequest
- ResourceAllocation
- Report
- Attachment
- Comment
- AuditLog

### Dynamic WorkBase Models
- WorkBase
- WorkTable
- WorkField
- WorkRecord
- WorkCell
- WorkView

### Implemented Schema Artifacts
- Prisma: prisma/schema.prisma
- SQL: db/omes_schema.sql
- Seed SQL: db/omes_seed.sql
- Seed TS: prisma/seed.ts

## 3. Page Structure

- /omes (Executive dashboard)
- /omes/projects (Project overview cards)
- /omes/projects/[projectId] (Project detail with tabs)
  - Tabs: Overview, Work, Modules, Timeline, Risks, SLA, Resources, Reports, Documents
- /omes/work (Global Work Management using WorkBase)
- /omes/modules (Module board)
- /omes/timeline (Gantt-style phase timeline)
- /omes/risks (Risk matrix)
- /omes/sla (SLA dashboard)
- /omes/resources (Resource allocation)
- /omes/reports (Weekly/monthly/health/risk/SLA/resource reports)

## 4. Component Structure

### WorkBase
- components/workbase/workbase.tsx
- components/workbase/workbase-shell.tsx

### OMES Custom UI
- components/omes/executive-dashboard-page.tsx
- components/omes/project-overview-page.tsx
- components/omes/project-detail-page.tsx
- components/omes/modules-board-page.tsx
- components/omes/timeline-page.tsx
- components/omes/risk-matrix-page.tsx
- components/omes/sla-dashboard-page.tsx
- components/omes/resource-allocation-page.tsx
- components/omes/reports-page.tsx
- components/omes/work-management-page.tsx

## 5. API Design

### OMES Domain APIs
- GET/POST /api/omes/projects
- GET /api/omes/projects/overview
- GET /api/omes/projects/[id]
- GET/POST /api/omes/modules
- GET /api/omes/timeline
- GET/POST /api/omes/risks
- GET/POST /api/omes/sla
- GET /api/omes/sla/dashboard
- GET/POST /api/omes/resources
- GET /api/omes/monthly-reports
- GET /api/omes/dashboard

### WorkBase Bootstrap API
- GET /api/omes/workbase?projectId=<id>
  - Ensures a project-specific WorkBase exists
  - Ensures 4 required tables: Tasks, Daily Updates, Issues, Action Items
  - Returns table IDs for embedding WorkBase

## 6. Seed Data

- OMES project/module/risk/sla/resource seeds in lib/omes-mock.ts
- SQL seed in db/omes_seed.sql
- Prisma seed in prisma/seed.ts

## 7. Implementation Plan

1. Freeze WorkBase contract and keep all dynamic behaviors isolated to Work tables.
2. Incrementally replace mock OMES APIs with Prisma-backed repositories.
3. Add Auth.js/JWT role context and enforce RBAC in OMES APIs and UI action guards.
4. Add document storage integration for Documents tab (attachments/comments).
5. Add export services (PDF/XLSX) for report sections.
6. Add realtime strategy:
   - Structured domain: event-based updates per module/project
   - WorkBase: existing table realtime/polling
7. Add end-to-end tests for project detail tabs and WorkBase workflows.
