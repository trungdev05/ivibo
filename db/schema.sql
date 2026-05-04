-- ============================================================
-- Airtable-Clone / LarkBase Project Management Schema
-- PostgreSQL (Supabase)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────────
CREATE TABLE workspaces (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  icon        TEXT        DEFAULT '🏢',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- WORKSPACE MEMBERS  (Permissions)
-- ─────────────────────────────────────────────
CREATE TABLE workspace_members (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id  UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        CHECK (role IN ('owner', 'editor', 'viewer')) NOT NULL DEFAULT 'viewer',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ─────────────────────────────────────────────
-- BASES
-- ─────────────────────────────────────────────
CREATE TABLE bases (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id  UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  color         TEXT        DEFAULT '#4F46E5',
  icon          TEXT        DEFAULT '🗃️',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────
CREATE TABLE tables (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  base_id     UUID        REFERENCES bases(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- FIELDS (Columns)
-- Supported types: text | number | select | multi_select | date | checkbox | user
-- ─────────────────────────────────────────────
CREATE TABLE fields (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id    UUID        REFERENCES tables(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        CHECK (type IN (
                'text','number','select','multi_select',
                'date','checkbox','user','formula'
              )) NOT NULL DEFAULT 'text',
  -- options: { choices:[{id,name,color}], formula:'', ... }
  options     JSONB       DEFAULT '{}'::jsonb,
  position    INTEGER     DEFAULT 0,
  is_primary  BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- RECORDS (Rows)
-- ─────────────────────────────────────────────
CREATE TABLE records (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id    UUID        REFERENCES tables(id) ON DELETE CASCADE,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID        REFERENCES auth.users(id)
);

-- ─────────────────────────────────────────────
-- CELLS (Values)
-- value is JSONB for schema flexibility:
--   text       → "hello"
--   number     → 42
--   select     → "option-id"
--   multi_select → ["opt-id-1","opt-id-2"]
--   date       → "2024-01-15"
--   checkbox   → true
--   user       → "user-uuid"
-- ─────────────────────────────────────────────
CREATE TABLE cells (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  record_id   UUID        REFERENCES records(id) ON DELETE CASCADE,
  field_id    UUID        REFERENCES fields(id) ON DELETE CASCADE,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(record_id, field_id)
);

-- ─────────────────────────────────────────────
-- VIEWS
-- config stores: filters, sorts, groupBy, hiddenFields, columnWidths
-- ─────────────────────────────────────────────
CREATE TABLE views (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_id    UUID        REFERENCES tables(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        CHECK (type IN ('table','kanban','gallery')) NOT NULL DEFAULT 'table',
  config      JSONB       DEFAULT '{
    "filters": [],
    "sorts": [],
    "groupByFieldId": null,
    "hiddenFields": [],
    "columnWidths": {}
  }'::jsonb,
  position    INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields            ENABLE ROW LEVEL SECURITY;
ALTER TABLE records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells             ENABLE ROW LEVEL SECURITY;
ALTER TABLE views             ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "workspace_select" ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspace_insert" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_update" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "workspace_delete" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- workspace_members policies
CREATE POLICY "member_select" ON workspace_members FOR SELECT
  USING (user_id = auth.uid() OR workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "member_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

-- Helper function: check if user has access to workspace
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM workspaces WHERE owner_id = auth.uid()
  UNION
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Bases policies
CREATE POLICY "bases_select" ON bases FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "bases_modify" ON bases FOR ALL
  USING (workspace_id IN (SELECT user_workspace_ids()));

-- Tables policies
CREATE POLICY "tables_select" ON tables FOR SELECT
  USING (base_id IN (SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())));

CREATE POLICY "tables_modify" ON tables FOR ALL
  USING (base_id IN (SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())));

-- Fields policies
CREATE POLICY "fields_select" ON fields FOR SELECT
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

CREATE POLICY "fields_modify" ON fields FOR ALL
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

-- Records policies
CREATE POLICY "records_select" ON records FOR SELECT
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

CREATE POLICY "records_modify" ON records FOR ALL
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

-- Cells policies
CREATE POLICY "cells_select" ON cells FOR SELECT
  USING (record_id IN (SELECT id FROM records WHERE table_id IN (
    SELECT id FROM tables WHERE base_id IN (
      SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
    )
  )));

CREATE POLICY "cells_modify" ON cells FOR ALL
  USING (record_id IN (SELECT id FROM records WHERE table_id IN (
    SELECT id FROM tables WHERE base_id IN (
      SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
    )
  )));

-- Views policies
CREATE POLICY "views_select" ON views FOR SELECT
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

CREATE POLICY "views_modify" ON views FOR ALL
  USING (table_id IN (SELECT id FROM tables WHERE base_id IN (
    SELECT id FROM bases WHERE workspace_id IN (SELECT user_workspace_ids())
  )));

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
CREATE INDEX idx_bases_workspace      ON bases(workspace_id);
CREATE INDEX idx_tables_base          ON tables(base_id);
CREATE INDEX idx_fields_table         ON fields(table_id);
CREATE INDEX idx_records_table        ON records(table_id);
CREATE INDEX idx_cells_record         ON cells(record_id);
CREATE INDEX idx_cells_field          ON cells(field_id);
CREATE INDEX idx_views_table          ON views(table_id);
CREATE INDEX idx_workspace_members_ws ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_u  ON workspace_members(user_id);

-- ─────────────────────────────────────────────
-- REALTIME subscriptions (enable in Supabase dashboard or via:)
-- ─────────────────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE cells;
-- ALTER PUBLICATION supabase_realtime ADD TABLE records;
-- ALTER PUBLICATION supabase_realtime ADD TABLE fields;
