-- ============================================================
-- Seed Data — sample workspace, base, table, fields, records
-- Run AFTER schema.sql in your Supabase SQL editor.
-- Replace <YOUR_USER_ID> with an actual auth.users UUID.
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID := '<YOUR_USER_ID>';  -- ← Replace this
  v_ws_id      UUID := uuid_generate_v4();
  v_base_id    UUID := uuid_generate_v4();
  v_table_id   UUID := uuid_generate_v4();
  v_f_name     UUID := uuid_generate_v4();
  v_f_status   UUID := uuid_generate_v4();
  v_f_due      UUID := uuid_generate_v4();
  v_f_done     UUID := uuid_generate_v4();
  v_f_priority UUID := uuid_generate_v4();
  v_view_grid  UUID := uuid_generate_v4();
  v_view_kb    UUID := uuid_generate_v4();
  v_view_gal   UUID := uuid_generate_v4();
  rec_ids      UUID[] := ARRAY[
    uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4(),
    uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()
  ];
BEGIN

  -- Workspace
  INSERT INTO workspaces (id, name, slug, icon, owner_id)
  VALUES (v_ws_id, 'My Workspace', 'my-workspace-seed', '🏢', v_user_id);

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_ws_id, v_user_id, 'owner');

  -- Base
  INSERT INTO bases (id, workspace_id, name, color, icon)
  VALUES (v_base_id, v_ws_id, 'Product Roadmap', '#4F46E5', '🗺️');

  -- Table
  INSERT INTO tables (id, base_id, name, position)
  VALUES (v_table_id, v_base_id, 'Tasks', 0);

  -- Fields
  INSERT INTO fields (id, table_id, name, type, position, is_primary, options) VALUES
    (v_f_name,     v_table_id, 'Task Name', 'text',     0, TRUE,  '{}'),
    (v_f_status,   v_table_id, 'Status',    'select',   1, FALSE, jsonb_build_object(
      'choices', jsonb_build_array(
        jsonb_build_object('id','todo',        'name','Todo',        'color','bg-gray-100 text-gray-700'),
        jsonb_build_object('id','in_progress', 'name','In Progress', 'color','bg-blue-100 text-blue-700'),
        jsonb_build_object('id','review',      'name','Review',      'color','bg-yellow-100 text-yellow-700'),
        jsonb_build_object('id','done',        'name','Done',        'color','bg-green-100 text-green-700')
      )
    )),
    (v_f_due,      v_table_id, 'Due Date',  'date',     2, FALSE, '{}'),
    (v_f_done,     v_table_id, 'Done',      'checkbox', 3, FALSE, '{}'),
    (v_f_priority, v_table_id, 'Priority',  'select',   4, FALSE, jsonb_build_object(
      'choices', jsonb_build_array(
        jsonb_build_object('id','low',    'name','Low',    'color','bg-gray-100 text-gray-500'),
        jsonb_build_object('id','medium', 'name','Medium', 'color','bg-orange-100 text-orange-700'),
        jsonb_build_object('id','high',   'name','High',   'color','bg-red-100 text-red-700')
      )
    ));

  -- Views
  INSERT INTO views (id, table_id, name, type, position, config) VALUES
    (v_view_grid, v_table_id, 'Grid View', 'table',   0,
      '{"filters":{"logic":"AND","conditions":[]},"sorts":[],"groupByFieldId":null,"hiddenFields":[],"columnWidths":{}}'),
    (v_view_kb,   v_table_id, 'Kanban',    'kanban',  1,
      '{"filters":{"logic":"AND","conditions":[]},"sorts":[],"groupByFieldId":null,"hiddenFields":[],"columnWidths":{}}'),
    (v_view_gal,  v_table_id, 'Gallery',   'gallery', 2,
      '{"filters":{"logic":"AND","conditions":[]},"sorts":[],"groupByFieldId":null,"hiddenFields":[],"columnWidths":{}}');

  -- Records
  INSERT INTO records (id, table_id, position, created_by) VALUES
    (rec_ids[1], v_table_id, 0, v_user_id),
    (rec_ids[2], v_table_id, 1, v_user_id),
    (rec_ids[3], v_table_id, 2, v_user_id),
    (rec_ids[4], v_table_id, 3, v_user_id),
    (rec_ids[5], v_table_id, 4, v_user_id),
    (rec_ids[6], v_table_id, 5, v_user_id);

  -- Cells
  INSERT INTO cells (record_id, field_id, value) VALUES
    (rec_ids[1], v_f_name,     '"Design system overhaul"'),
    (rec_ids[1], v_f_status,   '"in_progress"'),
    (rec_ids[1], v_f_due,      '"2024-05-15"'),
    (rec_ids[1], v_f_priority, '"high"'),
    (rec_ids[1], v_f_done,     'false'),

    (rec_ids[2], v_f_name,     '"API rate limiting"'),
    (rec_ids[2], v_f_status,   '"todo"'),
    (rec_ids[2], v_f_due,      '"2024-05-20"'),
    (rec_ids[2], v_f_priority, '"medium"'),
    (rec_ids[2], v_f_done,     'false'),

    (rec_ids[3], v_f_name,     '"User onboarding flow"'),
    (rec_ids[3], v_f_status,   '"review"'),
    (rec_ids[3], v_f_due,      '"2024-05-10"'),
    (rec_ids[3], v_f_priority, '"high"'),
    (rec_ids[3], v_f_done,     'false'),

    (rec_ids[4], v_f_name,     '"Fix login bug"'),
    (rec_ids[4], v_f_status,   '"done"'),
    (rec_ids[4], v_f_due,      '"2024-04-28"'),
    (rec_ids[4], v_f_priority, '"high"'),
    (rec_ids[4], v_f_done,     'true'),

    (rec_ids[5], v_f_name,     '"Dashboard analytics"'),
    (rec_ids[5], v_f_status,   '"todo"'),
    (rec_ids[5], v_f_due,      '"2024-06-01"'),
    (rec_ids[5], v_f_priority, '"medium"'),
    (rec_ids[5], v_f_done,     'false'),

    (rec_ids[6], v_f_name,     '"Write documentation"'),
    (rec_ids[6], v_f_status,   '"in_progress"'),
    (rec_ids[6], v_f_due,      '"2024-05-25"'),
    (rec_ids[6], v_f_priority, '"low"'),
    (rec_ids[6], v_f_done,     'false');

END $$;
