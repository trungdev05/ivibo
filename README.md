# BaseApp � Airtable-style Project Management

A production-ready, collaborative project management system built with Next.js 16, Supabase, and TailwindCSS. Supports spreadsheet, kanban, and gallery views with realtime collaboration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS v4 |
| State | Zustand |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Drag & Drop | @dnd-kit |

---

## Project Structure

```
app/
  (workspace)/          - All authenticated routes
    page.tsx            - Workspace home / base list
    layout.tsx          - Sidebar layout
    base/[baseId]/      - Base detail (tables list)
      table/[tableId]/  - Table editor (grid/kanban/gallery)
  api/
    workspaces/ bases/ tables/ fields/ records/ views/

components/
  layout/sidebar.tsx
  table/
    table-view.tsx      - Spreadsheet grid
    kanban-view.tsx     - Kanban board
    gallery-view.tsx    - Card gallery
    table-toolbar.tsx   - View tabs, search, filter/sort
    field-header.tsx    - Column header w/ rename, type, drag
    cell-editor.tsx     - Inline cell editors
    filter-sort-panel.tsx

store/
  workspace-store.ts
  table-store.ts

hooks/
  use-realtime-table.ts - Supabase realtime subscriptions

lib/
  types.ts  utils.ts  supabase/client.ts  supabase/server.ts

db/
  schema.sql  seed.sql
  omes_schema.sql  omes_seed.sql

prisma/
  schema.prisma
  seed.ts
```

---

## Local Setup

### 1. Create a Supabase project

1. Go to https://supabase.com and create a new project
2. In SQL Editor, run db/schema.sql
3. Optionally run db/seed.sql (replace YOUR_USER_ID)

### 2. Enable Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE cells;
ALTER PUBLICATION supabase_realtime ADD TABLE records;
ALTER PUBLICATION supabase_realtime ADD TABLE fields;
```

### 3. Configure environment

Edit .env.local:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 5. OMES Schema & Seed (optional)

For OMES portfolio modules in SQL mode:

```sql
-- Run in this order in Supabase SQL editor
\i db/schema.sql
\i db/omes_schema.sql
\i db/omes_seed.sql
```

For Prisma projects:

```bash
npm install -D prisma
npm install @prisma/client
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

---

## Features

- Grid / Kanban / Gallery views
- Dynamic fields: text, number, select, multi-select, date, checkbox, user
- Drag & drop column reordering and kanban cards
- Inline cell editing with auto-save
- Multi-condition filters (AND/OR) + multi-column sorts
- Column resizing
- Bulk record selection & delete
- Realtime collaboration via Supabase channels
- Row-level security (owner/editor/viewer roles)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/workspaces | List / create workspaces |
| GET/PATCH/DELETE | /api/workspaces/[id] | Single workspace |
| GET/POST | /api/bases | List / create bases |
| GET/PATCH/DELETE | /api/bases/[id] | Single base with tables |
| GET/PATCH/DELETE | /api/tables/[id] | Table with fields/views/records |
| POST | /api/tables | Create table |
| GET/POST | /api/fields | List / create fields |
| PATCH/DELETE | /api/fields/[id] | Update / delete field |
| POST | /api/records | Create record |
| DELETE | /api/records | Bulk delete {ids:[...]} |
| PATCH/DELETE | /api/records/[id] | Update cells / delete |
| GET/POST | /api/views | List / create views |
| PATCH/DELETE | /api/views/[id] | Update / delete view |
| GET/POST | /api/omes/projects | OMES project portfolio |
| GET/POST | /api/omes/modules | OMES module tracking |
| GET/POST | /api/omes/daily-updates | Daily PM updates |
| GET/POST | /api/omes/issues | Issue + SLA automation |
| GET/POST | /api/omes/risks | Risk management register |
| GET/POST | /api/omes/resources | Resource allocation |
| GET/POST | /api/omes/sla | SLA request tracker |
| GET | /api/omes/monthly-reports | Monthly portfolio reports |
| GET | /api/omes/dashboard | PM dashboard KPIs |

---

## Data Model

```
Workspace (1) --< (N) Base
Base      (1) --< (N) Table
Table     (1) --< (N) Field
Table     (1) --< (N) Record
Table     (1) --< (N) View
Record    (1) --< (N) Cell  (keyed by field_id, JSONB value)
```

Cell values stored as JSONB � no migrations needed when adding/removing fields.

---

## OMES Modules

Open OMES workspace at /omes:

- Projects list (portfolio with BAC, PV, EV, AC, CPI, SPI)
- OMES Modules table (status/progress/UAT/release)
- Daily updates table
- Issues & action tracking with SLA breach checks
- Risks table with risk score and risk level
- Resources table
- SLA request tracker
- Monthly reports
- Portfolio dashboard summary

RBAC is controlled via x-user-role request header and enforced in /api/omes/* routes.

## OMES Architecture Deliverable

See detailed architecture, page/component structure, API design, schema mapping, seed strategy, and implementation plan in:

- docs/omes-architecture.md
