-- OMES sample seed for db/omes_schema.sql
-- Run after db/schema.sql + db/omes_schema.sql

do $$
declare
  v_workspace uuid;
  v_project uuid;
  v_module uuid;
begin
  select id into v_workspace from workspaces limit 1;

  if v_workspace is null then
    insert into workspaces(id, name, icon)
    values (gen_random_uuid(), 'OMES Workspace', '🏭')
    returning id into v_workspace;
  end if;

  insert into projects (
    workspace_id, project_code, project_name, customer, industry,
    pm_owner, start_date, end_date, status, priority, project_phase,
    bac_budget, pv, ev, ac, cpi, spi, overall_health, notes
  ) values (
    v_workspace, 'OMES-PRT-001', 'OMES Printing Pilot', 'An Phat Print', 'Packaging',
    'Ms Trang', '2026-04-01', '2026-08-30', 'In Progress', 'High', 'Printing',
    120000, 56000, 51000, 54000, 0.9444, 0.9107, 'orange', 'Pilot line with real-time work order sync'
  ) returning id into v_project;

  insert into modules (
    project_id, module_name, owner, status, planned_progress, actual_progress,
    start_date, due_date, uat_status, bug_count, release_status, notes
  ) values (
    v_project, 'Work Order Management', 'Ms Trang', 'Doing', 65, 59,
    '2026-04-05', '2026-07-01', 'Pending', 6, 'Not Ready', 'Needs route optimization for shift split'
  ) returning id into v_module;

  insert into issues (
    issue_code, project_id, module_id, issue_type, description, severity, priority,
    owner, reporter, due_date, sla_target_hours, response_time_hours, status,
    root_cause, countermeasure
  ) values (
    'ISS-001', v_project, v_module, 'Integration Issue', 'ERP queue duplicates work order status updates',
    'Critical', 'P1', 'Mr Khoa', 'Ms Trang', '2026-05-03', 24, 30, 'SLA Breached',
    'No idempotency key on callback', 'Add dedupe and ack strategy'
  );

  insert into risks (
    risk_code, project_id, risk_group, description, probability, impact,
    risk_score, risk_level, owner, mitigation_plan, due_date, status
  ) values (
    'RISK-001', v_project, 'Integration', 'ERP not synchronized with production states',
    5, 5, 25, 'Very High', 'Mr Khoa', 'CDC reconciliation and replay mechanism', '2026-05-04', 'Mitigating'
  );

  insert into sla_requests (
    request_code, project_id, customer, request_type, request_date_time,
    first_response_date_time, target_sla_hours, actual_response_time_hours,
    sla_status, owner, escalation_level, notes
  ) values (
    'REQ-001', v_project, 'An Phat Print', 'Critical bug fix', now(),
    now() + interval '28 hours', 24, 28,
    'Breached', 'Ms Trang', 2, 'Escalated to PMO and Tech Lead'
  );

  insert into monthly_reports (
    month, project_id, planned_progress, actual_progress, bac, pv, ev, ac, cpi, spi,
    risk_summary, resource_gap, issues_summary, next_month_plan, recommendations
  ) values (
    '2026-04', v_project, 47, 43, 120000, 56000, 51000, 54000, 0.9444, 0.9107,
    'Key risks under active mitigation', 'Need 1 QA + 1 backend', 'Focus on integration defects',
    'Close critical issues and freeze release scope', 'Prioritize SLA and integration stabilization'
  );
end $$;
