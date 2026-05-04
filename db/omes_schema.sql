-- OMES normalized schema extension (PostgreSQL)
-- This script can be run after db/schema.sql for local/demo setup.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  base_id uuid unique references bases(id) on delete set null,
  project_code text not null unique,
  project_name text not null,
  customer text not null,
  industry text,
  pm_owner text,
  start_date date,
  end_date date,
  status text not null default 'Not Started',
  priority text not null default 'Medium',
  project_phase text,
  bac_budget numeric(14,2) not null default 0,
  pv numeric(14,2) not null default 0,
  ev numeric(14,2) not null default 0,
  ac numeric(14,2) not null default 0,
  cpi numeric(10,4) not null default 0,
  spi numeric(10,4) not null default 0,
  overall_health text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_name text not null,
  owner text,
  status text not null default 'Backlog',
  planned_progress int not null default 0,
  actual_progress int not null default 0,
  start_date date,
  due_date date,
  uat_status text,
  bug_count int not null default 0,
  release_status text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists daily_updates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  project_id uuid not null references projects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  work_done_today text not null,
  plan_for_tomorrow text not null,
  blockers text,
  owner text not null,
  status text not null,
  related_issues jsonb,
  customer_feedback text,
  internal_notes text,
  created_at timestamptz not null default now()
);

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  issue_code text not null unique,
  project_id uuid not null references projects(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  issue_type text not null,
  description text not null,
  severity text not null,
  priority text not null,
  owner text,
  reporter text,
  created_date timestamptz not null default now(),
  due_date date,
  sla_target_hours int not null default 72,
  response_time_hours int not null default 0,
  status text not null default 'Open',
  root_cause text,
  countermeasure text,
  resolution text,
  related_tasks text
);

create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  risk_code text not null unique,
  project_id uuid not null references projects(id) on delete cascade,
  risk_group text not null,
  description text not null,
  probability int not null,
  impact int not null,
  risk_score int not null,
  risk_level text not null,
  owner text not null,
  mitigation_plan text not null,
  due_date date,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  role text not null,
  project_id uuid not null references projects(id) on delete cascade,
  allocation_type text not null,
  full_or_part_time text not null,
  start_date date,
  end_date date,
  availability int not null,
  skill text,
  responsibility text,
  backup_person text,
  created_at timestamptz not null default now()
);

create table if not exists sla_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  project_id uuid not null references projects(id) on delete cascade,
  customer text not null,
  request_type text not null,
  request_date_time timestamptz not null,
  first_response_date_time timestamptz,
  target_sla_hours int not null,
  actual_response_time_hours int not null default 0,
  sla_status text not null default 'Met',
  owner text not null,
  escalation_level int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  project_id uuid not null references projects(id) on delete cascade,
  planned_progress int not null default 0,
  actual_progress int not null default 0,
  bac numeric(14,2) not null default 0,
  pv numeric(14,2) not null default 0,
  ev numeric(14,2) not null default 0,
  ac numeric(14,2) not null default 0,
  cpi numeric(10,4) not null default 0,
  spi numeric(10,4) not null default 0,
  risk_summary text,
  resource_gap text,
  issues_summary text,
  next_month_plan text,
  recommendations text,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  content text not null,
  author text,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  table_id uuid references tables(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_workspace on projects(workspace_id);
create index if not exists idx_modules_project on modules(project_id);
create index if not exists idx_daily_project on daily_updates(project_id);
create index if not exists idx_issues_project on issues(project_id);
create index if not exists idx_risks_project on risks(project_id);
create index if not exists idx_resources_project on resources(project_id);
create index if not exists idx_sla_project on sla_requests(project_id);
create index if not exists idx_reports_project_month on monthly_reports(project_id, month);
