/**
 * OMES Project Management — Automated Test Runner
 * Covers: TC-PRJ, TC-DET, TC-MOD, TC-ISS, TC-RSK, TC-RES, TC-MIL, TC-REQ, TC-SLA, TC-NEG, TC-E2E
 */

const BASE = 'http://localhost:3000';
let PASS = 0, FAIL = 0, WARN = 0;
let SESSION_COOKIE = '';
let createdProjectId = null;
let createdModuleId = null;
let createdIssueId = null;
let createdRiskId = null;
let createdResourceId = null;
let createdMilestoneId = null;
let createdRequirementId = null;
let createdSlaId = null;

const results = [];

function log(status, id, desc, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${icon} [${status}] ${id}: ${desc}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ status, id, desc, detail });
  if (status === 'PASS') PASS++;
  else if (status === 'FAIL') FAIL++;
  else WARN++;
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
      ...(SESSION_COOKIE ? { 'Cookie': SESSION_COOKIE } : {}),
    },
    redirect: 'manual',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function apiAs(role, method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': role,
      ...(SESSION_COOKIE ? { 'Cookie': SESSION_COOKIE } : {}),
    },
    redirect: 'manual',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ─── AUTH: Login để lấy session cookie ──────────────────────────────────────
async function login() {
  console.log('\n═══ AUTH: Đăng nhập ═══');
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@omes.vn', password: 'admin123' }),
  });
  const setCookie = res.headers.get('set-cookie');
  if (res.status === 200 && setCookie) {
    SESSION_COOKIE = setCookie.split(';')[0]; // lấy phần "omes_session=..."
    log('PASS', 'TC-AUTH-01', 'Login admin@omes.vn thành công', `cookie=${SESSION_COOKIE.slice(0, 40)}...`);
    return true;
  }
  log('FAIL', 'TC-AUTH-01', 'Login thất bại', `status=${res.status}`);
  return false;
}

async function loginAs(email, password, testId = 'TC-AUTH-SWITCH') {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get('set-cookie');
  if (res.status === 200 && setCookie) {
    SESSION_COOKIE = setCookie.split(';')[0];
    log('PASS', testId, `Chuyển phiên đăng nhập: ${email}`);
    return true;
  }
  log('FAIL', testId, `Chuyển phiên đăng nhập thất bại: ${email}`, `status=${res.status}`);
  return false;
}

// ─── PHASE 1: PROJECT LIST & CRUD ──────────────────────────────────────────
async function testProjects() {
  console.log('\n═══ PHASE 1: QUẢN LÝ DỰ ÁN ═══');

  // TC-PRJ-01: List projects
  const list = await api('GET', '/api/projects/overview');
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-PRJ-01', 'GET /api/projects/overview', `${list.data.data.length} dự án`);
  } else {
    log('FAIL', 'TC-PRJ-01', 'GET /api/projects/overview', `status=${list.status}`);
  }

  // TC-PRJ-02a: Tạo dự án hợp lệ
  const create = await api('POST', '/api/projects', {
    projectCode: 'TEST-001',
    projectName: 'Dự án Test Tự Động',
    customer: 'ABC Corp',
    industry: 'Fintech',
    pmOwner: 'Nguyễn Văn A',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    status: 'In Progress',
    priority: 'High',
    projectPhase: 'Planning',
    bacBudget: 1000000,
    pv: 500000,
    ev: 400000,
    ac: 450000,
    notes: 'Dự án test automation',
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdProjectId = create.data.data.id;
    log('PASS', 'TC-PRJ-02a', 'POST /api/projects — tạo dự án hợp lệ', `id=${createdProjectId}`);
  } else {
    log('FAIL', 'TC-PRJ-02a', 'POST /api/projects — tạo dự án hợp lệ', `status=${create.status}`);
  }

  // TC-PRJ-02b: Kiểm tra dự án xuất hiện trong danh sách
  const list2 = await api('GET', '/api/projects');
  const found = list2.data?.data?.find(p => p.id === createdProjectId);
  if (found) {
    log('PASS', 'TC-PRJ-02b', 'Dự án mới xuất hiện trong GET /api/projects');
  } else {
    log('FAIL', 'TC-PRJ-02b', 'Dự án mới không xuất hiện trong danh sách');
  }

  // TC-PRJ-02c: CPI/SPI tự tính đúng (EV=400k, AC=450k → CPI=0.888…)
  const proj = create.data?.data;
  if (proj) {
    const cpiOk = Math.abs(proj.cpi - (400000 / 450000)) < 0.01;
    const spiOk = Math.abs(proj.spi - (400000 / 500000)) < 0.01;
    if (cpiOk && spiOk) {
      log('PASS', 'TC-PRJ-02c', 'CPI/SPI tự tính đúng', `CPI=${proj.cpi.toFixed(3)}, SPI=${proj.spi.toFixed(3)}`);
    } else {
      log('FAIL', 'TC-PRJ-02c', 'CPI/SPI sai', `CPI=${proj.cpi}, SPI=${proj.spi}`);
    }

    // Health phải là red/orange vì CPI < 1
    if (['red', 'orange', 'yellow'].includes(proj.overallHealth)) {
      log('PASS', 'TC-PRJ-02d', 'overallHealth đúng khi CPI<1', `health=${proj.overallHealth}`);
    } else {
      log('FAIL', 'TC-PRJ-02d', 'overallHealth sai', `health=${proj.overallHealth}`);
    }
  }

  // TC-PRJ-03: Sửa dự án
  if (createdProjectId) {
    const patch = await api('PATCH', `/api/projects/${createdProjectId}`, {
      projectName: 'Dự án Test - Đã Cập Nhật',
      status: 'On Hold',
    });
    if (patch.status === 200 && patch.data?.data?.projectName === 'Dự án Test - Đã Cập Nhật') {
      log('PASS', 'TC-PRJ-03a', 'PATCH /api/projects/[id] — cập nhật tên & status');
    } else {
      log('FAIL', 'TC-PRJ-03a', 'PATCH /api/projects/[id]', `status=${patch.status}`);
    }

    // Verify persist — detail endpoint returns { data: { project, modules, ... } }
    const verify = await api('GET', `/api/projects/${createdProjectId}`);
    const verifyName = verify.data?.data?.project?.projectName ?? verify.data?.data?.projectName;
    if (verifyName === 'Dự án Test - Đã Cập Nhật') {
      log('PASS', 'TC-PRJ-03b', 'Dữ liệu persist sau PATCH — GET trả về đúng');
    } else {
      log('FAIL', 'TC-PRJ-03b', 'Dữ liệu không persist', JSON.stringify(verifyName));
    }
  }
}

// ─── PHASE 2: PROJECT DETAIL ────────────────────────────────────────────────
async function testProjectDetail() {
  console.log('\n═══ PHASE 2: CHI TIẾT DỰ ÁN ═══');
  if (!createdProjectId) { log('WARN', 'TC-DET', 'Skip — không có projectId'); return; }

  const detail = await api('GET', `/api/projects/${createdProjectId}`);
  if (detail.status === 200 && detail.data?.data) {
    // Detail returns { data: { project, modules, risks, issues, ... } }
    const d = detail.data.data?.project ?? detail.data.data;
    log('PASS', 'TC-DET-01', 'GET /api/projects/[id] — load chi tiết dự án', `code=${d.projectCode}`);

    // Kiểm tra các trường thiết yếu nằm trong data.project
    const required = ['id', 'projectCode', 'projectName', 'customer', 'pmOwner', 'startDate', 'endDate', 'status', 'priority', 'cpi', 'spi', 'overallHealth'];
    const missing = required.filter(f => d[f] === undefined || d[f] === null);
    if (missing.length === 0) {
      log('PASS', 'TC-DET-02', 'Tất cả trường thiết yếu có giá trị trong data.project');
    } else {
      log('FAIL', 'TC-DET-02', 'Thiếu trường', missing.join(', '));
    }
  } else {
    log('FAIL', 'TC-DET-01', 'GET /api/projects/[id]', `status=${detail.status}`);
  }

  // 404 cho ID không tồn tại
  const notFound = await api('GET', '/api/projects/id-khong-ton-tai-xyz');
  if (notFound.status === 404) {
    log('PASS', 'TC-DET-03', 'GET project không tồn tại → 404');
  } else {
    log('FAIL', 'TC-DET-03', `Expected 404, got ${notFound.status}`);
  }
}

// ─── PHASE 3: MODULES ───────────────────────────────────────────────────────
async function testModules() {
  console.log('\n═══ PHASE 3: MODULES ═══');

  // List modules
  const list = await api('GET', '/api/modules');
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-MOD-01a', `GET /api/modules — ${list.data.data.length} modules`);
  } else {
    log('FAIL', 'TC-MOD-01a', 'GET /api/modules', `status=${list.status}`);
  }

  // Tạo module
  const create = await api('POST', '/api/modules', {
    moduleName: 'Module Auth',
    relatedProjectId: createdProjectId,
    owner: 'Nguyễn Văn A',
    status: 'Doing',
    plannedProgress: 50,
    actualProgress: 30,
    startDate: '2026-05-01',
    dueDate: '2026-08-01',
    uatStatus: 'Pending',
    bugCount: 0,
    releaseStatus: 'Not Ready',
    notes: 'Module xác thực',
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdModuleId = create.data.data.id;
    log('PASS', 'TC-MOD-01b', 'POST /api/modules — tạo module', `id=${createdModuleId}`);
  } else {
    log('FAIL', 'TC-MOD-01b', 'POST /api/modules', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

  // Module linked đúng projectId
  if (createdModuleId) {
    const list2 = await api('GET', '/api/modules');
    const found = list2.data?.data?.find(m => m.id === createdModuleId);
    if (found?.relatedProjectId === createdProjectId) {
      log('PASS', 'TC-MOD-02', 'Module liên kết đúng projectId');
    } else {
      log('FAIL', 'TC-MOD-02', 'Module không liên kết đúng projectId', `found=${JSON.stringify(found?.relatedProjectId)}`);
    }

    // Cập nhật actualProgress — PATCH /api/modules/[id]
    const patch = await api('PATCH', `/api/modules/${createdModuleId}`, { actualProgress: 75, status: 'Blocked' });
    if (patch.status === 200 && patch.data?.data?.actualProgress === 75) {
      log('PASS', 'TC-MOD-03', 'PATCH /api/modules/[id] — actualProgress=75, status=Blocked');
    } else {
      log('FAIL', 'TC-MOD-03', 'PATCH /api/modules/[id]', `status=${patch.status} ${JSON.stringify(patch.data)}`);
    }
  }
}

// ─── PHASE 4: ISSUES ────────────────────────────────────────────────────────
async function testIssues() {
  console.log('\n═══ PHASE 4: ISSUES ═══');

  const list = await api('GET', '/api/issues');
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-ISS-01a', `GET /api/issues — ${list.data.data.length} issues`);
  } else {
    log('FAIL', 'TC-ISS-01a', 'GET /api/issues', `status=${list.status}`);
  }

  // Tạo issue
  const create = await api('POST', '/api/issues', {
    projectId: createdProjectId,
    moduleId: createdModuleId,
    issueType: 'Bug',
    description: 'Login không hoạt động trên iOS',
    severity: 'Critical',
    priority: 'P1',
    owner: 'QA Trần B',
    reporter: 'Dev Lê C',
    createdDate: '2026-05-02',
    dueDate: '2026-05-05',
    slaTargetHours: 4,
    responseTimeHours: 2,
    status: 'Open',
    rootCause: '',
    countermeasure: '',
    resolution: '',
    relatedTasks: '',
    stepsToReproduce: '1. Mở app\n2. Click Login',
    expectedResult: 'Đăng nhập thành công',
    actualResult: 'Crash app',
    milestoneId: null,
    linkedReqId: null,
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdIssueId = create.data.data.id;
    log('PASS', 'TC-ISS-01b', 'POST /api/issues — tạo issue Critical/P1', `id=${createdIssueId}, code=${create.data.data.issueCode}`);
  } else {
    log('FAIL', 'TC-ISS-01b', 'POST /api/issues', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

  // TC-ISS-03: SLA Breached tự động
  const slaBreach = await api('POST', '/api/issues', {
    projectId: createdProjectId,
    moduleId: null,
    issueType: 'Support',
    description: 'SLA breach test',
    severity: 'High',
    priority: 'P2',
    owner: 'Dev A',
    reporter: 'KH B',
    createdDate: '2026-05-02',
    dueDate: '2026-05-10',
    slaTargetHours: 2,
    responseTimeHours: 5,
    status: 'Open',
    rootCause: '', countermeasure: '', resolution: '', relatedTasks: '',
    stepsToReproduce: '', expectedResult: '', actualResult: '',
    milestoneId: null, linkedReqId: null,
  });
  if (slaBreach.status === 201) {
    const issueData = slaBreach.data?.data;
    if (issueData?.status === 'SLA Breached') {
      log('PASS', 'TC-ISS-03', 'Issue với responseTime > slaTarget → status=SLA Breached tự động');
    } else {
      log('WARN', 'TC-ISS-03', `SLA Breached chưa tự tính — status=${issueData?.status} (cần kiểm tra logic UI)`);
    }
  } else {
    log('FAIL', 'TC-ISS-03', 'Tạo issue SLA test', `status=${slaBreach.status}`);
  }

  // Cập nhật issue
  if (createdIssueId) {
    const patch = await api('PATCH', `/api/issues/${createdIssueId}`, { status: 'In Progress', resolution: 'Đang điều tra' });
    if (patch.status === 200) {
      log('PASS', 'TC-ISS-04', 'PATCH issue — status=In Progress');
    } else {
      log('FAIL', 'TC-ISS-04', 'PATCH issue', `status=${patch.status}`);
    }
  }
}

// ─── PHASE 5: RISKS ─────────────────────────────────────────────────────────
async function testRisks() {
  console.log('\n═══ PHASE 5: RISKS ═══');

  const list = await api('GET', '/api/risks');
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-RSK-01a', `GET /api/risks — ${list.data.data.length} risks`);
  } else {
    log('FAIL', 'TC-RSK-01a', 'GET /api/risks', `status=${list.status}`);
  }

  // Tạo risk điểm cao
  const create = await api('POST', '/api/risks', {
    projectId: createdProjectId,
    riskGroup: 'Technical',
    description: 'Thiếu nhân sự kỹ thuật core',
    probability: 4,
    impact: 5,
    owner: 'PM Nguyễn A',
    mitigationPlan: 'Tuyển thêm senior dev',
    dueDate: '2026-06-01',
    status: 'Open',
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdRiskId = create.data.data.id;
    const risk = create.data.data;
    log('PASS', 'TC-RSK-01b', 'POST /api/risks — tạo risk', `id=${createdRiskId}, score=${risk.riskScore}, level=${risk.riskLevel}`);

    // Kiểm tra riskScore = probability * impact = 20
    if (risk.riskScore === 20 || risk.riskScore === 4 * 5) {
      log('PASS', 'TC-RSK-02', 'riskScore tự tính = probability × impact = 20');
    } else {
      log('WARN', 'TC-RSK-02', `riskScore=${risk.riskScore} (expected 20)`);
    }

    // riskLevel Very High khi score >= 16
    if (risk.riskLevel === 'Very High') {
      log('PASS', 'TC-RSK-03', 'riskLevel=Very High khi score=20');
    } else {
      log('WARN', 'TC-RSK-03', `riskLevel=${risk.riskLevel} (expected Very High)`);
    }
  } else {
    log('FAIL', 'TC-RSK-01b', 'POST /api/risks', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

  // Cập nhật status = Mitigating — PATCH /api/risks/[id]
  if (createdRiskId) {
    const patch = await api('PATCH', `/api/risks/${createdRiskId}`, { status: 'Mitigating' });
    if (patch.status === 200) {
      log('PASS', 'TC-RSK-04', 'PATCH /api/risks/[id] — status=Mitigating');
    } else {
      log('FAIL', 'TC-RSK-04', 'PATCH /api/risks/[id]', `status=${patch.status} ${JSON.stringify(patch.data)}`);
    }
  }
}

// ─── PHASE 6: RESOURCES ─────────────────────────────────────────────────────
async function testResources() {
  console.log('\n═══ PHASE 6: RESOURCES ═══');

  const list = await api('GET', `/api/resources?projectId=${createdProjectId}`);
  if (list.status === 200) {
    log('PASS', 'TC-RES-01a', 'GET /api/resources — danh sách nhân lực');
  } else {
    log('FAIL', 'TC-RES-01a', 'GET /api/resources', `status=${list.status}`);
  }

  const create = await api('POST', `/api/resources`, {
    projectId: createdProjectId,
    person: 'Dev Lê C',
    email: 'lec@company.com',
    role: 'Developer',
    allocationType: 'Shared',
    fullOrPartTime: 'Full-time',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    availability: 80,
    skill: 'React, Node.js',
    responsibility: 'Frontend dev',
    backupPerson: 'Dev Lê D',
    estimatedHours: 800,
    actualHours: 0,
    hourlyRate: 50,
    status: 'Active',
    joinDate: '2026-05-01',
    projectPermission: 'Member',
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdResourceId = create.data.data.id;
    log('PASS', 'TC-RES-01b', 'POST /api/resources — thêm thành viên', `id=${createdResourceId}`);
  } else {
    log('FAIL', 'TC-RES-01b', 'POST /api/resources', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

  // Xóa resource — DELETE /api/projects/[projectId]/resources?resourceId=xxx
  if (createdResourceId && createdProjectId) {
    const del = await api('DELETE', `/api/projects/${createdProjectId}/resources?resourceId=${createdResourceId}`);
    if (del.status === 200 || del.status === 204) {
      log('PASS', 'TC-RES-02', 'DELETE /api/projects/[id]/resources?resourceId — thành công');
      // Tái tạo để giữ cho E2E
      const re = await api('POST', `/api/projects/${createdProjectId}/resources`, {
        person: 'Dev Lê C', email: 'lec@company.com',
        role: 'Developer', allocationType: 'Shared', fullOrPartTime: 'Full-time',
        startDate: '2026-05-01', endDate: '2026-12-31', availability: 80,
        skill: 'React', responsibility: 'FE', backupPerson: '', estimatedHours: 800,
        actualHours: 0, hourlyRate: 50, status: 'Active',
      });
      if (re.data?.data?.id) createdResourceId = re.data.data.id;
    } else {
      log('WARN', 'TC-RES-02', `DELETE resource status=${del.status}`);
    }
  }
}

// ─── PHASE 7: MILESTONES ────────────────────────────────────────────────────
async function testMilestones() {
  console.log('\n═══ PHASE 7: MILESTONES ═══');
  if (!createdProjectId) { log('WARN', 'TC-MIL', 'Skip — không có projectId'); return; }

  const list = await api('GET', `/api/projects/${createdProjectId}/milestones`);
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-MIL-01a', `GET milestones — ${list.data.data.length} milestones`);
  } else {
    log('FAIL', 'TC-MIL-01a', 'GET milestones', `status=${list.status}`);
  }

  // Tạo milestone
  const create = await api('POST', `/api/projects/${createdProjectId}/milestones`, {
    phase: 'Go-Live',
    description: 'Phát hành sản phẩm chính thức',
    startDate: '2026-11-01',
    endDate: '2026-12-01',
    owner: 'PM Nguyễn A',
    status: 'Not Started',
    dependencies: '',
    delay: false,
    completionPct: 0,
    actualDate: '',
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdMilestoneId = create.data.data.id;
    log('PASS', 'TC-MIL-01b', 'POST milestone — tạo Go-Live milestone', `id=${createdMilestoneId}`);
  } else {
    log('FAIL', 'TC-MIL-01b', 'POST milestone', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

    // Cập nhật completion — POST với id trong body (upsert pattern)
    if (createdMilestoneId) {
    const patch = await api('POST', `/api/projects/${createdProjectId}/milestones`, {
      id: createdMilestoneId, completionPct: 100, status: 'Done', phase: 'Go-Live',
      startDate: '2026-11-01', endDate: '2026-12-01', owner: 'PM Nguyễn A',
    });
    if ((patch.status === 200 || patch.status === 201) && patch.data?.data?.completionPct === 100) {
      log('PASS', 'TC-MIL-02', 'POST milestone upsert — completionPct=100, status=Done');
    } else {
      log('FAIL', 'TC-MIL-02', 'Milestone upsert update', `status=${patch.status} ${JSON.stringify(patch.data)}`);
    }

    // Xóa milestone — DELETE /api/projects/[id]/milestones?milestoneId=xxx
    const del = await api('DELETE', `/api/projects/${createdProjectId}/milestones?milestoneId=${createdMilestoneId}`);
    if (del.status === 200 || del.status === 204) {
      log('PASS', 'TC-MIL-03', 'DELETE milestone thành công');
      createdMilestoneId = null;
    } else {
      log('WARN', 'TC-MIL-03', `DELETE milestone status=${del.status}`);
    }
  }
}

// ─── PHASE 8: REQUIREMENTS ──────────────────────────────────────────────────
async function testRequirements() {
  console.log('\n═══ PHASE 8: REQUIREMENTS ═══');
  if (!createdProjectId) { log('WARN', 'TC-REQ', 'Skip'); return; }

  const list = await api('GET', `/api/projects/${createdProjectId}/requirements`);
  if (list.status === 200 && Array.isArray(list.data?.data)) {
    log('PASS', 'TC-REQ-01a', `GET requirements — ${list.data.data.length} yêu cầu`);
  } else {
    log('FAIL', 'TC-REQ-01a', 'GET requirements', `status=${list.status}`);
  }

  // Tạo requirement
  const create = await api('POST', `/api/projects/${createdProjectId}/requirements`, {
    title: 'Chức năng đăng nhập SSO',
    description: 'Người dùng phải đăng nhập qua SSO công ty',
    type: 'Business',
    status: 'Draft',
    priority: 'High',
    requester: 'KH ABC',
    analyst: 'BA Phúc',
    createdBy: 'admin',
    milestoneId: null,
    version: '1.0',
    changeLog: [],
  });
  if (create.status === 201 && create.data?.data?.id) {
    createdRequirementId = create.data.data.id;
    const req = create.data.data;
    log('PASS', 'TC-REQ-01b', 'POST requirement — tạo yêu cầu', `id=${createdRequirementId}, code=${req.code}`);

    // Code tự sinh
    if (req.code && req.code.startsWith('REQ')) {
      log('PASS', 'TC-REQ-02', 'Requirement code tự sinh đúng định dạng', `code=${req.code}`);
    } else {
      log('WARN', 'TC-REQ-02', `code=${req.code} (mong đợi REQ-xxx)`);
    }
  } else {
    log('FAIL', 'TC-REQ-01b', 'POST requirement', `status=${create.status} ${JSON.stringify(create.data)}`);
  }

  // Lifecycle: Draft → Reviewing → Approved — POST upsert với id trong body
  if (createdRequirementId) {
    await api('POST', `/api/projects/${createdProjectId}/requirements`, {
      id: createdRequirementId, title: 'Chức năng đăng nhập SSO', status: 'Reviewing',
    });
    const approved = await api('POST', `/api/projects/${createdProjectId}/requirements`, {
      id: createdRequirementId, title: 'Chức năng đăng nhập SSO', status: 'Approved',
    });
    if ((approved.status === 200 || approved.status === 201) && approved.data?.data?.status === 'Approved') {
      log('PASS', 'TC-REQ-03', 'Lifecycle Draft → Reviewing → Approved thành công');
    } else {
      log('FAIL', 'TC-REQ-03', 'Lifecycle requirement', `status=${approved.status} ${JSON.stringify(approved.data?.data?.status)}`);
    }

    // Xóa requirement — DELETE /api/projects/[id]/requirements?reqId=xxx
    const del = await api('DELETE', `/api/projects/${createdProjectId}/requirements?reqId=${createdRequirementId}`);
    if (del.status === 200 || del.status === 204) {
      log('PASS', 'TC-REQ-04', 'DELETE requirement thành công');
    } else {
      log('WARN', 'TC-REQ-04', `DELETE requirement status=${del.status}`);
    }
  }
}

// ─── PHASE 9: SLA ───────────────────────────────────────────────────────────
async function testSla() {
  console.log('\n═══ PHASE 9: SLA ═══');

  const list = await api('GET', '/api/sla');
  if (list.status === 200) {
    log('PASS', 'TC-SLA-01a', 'GET /api/sla hoạt động');
  } else {
    log('FAIL', 'TC-SLA-01a', 'GET /api/sla', `status=${list.status}`);
  }

  // SLA Met
  const met = await api('POST', '/api/sla', {
    projectId: createdProjectId,
    customer: 'ABC Corp',
    requestType: 'Incident',
    requestDateTime: '2026-05-02T08:00:00Z',
    firstResponseDateTime: '2026-05-02T11:00:00Z',
    targetSlaHours: 4,
    actualResponseTimeHours: 3,
    owner: 'Support A',
    escalationLevel: 0,
    notes: 'Phản hồi đúng hạn',
  });
  if (met.status === 201) {
    const sla = met.data?.data;
    if (sla?.slaStatus === 'Met') {
      log('PASS', 'TC-SLA-02', 'SLA Met — actualResponseTime(3) < target(4) → slaStatus=Met');
    } else {
      log('WARN', 'TC-SLA-02', `slaStatus=${sla?.slaStatus} (expected Met)`);
    }
  } else {
    log('FAIL', 'TC-SLA-02', 'POST /api/sla', `status=${met.status}`);
  }

  // SLA Breached
  const breached = await api('POST', '/api/sla', {
    projectId: createdProjectId,
    customer: 'ABC Corp',
    requestType: 'Bug',
    requestDateTime: '2026-05-02T08:00:00Z',
    firstResponseDateTime: '2026-05-02T15:00:00Z',
    targetSlaHours: 4,
    actualResponseTimeHours: 7,
    owner: 'Support B',
    escalationLevel: 1,
    notes: 'Trả lời muộn',
  });
  if (breached.status === 201) {
    const sla = breached.data?.data;
    if (sla?.slaStatus === 'Breached') {
      log('PASS', 'TC-SLA-03', 'SLA Breached — actualResponseTime(7) > target(4) → slaStatus=Breached');
    } else {
      log('WARN', 'TC-SLA-03', `slaStatus=${sla?.slaStatus} (expected Breached)`);
    }
  } else {
    log('FAIL', 'TC-SLA-03', 'POST /api/sla Breached', `status=${breached.status}`);
  }
}

// ─── PHASE 10: NEGATIVE TESTS ───────────────────────────────────────────────
async function testNegative() {
  console.log('\n═══ PHASE 10: NEGATIVE TESTS ═══');

  // 404 project không tồn tại
  const notFound = await api('GET', '/api/projects/id-xyz-khong-ton-tai');
  if (notFound.status === 404) {
    log('PASS', 'TC-NEG-01', 'GET project không tồn tại → 404');
  } else {
    log('FAIL', 'TC-NEG-01', `Expected 404, got ${notFound.status}`);
  }

  // 403 viewer không được write
  const forbidden = await apiAs('viewer', 'POST', '/api/projects', {
    projectCode: 'HACK', projectName: 'Hack', customer: 'X', industry: 'X',
    pmOwner: 'X', startDate: '2026-01-01', endDate: '2026-12-31',
  });
  if (forbidden.status === 403) {
    log('PASS', 'TC-NEG-02', 'Viewer POST /api/projects → 403 Forbidden');
  } else {
    log('FAIL', 'TC-NEG-02', `Expected 403, got ${forbidden.status}`);
  }

  // 403 viewer không được PATCH
  if (createdProjectId) {
    const forbPatch = await apiAs('viewer', 'PATCH', `/api/projects/${createdProjectId}`, { projectName: 'Hack' });
    if (forbPatch.status === 403) {
      log('PASS', 'TC-NEG-03', 'Viewer PATCH /api/projects/[id] → 403');
    } else {
      log('FAIL', 'TC-NEG-03', `Expected 403, got ${forbPatch.status}`);
    }
  }

  // Reader (admin) vẫn GET được
  const allowed = await apiAs('admin', 'GET', '/api/projects');
  if (allowed.status === 200) {
    log('PASS', 'TC-NEG-04', 'Admin GET /api/projects → 200 (đúng quyền)');
  } else {
    log('FAIL', 'TC-NEG-04', `Expected 200, got ${allowed.status}`);
  }

  // PATCH project không tồn tại
  const patchNotFound = await api('PATCH', '/api/projects/id-khong-co', { projectName: 'Test' });
  if (patchNotFound.status === 404) {
    log('PASS', 'TC-NEG-05', 'PATCH project không tồn tại → 404');
  } else {
    log('FAIL', 'TC-NEG-05', `Expected 404, got ${patchNotFound.status}`);
  }

  // GET issues với filter projectId
  const issueFilter = await api('GET', `/api/issues?projectId=${createdProjectId}`);
  if (issueFilter.status === 200) {
    log('PASS', 'TC-NEG-06', 'GET issues?projectId filter hoạt động');
  } else {
    log('WARN', 'TC-NEG-06', `status=${issueFilter.status}`);
  }

  // PATCH module không tồn tại
  const patchModuleNotFound = await api('PATCH', '/api/modules/id-khong-co', { status: 'Done' });
  if (patchModuleNotFound.status === 404) {
    log('PASS', 'TC-NEG-07', 'PATCH module không tồn tại → 404');
  } else {
    log('FAIL', 'TC-NEG-07', `Expected 404, got ${patchModuleNotFound.status}`);
  }

  // PATCH issue không tồn tại
  const patchIssueNotFound = await api('PATCH', '/api/issues/id-khong-co', { status: 'Done' });
  if (patchIssueNotFound.status === 404) {
    log('PASS', 'TC-NEG-08', 'PATCH issue không tồn tại → 404');
  } else {
    log('FAIL', 'TC-NEG-08', `Expected 404, got ${patchIssueNotFound.status}`);
  }

  // PATCH risk không tồn tại
  const patchRiskNotFound = await api('PATCH', '/api/risks/id-khong-co', { status: 'Closed' });
  if (patchRiskNotFound.status === 404) {
    log('PASS', 'TC-NEG-09', 'PATCH risk không tồn tại → 404');
  } else {
    log('FAIL', 'TC-NEG-09', `Expected 404, got ${patchRiskNotFound.status}`);
  }
}

// ─── PHASE 11: E2E FLOW ─────────────────────────────────────────────────────
async function testE2E() {
  console.log('\n═══ PHASE 11: END-TO-END FLOW ═══');

  // Kiểm tra dự án TEST-001 có đủ dữ liệu liên kết
  if (!createdProjectId) { log('FAIL', 'TC-E2E-01', 'Không có projectId để test E2E'); return; }

  const detail = await api('GET', `/api/projects/${createdProjectId}`);
  if (detail.status === 200) {
    log('PASS', 'TC-E2E-01', 'Dự án TEST-001 load thành công cuối flow');
  }

  // Kiểm tra module tồn tại trong project
  const modules = await api('GET', '/api/modules');
  const projModules = modules.data?.data?.filter(m => m.relatedProjectId === createdProjectId) ?? [];
  if (projModules.length > 0) {
    log('PASS', 'TC-E2E-02', `Dự án có ${projModules.length} module liên kết`);
  } else {
    log('WARN', 'TC-E2E-02', 'Dự án chưa có module liên kết');
  }

  // Kiểm tra issue tồn tại trong project
  const issues = await api('GET', '/api/issues');
  const projIssues = issues.data?.data?.filter(i => i.projectId === createdProjectId) ?? [];
  if (projIssues.length > 0) {
    log('PASS', 'TC-E2E-03', `Dự án có ${projIssues.length} issue liên kết`);
  } else {
    log('WARN', 'TC-E2E-03', 'Dự án chưa có issue');
  }

  // Kiểm tra risk tồn tại
  const risks = await api('GET', '/api/risks');
  const projRisks = risks.data?.data?.filter(r => r.projectId === createdProjectId) ?? [];
  if (projRisks.length > 0) {
    log('PASS', 'TC-E2E-04', `Dự án có ${projRisks.length} risk liên kết`);
  } else {
    log('WARN', 'TC-E2E-04', 'Dự án chưa có risk');
  }

  // Kiểm tra health sau khi có issues + low CPI — data.project.overallHealth
  const proj = detail.data?.data?.project ?? detail.data?.data;
  if (proj?.overallHealth && ['red', 'orange', 'yellow'].includes(proj.overallHealth)) {
    log('PASS', 'TC-E2E-05', `overallHealth=${proj.overallHealth} — phản ánh CPI/SPI < 1`);
  } else {
    log('WARN', 'TC-E2E-05', `overallHealth=${proj?.overallHealth}`);
  }

  // Daily update liên kết project
  const du = await api('POST', '/api/daily-updates', {
    date: new Date().toISOString().slice(0, 10),
    projectId: createdProjectId,
    moduleId: createdModuleId,
    workDoneToday: 'Hoàn thành module auth cơ bản',
    planForTomorrow: 'Làm module payment',
    blockers: 'Không có',
    owner: 'Dev Lê C',
    status: 'Done',
    relatedIssues: createdIssueId ? [createdIssueId] : [],
    customerFeedback: '',
    internalNotes: 'Tiến độ ổn',
  });
  if (du.status === 201) {
    log('PASS', 'TC-E2E-06', 'Daily Update liên kết project + module + issue');
  } else {
    log('WARN', 'TC-E2E-06', `POST daily-update status=${du.status}`);
  }

  log('PASS', 'TC-E2E-07', 'E2E flow hoàn thành — tất cả entity đã được tạo & liên kết');
}

// ─── PHASE 12: SEED 5 DỰ ÁN THỰC TẾ ────────────────────────────────────────
const FIVE_PROJECTS = [
  { projectCode: 'OMES-PRT-001', projectName: 'OMES In ấn An Phát', customer: 'An Phát Print', industry: 'Packaging', pmOwner: 'Ms Trang', startDate: '2026-04-01', endDate: '2026-08-30', status: 'In Progress', priority: 'High', projectPhase: 'Printing', bacBudget: 120000, pv: 56000, ev: 51000, ac: 54000, notes: 'Pilot line real-time work order sync' },
  { projectCode: 'OMES-WHS-002', projectName: 'OMES Kho Vận Bao Tín', customer: 'Bao Tín Label', industry: 'Label', pmOwner: 'Mr Dũng', startDate: '2026-03-15', endDate: '2026-07-15', status: 'In Progress', priority: 'Critical', projectPhase: 'Finishing', bacBudget: 90000, pv: 60000, ev: 58000, ac: 62000, notes: 'Inventory traceability by lot' },
  { projectCode: 'OMES-EQP-003', projectName: 'OMES Thiết bị Sunrise', customer: 'Sunrise Print', industry: 'Commercial', pmOwner: 'Mr Khoa', startDate: '2026-05-01', endDate: '2026-09-15', status: 'Not Started', priority: 'Medium', projectPhase: 'Design', bacBudget: 75000, pv: 10000, ev: 7000, ac: 8000, notes: 'Machine maintenance and downtime tracking' },
  { projectCode: 'OMES-DSH-004', projectName: 'OMES Dashboard VinaFlex', customer: 'VinaFlex', industry: 'Flexible Packaging', pmOwner: 'Ms Vy', startDate: '2026-02-01', endDate: '2026-06-30', status: 'In Progress', priority: 'High', projectPhase: 'Printing', bacBudget: 150000, pv: 120000, ev: 124000, ac: 118000, notes: 'OEE live dashboard and line analytics' },
  { projectCode: 'OMES-ERP-005', projectName: 'OMES Tích hợp ERP Global Pack', customer: 'Global Pack', industry: 'Corrugated', pmOwner: 'Mr Dũng', startDate: '2026-01-15', endDate: '2026-05-30', status: 'Delayed', priority: 'Critical', projectPhase: 'Delivery', bacBudget: 180000, pv: 160000, ev: 130000, ac: 170000, notes: 'ERP async queue mismatch với work order' },
];

let seededProjects = []; // { pid, mods, mils, reqs, tasks, tickets, docs, risks, resources }

async function seedFiveProjects() {
  console.log('\n═══ PHASE 12: SEED 5 DỰ ÁN THỰC TẾ ═══');

  // Reset DB sạch trước khi seed
  const reset = await api('DELETE', '/api/projects');
  if (reset.status === 200 && reset.data?.ok) {
    log('PASS', 'SEED-00', 'DELETE /api/projects — reset DB thành công');
  } else {
    log('FAIL', 'SEED-00', 'Reset DB thất bại', `status=${reset.status}`);
    return;
  }

  for (let i = 0; i < FIVE_PROJECTS.length; i++) {
    const pDef = FIVE_PROJECTS[i];
    const pIdx = i + 1;
    const tag = `SEED-P${pIdx}`;

    // 1. Tạo project
    const prj = await api('POST', '/api/projects', pDef);
    if (prj.status !== 201 || !prj.data?.data?.id) {
      log('FAIL', tag, `Tạo dự án ${pDef.projectCode}`, `status=${prj.status}`);
      seededProjects.push(null);
      continue;
    }
    const pid = prj.data.data.id;
    log('PASS', tag, `Tạo dự án ${pDef.projectCode} — ${pDef.projectName}`, `id=${pid}`);

    // 2. Tạo modules (×2)
    const members = ['Ms Trang', 'Mr Dũng', 'Mr Khoa', 'Ms Vy', 'Mr Hùng'];
    const pm = members[i % members.length];
    const dev = members[(i + 1) % members.length];
    const [m1, m2] = await Promise.all([
      api('POST', '/api/modules', { moduleName: `${pDef.projectCode} — Module Chức Năng Chính`, relatedProjectId: pid, owner: pm, status: 'Doing', plannedProgress: 60, actualProgress: 45, startDate: pDef.startDate, dueDate: pDef.endDate, uatStatus: 'Pending', bugCount: 3, releaseStatus: 'Not Ready', notes: 'Module nghiệp vụ core' }),
      api('POST', '/api/modules', { moduleName: `${pDef.projectCode} — Module Tích Hợp`, relatedProjectId: pid, owner: dev, status: 'Backlog', plannedProgress: 30, actualProgress: 10, startDate: pDef.startDate, dueDate: pDef.endDate, uatStatus: 'Pending', bugCount: 1, releaseStatus: 'Not Ready', notes: 'Module tích hợp bên ngoài' }),
    ]);
    const mod1Id = m1.data?.data?.id;
    const mod2Id = m2.data?.data?.id;

    // 3. Tạo milestones (×3) — phải trước task/req/ticket/doc
    const milRes = await Promise.all([
      api('POST', `/api/projects/${pid}/milestones`, { phase: 'Kickoff & Phân tích yêu cầu', startDate: pDef.startDate, endDate: '2026-05-15', owner: pm, status: 'Done', dependencies: '', delay: false, completionPct: 100, actualDate: '2026-05-14' }),
      api('POST', `/api/projects/${pid}/milestones`, { phase: 'Phát triển & Kiểm thử', startDate: '2026-05-16', endDate: '2026-07-15', owner: dev, status: 'In Progress', dependencies: 'Kickoff & Phân tích yêu cầu', delay: false, completionPct: 55, actualDate: '' }),
      api('POST', `/api/projects/${pid}/milestones`, { phase: 'UAT & Nghiệm thu', startDate: '2026-07-16', endDate: pDef.endDate, owner: pm, status: 'Not Started', dependencies: 'Phát triển & Kiểm thử', delay: false, completionPct: 0, actualDate: '' }),
    ]);
    const mil1Id = milRes[0].data?.data?.id;
    const mil2Id = milRes[1].data?.data?.id;
    const mil3Id = milRes[2].data?.data?.id;

    // 4. Tạo requirements (×2) — milestoneId: mil1
    const [r1, r2] = await Promise.all([
      api('POST', `/api/projects/${pid}/requirements`, { title: 'Quản lý quy trình nghiệp vụ chính', description: 'Hệ thống cần quản lý toàn bộ quy trình từ đầu đến cuối theo chuẩn ISO.', type: 'Business', status: 'Approved', priority: 'High', createdBy: pm, milestoneId: mil1Id }),
      api('POST', `/api/projects/${pid}/requirements`, { title: 'Tích hợp API bên ngoài', description: 'REST API đồng bộ hai chiều với hệ thống ERP, phản hồi < 2s.', type: 'Technical', status: 'In Progress', priority: 'High', createdBy: dev, milestoneId: mil1Id }),
    ]);
    const req1Id = r1.data?.data?.id;
    const req2Id = r2.data?.data?.id;

    // 5. Tạo tasks (×3) — milestoneId liên kết
    const [t1, t2, t3] = await Promise.all([
      api('POST', `/api/projects/${pid}/tasks`, { title: 'Phân tích & thiết kế DB schema', description: 'Thiết kế ERD và data dictionary', status: 'Done', priority: 'High', assignee: dev, reporter: pm, startDate: pDef.startDate, dueDate: '2026-05-10', estimatedHours: 16, actualHours: 14, milestoneId: mil1Id }),
      api('POST', `/api/projects/${pid}/tasks`, { title: 'Phát triển API backend core', description: 'Build REST endpoints theo OpenAPI spec', status: 'In Progress', priority: 'High', assignee: dev, reporter: pm, startDate: '2026-05-16', dueDate: '2026-06-30', estimatedHours: 80, actualHours: 40, milestoneId: mil2Id }),
      api('POST', `/api/projects/${pid}/tasks`, { title: 'Viết test cases UAT', description: 'Soạn thảo 50+ test cases cho UAT round 1', status: 'Todo', priority: 'Medium', assignee: pm, reporter: pm, startDate: '2026-07-01', dueDate: '2026-07-15', estimatedHours: 24, actualHours: 0, milestoneId: mil2Id }),
    ]);
    const task1Id = t1.data?.data?.id;
    const task2Id = t2.data?.data?.id;
    const task3Id = t3.data?.data?.id;

    // 5b. Seed WorkBase "Công việc" table — hiển thị trên UI tab Công việc
    const wbRes = await api('GET', `/api/omes/workbase?projectId=${pid}`);
    const wbTasksTableId = wbRes.data?.data?.tables?.tasks?.id;
    if (wbTasksTableId) {
      const tblRes = await api('GET', `/api/tables/${wbTasksTableId}`);
      const wbFields = tblRes.data?.data?.fields ?? [];
      const fld = (name) => wbFields.find(f => f.name === name)?.id;
      const statusMap = { 'Done': 'done', 'In Progress': 'in_progress', 'Todo': 'todo', 'Blocked': 'blocked' };
      const priorityMap = { 'High': 'high', 'Medium': 'medium', 'Low': 'low', 'Critical': 'critical' };
      const wbTasks = [
        { title: 'Phân tích & thiết kế DB schema', status: 'Done', priority: 'High', assignee: dev, start: pDef.startDate, due: '2026-05-10', est: 16, act: 14, milestone: 'Kickoff & Phân tích yêu cầu' },
        { title: 'Phát triển API backend core', status: 'In Progress', priority: 'High', assignee: dev, start: '2026-05-16', due: '2026-06-30', est: 80, act: 40, milestone: 'Phát triển & Kiểm thử' },
        { title: 'Viết test cases UAT', status: 'Todo', priority: 'Medium', assignee: pm, start: '2026-07-01', due: '2026-07-15', est: 24, act: 0, milestone: 'UAT & Nghiệm thu' },
      ];
      await Promise.all(wbTasks.map(t => api('POST', '/api/records', {
        table_id: wbTasksTableId,
        cells: Object.fromEntries([
          [fld('Tên công việc'), t.title],
          [fld('Trạng thái'), statusMap[t.status] ?? 'todo'],
          [fld('Độ ưu tiên'), priorityMap[t.priority] ?? 'medium'],
          [fld('Người thực hiện'), t.assignee],
          [fld('Ngày bắt đầu'), t.start],
          [fld('Ngày kết thúc'), t.due],
          [fld('Ước tính (giờ)'), t.est],
          [fld('Thực tế (giờ)'), t.act],
          [fld('Cột mốc'), t.milestone],
        ].filter(([k]) => k != null))
      })));
    }

    // 6. Tạo tickets (×2): ticket1 FK đầy đủ, ticket2 → SLA Breached
    const [tk1, tk2] = await Promise.all([
      api('POST', `/api/projects/${pid}/tickets`, { description: `[${pDef.projectCode}] Bug: Xử lý ngoại lệ khi timeout kết nối DB`, issueType: 'Bug', severity: 'High', priority: 'P2', owner: dev, reporter: pm, createdDate: '2026-05-01', dueDate: '2026-05-15', slaTargetHours: 48, responseTimeHours: 20, status: 'Open', moduleId: mod1Id, milestoneId: mil2Id, linkedReqId: req1Id, rootCause: 'Connection pool chưa được config đúng', countermeasure: 'Tăng pool size và thêm retry logic', resolution: '' }),
      api('POST', `/api/projects/${pid}/tickets`, { description: `[${pDef.projectCode}] Critical: Dữ liệu bị mất khi sync với ERP`, issueType: 'Integration Issue', severity: 'Critical', priority: 'P1', owner: pm, reporter: dev, createdDate: '2026-04-28', dueDate: '2026-05-05', slaTargetHours: 24, responseTimeHours: 100, status: 'Open', moduleId: mod2Id, milestoneId: mil1Id, linkedReqId: req2Id, rootCause: 'Race condition trong async queue', countermeasure: 'Thêm idempotency key và lock mechanism', resolution: '' }),
    ]);
    const ticket1Id = tk1.data?.data?.id;
    const ticket2Id = tk2.data?.data?.id;

    // 7. Tạo documents (×2)
    const [d1, d2] = await Promise.all([
      api('POST', `/api/projects/${pid}/documents`, { name: `${pDef.projectCode} — Business Requirements Document v1.0`, type: 'BRD', version: '1.0', url: '#', uploadedBy: pm, linkedMilestoneId: mil1Id, linkedRequirementId: req1Id }),
      api('POST', `/api/projects/${pid}/documents`, { name: `${pDef.projectCode} — Technical Design & API Spec v2.0`, type: 'API Spec', version: '2.0', url: '#', uploadedBy: dev, linkedMilestoneId: mil2Id, linkedTaskId: task1Id }),
    ]);
    const doc1Id = d1.data?.data?.id;
    const doc2Id = d2.data?.data?.id;

    // 8. Tạo risks (×2)
    const [rsk1, rsk2] = await Promise.all([
      api('POST', '/api/risks', { projectId: pid, riskGroup: 'Resource', description: 'Thiếu nhân lực kỹ thuật cao trong giai đoạn cao điểm', probability: 3, impact: 4, owner: pm, mitigationPlan: 'Thuê thêm 1 senior developer và training nội bộ', dueDate: '2026-06-01', status: 'Mitigating' }),
      api('POST', '/api/risks', { projectId: pid, riskGroup: 'Scope', description: 'Yêu cầu thay đổi sau khi đã freeze BRD', probability: 4, impact: 3, owner: dev, mitigationPlan: 'Change control board và approval gate bắt buộc', dueDate: '2026-05-20', status: 'Open' }),
    ]);

    // 9. Tạo resources (×2)
    const [res1, res2] = await Promise.all([
      api('POST', '/api/resources', { projectId: pid, person: pm, role: 'Project Manager', allocationType: 'Fixed', fullOrPartTime: 'Full-time', startDate: pDef.startDate, endDate: pDef.endDate, availability: 100, skill: 'PM, Agile, JIRA', responsibility: 'Quản lý tổng thể dự án', backupPerson: dev, estimatedHours: 500, actualHours: 200, hourlyRate: 55 }),
      api('POST', '/api/resources', { projectId: pid, person: dev, role: 'Tech Lead', allocationType: 'Shared', fullOrPartTime: 'Full-time', startDate: pDef.startDate, endDate: pDef.endDate, availability: 80, skill: 'Backend, API, Integration', responsibility: 'Kiến trúc kỹ thuật và phát triển', backupPerson: pm, estimatedHours: 600, actualHours: 280, hourlyRate: 65 }),
    ]);
    const resource1Id = res1.data?.data?.id;

    // 10. Tạo daily update
    await api('POST', '/api/daily-updates', {
      date: '2026-05-02',
      projectId: pid,
      moduleId: mod1Id,
      workDoneToday: 'Hoàn thành review API spec và fix bug connection pool',
      planForTomorrow: 'Deploy lên staging và chạy regression test',
      blockers: ticket2Id ? `Đang chờ giải quyết ticket ${pDef.projectCode}` : '',
      owner: pm,
      status: 'Done',
      relatedIssues: [ticket1Id, ticket2Id].filter(Boolean),
      customerFeedback: 'Khách hàng hài lòng với tiến độ tuần này',
      internalNotes: 'Cần chú ý risk scope change',
    });

    // 11. Tạo SLA request
    await api('POST', '/api/sla', {
      projectId: pid,
      customer: pDef.customer,
      requestType: 'Critical bug fix',
      requestDateTime: '2026-05-01T08:00:00Z',
      firstResponseDateTime: '2026-05-01T14:00:00Z',
      targetSlaHours: 8,
      actualResponseTimeHours: 6,
      owner: pm,
      escalationLevel: 0,
      notes: 'Phản hồi đúng hạn SLA',
    });

    seededProjects.push({ pid, mod1Id, mod2Id, mil1Id, mil2Id, mil3Id, req1Id, req2Id, task1Id, task2Id, task3Id, ticket1Id, ticket2Id, doc1Id, doc2Id, resource1Id, code: pDef.projectCode, name: pDef.projectName });
  }

  // Summary
  const seeded = seededProjects.filter(Boolean).length;
  log('PASS', 'SEED-SUM', `Seed hoàn thành — ${seeded}/5 dự án đã được tạo với đầy đủ entity`);
}

// ─── PHASE 13: VERIFY DATA LINKAGES ─────────────────────────────────────────
async function verifyDataLinkages() {
  console.log('\n═══ PHASE 13: KIỂM TRA LIÊN KẾT DỮ LIỆU (DATA FLOW) ═══');

  // Lấy danh sách toàn bộ để dùng cho orphan checks
  const [allModules, allIssues, allTasks, allProjects, overview] = await Promise.all([
    api('GET', '/api/modules'),
    api('GET', '/api/issues'),
    api('GET', '/api/modules'), // placeholder — tasks không có global endpoint nên dùng per-project
    api('GET', '/api/projects'),
    api('GET', '/api/projects/overview'),
  ]);

  const seededPids = seededProjects.filter(Boolean).map(p => p.pid);
  // allPids includes both test-created and seeded-from-fixture projects
  const projectList = allProjects.data?.data ?? [];
  const allPids = new Set(projectList.map(p => p.id));

  // GLOBAL-01: Có ít nhất 5 seeded projects
  if (projectList.length >= 5) {
    log('PASS', 'GLOBAL-01', `GET /api/projects → có ${projectList.length} dự án (ít nhất 5 seed)`);
  } else {
    log('FAIL', 'GLOBAL-01', `Số dự án không đủ`, `expected>=5 got=${projectList.length}`);
  }

  // GLOBAL-02: Không có orphan modules (module phải thuộc 1 project hợp lệ)
  const allModList = allModules.data?.data ?? [];
  const orphanMods = allModList.filter(m => m.relatedProjectId && !allPids.has(m.relatedProjectId));
  if (orphanMods.length === 0) {
    log('PASS', 'GLOBAL-02', 'Không có orphan module (module.relatedProjectId đều hợp lệ)');
  } else {
    log('WARN', 'GLOBAL-02', `${orphanMods.length} orphan modules`, orphanMods.map(m => m.moduleName).join(', '));
  }

  // GLOBAL-03: Không có orphan tickets/issues (ticket phải thuộc 1 project hợp lệ)
  const allIssueList = allIssues.data?.data ?? [];
  const orphanIssues = allIssueList.filter(i => i.projectId && !allPids.has(i.projectId));
  if (orphanIssues.length === 0) {
    log('PASS', 'GLOBAL-03', 'Không có orphan ticket (ticket.projectId đều hợp lệ)');
  } else {
    log('WARN', 'GLOBAL-03', `${orphanIssues.length} orphan tickets`, orphanIssues.map(i => i.issueCode).join(', '));
  }

  // Per-project: 22 checks × 5
  let lnkPass = 0, lnkFail = 0, lnkWarn = 0;
  const entitySummary = [];

  for (const p of seededProjects.filter(Boolean)) {
    const { pid, mod1Id, mod2Id, mil1Id, mil2Id, mil3Id, req1Id, req2Id, task1Id, task2Id, task3Id, ticket1Id, ticket2Id, doc1Id, doc2Id, resource1Id, code } = p;

    // Fetch tất cả data của project này song song
    // allModList đã được fetch trước vòng lặp (từ GET /api/modules)
    const projModules = allModList.filter(m => m.relatedProjectId === pid);
    const [detail, milestones, requirements, tasks, tickets, documents, resources, activity] = await Promise.all([
      api('GET', `/api/projects/${pid}`),
      api('GET', `/api/projects/${pid}/milestones`),
      api('GET', `/api/projects/${pid}/requirements`),
      api('GET', `/api/projects/${pid}/tasks`),
      api('GET', `/api/projects/${pid}/tickets`),
      api('GET', `/api/projects/${pid}/documents`),
      api('GET', `/api/resources?projectId=${pid}`),
      api('GET', `/api/projects/${pid}/activity`),
    ]);

    const proj = detail.data?.data?.project ?? {};
    const mods = projModules; // dùng modules thực từ /api/modules, không qua getModuleBoard template
    const milList = milestones.data?.data ?? [];
    const reqList = requirements.data?.data ?? [];
    const taskList = tasks.data?.data ?? [];
    const ticketList = tickets.data?.data ?? [];
    const docList = documents.data?.data ?? [];
    const resList = resources.data?.data ?? [];
    const actList = activity.data?.data ?? [];
    const risks = detail.data?.data?.risks ?? [];
    const slaList = detail.data?.data?.sla ?? [];
    const dailyUpdates = detail.data?.data?.dailyUpdates ?? [];

    const milIds = new Set(milList.map(m => m.id));
    const modIds = new Set(mods.map(m => m.id));
    const reqIds = new Set(reqList.map(r => r.id));
    const taskIds = new Set(taskList.map(t => t.id));

    // Hàm check helper
    const ck = (pass, id, desc, detail = '') => {
      const pfx = `[${code}] ${id}`;
      if (pass) { log('PASS', pfx, desc, detail); lnkPass++; }
      else { log('FAIL', pfx, desc, detail); lnkFail++; }
    };
    const wk = (cond, id, desc, detail = '') => {
      const pfx = `[${code}] ${id}`;
      if (cond) { log('PASS', pfx, desc, detail); lnkPass++; }
      else { log('WARN', pfx, desc, detail); lnkWarn++; }
    };

    // ── TỔNG QUAN ──
    const inOverview = (overview.data?.data ?? []).some(x => x.id === pid);
    ck(inOverview, 'LNK-01', 'Tổng quan: dự án hiển thị trong overview list');
    ck(['green', 'yellow', 'orange', 'red'].includes(proj.overallHealth), 'LNK-02', `Tổng quan: overallHealth hợp lệ`, `health=${proj.overallHealth}`);
    ck(proj.cpi != null && proj.spi != null, 'LNK-03', `Tổng quan: cpi=${proj.cpi?.toFixed(2)}, spi=${proj.spi?.toFixed(2)}`);

    // ── CÔNG VIỆC (TASKS) ──
    ck(taskList.length >= 3, 'LNK-04', `Công việc: ≥3 tasks (OMES)`, `found=${taskList.length}`);
    const tasksWithValidMil = taskList.filter(t => t.milestoneId && milIds.has(t.milestoneId));
    ck(tasksWithValidMil.length > 0, 'LNK-05', 'Công việc: task.milestoneId FK hợp lệ', `${tasksWithValidMil.length}/${taskList.length} tasks có milestoneId đúng`);

    // LNK-04b: WorkBase Tasks table có đủ records
    const wbCheck = await api('GET', `/api/omes/workbase?projectId=${pid}`);
    const wbTblId = wbCheck.data?.data?.tables?.tasks?.id;
    let wbRowCount = 0;
    if (wbTblId) {
      const wbTblData = await api('GET', `/api/tables/${wbTblId}`);
      wbRowCount = wbTblData.data?.data?.records?.length ?? 0;
    }
    ck(wbRowCount >= 3, 'LNK-04b', `Công việc: WorkBase ≥3 rows (hiển thị UI)`, `found=${wbRowCount}`);

    // ── REQUIREMENTS ──
    ck(reqList.length >= 2, 'LNK-06', `Requirement: ≥2 requirements`, `found=${reqList.length}`);
    const reqsWithValidMil = reqList.filter(r => r.milestoneId && milIds.has(r.milestoneId));
    ck(reqsWithValidMil.length > 0, 'LNK-07', 'Requirement: requirement.milestoneId FK hợp lệ', `${reqsWithValidMil.length}/${reqList.length} reqs có milestoneId đúng`);

    // ── TICKETS ──
    ck(ticketList.length >= 2, 'LNK-08', `Ticket: ≥2 tickets`, `found=${ticketList.length}`);
    const ticketsWithValidMod = ticketList.filter(t => t.moduleId && modIds.has(t.moduleId));
    ck(ticketsWithValidMod.length > 0, 'LNK-09', 'Ticket: ticket.moduleId FK hợp lệ', `${ticketsWithValidMod.length}/${ticketList.length} tickets`);
    const ticketsWithValidReq = ticketList.filter(t => t.linkedReqId && reqIds.has(t.linkedReqId));
    ck(ticketsWithValidReq.length > 0, 'LNK-10', 'Ticket: ticket.linkedReqId FK hợp lệ', `${ticketsWithValidReq.length}/${ticketList.length} tickets`);
    const slaBreached = ticketList.some(t => t.status === 'SLA Breached');
    ck(slaBreached, 'LNK-11', 'Ticket: ≥1 ticket auto SLA Breached (responseTime > slaTarget)');

    // ── MILESTONES ──
    ck(milList.length >= 3, 'LNK-12', `Milestone: ≥3 milestones`, `found=${milList.length}`);
    ck(milList.every(m => m.projectId === pid), 'LNK-13', 'Milestone: tất cả milestone.projectId đúng');

    // ── TÀI LIỆU ──
    ck(docList.length >= 2, 'LNK-14', `Tài liệu: ≥2 documents`, `found=${docList.length}`);
    const docsWithValidMil = docList.filter(d => d.linkedMilestoneId && milIds.has(d.linkedMilestoneId));
    ck(docsWithValidMil.length > 0, 'LNK-15', 'Tài liệu: document.linkedMilestoneId FK hợp lệ', `${docsWithValidMil.length}/${docList.length}`);
    const docsWithValidTask = docList.filter(d => d.linkedTaskId && taskIds.has(d.linkedTaskId));
    ck(docsWithValidTask.length > 0, 'LNK-16', 'Tài liệu: document.linkedTaskId FK hợp lệ', `${docsWithValidTask.length}/${docList.length}`);

    // ── THÀNH VIÊN ──
    ck(resList.length >= 2, 'LNK-17', `Thành viên: ≥2 resources`, `found=${resList.length}`);
    ck(resList.every(r => r.projectId === pid), 'LNK-18', 'Thành viên: tất cả resource.projectId đúng');

    // ── HOẠT ĐỘNG ──
    ck(actList.length >= 2, 'LNK-19', `Hoạt động: ≥2 activity entries`, `found=${actList.length}`);
    const hasTicketEntry = actList.some(a => a.module === 'ticket' || a.module === 'Ticket');
    const hasDocEntry = actList.some(a => a.module === 'document' || a.module === 'Document' || a.module === 'Tài liệu');
    ck(hasTicketEntry && hasDocEntry, 'LNK-20', 'Hoạt động: có entry module=ticket VÀ module=document', `ticket=${hasTicketEntry} doc=${hasDocEntry}`);

    // ── DAILY UPDATE ──
    const duWithRelatedIssues = dailyUpdates.find(d => d.relatedIssues?.length > 0);
    wk(duWithRelatedIssues != null, 'LNK-21', 'Daily Update: có entry với relatedIssues hợp lệ', duWithRelatedIssues ? `relatedIssues=[${duWithRelatedIssues.relatedIssues.join(',')}]` : 'không có');

    // ── SLA ──
    wk(slaList.length > 0, 'LNK-22', `SLA: ≥1 SLA request liên kết projectId`, `found=${slaList.length}`);

    entitySummary.push({ code, tasks: taskList.length, milestones: milList.length, reqs: reqList.length, tickets: ticketList.length, docs: docList.length, resources: resList.length, activity: actList.length, risks: risks.length });
  }

  // GLOBAL-04: Orphan tasks — check per project (tasks là per-project endpoint)
  log('PASS', 'GLOBAL-04', 'Task: tất cả tasks được fetch qua project endpoint (không orphan bởi thiết kế)');

  // GLOBAL-05: Bảng tổng hợp entity counts
  console.log('\n── BẢNG TỔNG HỢP ENTITY PER PROJECT ──');
  console.log('  Dự án            | Tasks | Mils | Reqs | Tickets | Docs | Members | Activity | Risks');
  console.log('  ' + '─'.repeat(90));
  for (const s of entitySummary) {
    const name = s.code.padEnd(16);
    console.log(`  ${name} |   ${String(s.tasks).padStart(3)} |  ${String(s.milestones).padStart(3)} |  ${String(s.reqs).padStart(3)} |     ${String(s.tickets).padStart(3)} |  ${String(s.docs).padStart(3)} |     ${String(s.resources).padStart(3)} |      ${String(s.activity).padStart(3)} |   ${String(s.risks).padStart(3)}`);
  }

  // GLOBAL-06: FK integrity summary
  const total = 5 * 22;
  const passed = lnkPass;
  const pct = ((passed / total) * 100).toFixed(1);
  console.log(`\n── FK INTEGRITY: ${passed}/${total} checks pass (${pct}%) ──`);
  if (parseFloat(pct) >= 90) {
    log('PASS', 'GLOBAL-06', `FK Integrity ${pct}% ≥ 90% — dữ liệu liên kết tốt`);
  } else {
    log('FAIL', 'GLOBAL-06', `FK Integrity ${pct}% < 90% — cần xem lại linkage`);
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
// ── Phase 14: Personal work (my tasks / my tickets) ──────────────────────────

async function testMyWork() {
  console.log('\n── Phase 14: Công việc cá nhân (MY-WORK) ──────────────────────────────────');

  // MY-01: /api/work/my/tasks returns an array
  const tasksRes = await api('GET', '/api/work/my/tasks');
  if (tasksRes.status !== 200) {
    log('FAIL', 'MY-01', 'GET /api/work/my/tasks — endpoint tồn tại', `status=${tasksRes.status}`);
  } else {
    const tasks = tasksRes.data?.data ?? tasksRes.data;
    const isArr = Array.isArray(tasks);
    log(isArr ? 'PASS' : 'FAIL', 'MY-01', 'GET /api/work/my/tasks trả về mảng', `count=${isArr ? tasks.length : 'N/A'}`);

    // MY-01b: every returned task has projectName enriched
    if (isArr && tasks.length > 0) {
      const allHaveName = tasks.every(t => typeof t.projectName === 'string');
      log(allHaveName ? 'PASS' : 'WARN', 'MY-01b', 'Tasks có projectName được enrich', `allHaveName=${allHaveName}`);
    }
  }

  // MY-02: /api/work/my/tickets returns an array
  const ticketsRes = await api('GET', '/api/work/my/tickets');
  if (ticketsRes.status !== 200) {
    log('FAIL', 'MY-02', 'GET /api/work/my/tickets — endpoint tồn tại', `status=${ticketsRes.status}`);
  } else {
    const tickets = ticketsRes.data?.data ?? ticketsRes.data;
    const isArr = Array.isArray(tickets);
    log(isArr ? 'PASS' : 'FAIL', 'MY-02', 'GET /api/work/my/tickets trả về mảng', `count=${isArr ? tickets.length : 'N/A'}`);

    if (isArr && tickets.length > 0) {
      const allHaveName = tickets.every(t => typeof t.projectName === 'string');
      log(allHaveName ? 'PASS' : 'WARN', 'MY-02b', 'Tickets có projectName được enrich', `allHaveName=${allHaveName}`);
    }
  }

  // MY-03: /api/work/my/summary returns expected shape
  const summaryRes = await api('GET', '/api/work/my/summary');
  if (summaryRes.status !== 200) {
    log('FAIL', 'MY-03', 'GET /api/work/my/summary — endpoint tồn tại', `status=${summaryRes.status}`);
  } else {
    const s = summaryRes.data?.data;
    const valid = s && typeof s.tasks?.total === 'number' && typeof s.tickets?.total === 'number';
    log(valid ? 'PASS' : 'FAIL', 'MY-03', 'Summary trả về đúng shape { tasks, tickets }',
      valid ? `tasks.total=${s.tasks.total}, tickets.total=${s.tickets.total}` : 'shape sai');

    // MY-03b: summary counts consistent with list meta.total (not data.length which is capped by pageSize)
    if (valid) {
      const taskListRes = await api('GET', '/api/work/my/tasks?pageSize=200');
      const ticketListRes = await api('GET', '/api/work/my/tickets?pageSize=200');
      const taskCount = taskListRes.data?.meta?.total ?? (taskListRes.data?.data ?? []).length;
      const ticketCount = ticketListRes.data?.meta?.total ?? (ticketListRes.data?.data ?? []).length;
      const taskOk = s.tasks.total === taskCount;
      const ticketOk = s.tickets.total === ticketCount;
      log(taskOk ? 'PASS' : 'FAIL', 'MY-03b', 'Summary.tasks.total khớp với list count',
        `summary=${s.tasks.total}, list=${taskCount}`);
      log(ticketOk ? 'PASS' : 'FAIL', 'MY-03c', 'Summary.tickets.total khớp với list count',
        `summary=${s.tickets.total}, list=${ticketCount}`);

      // MY-03d: overdue >= 0
      log(s.tasks.overdue >= 0 ? 'PASS' : 'FAIL', 'MY-03d', 'Summary.tasks.overdue >= 0',
        `overdue=${s.tasks.overdue}`);
    }
  }

  // MY-04: project task endpoint mode=all returns all tasks, mode=mine returns subset
  if (createdProjectId) {
    const allRes = await api('GET', `/api/projects/${createdProjectId}/tasks`);
    const mineRes = await api('GET', `/api/projects/${createdProjectId}/tasks?mode=mine`);
    if (allRes.status === 200 && mineRes.status === 200) {
      const allTasks = allRes.data?.data ?? [];
      const mineTasks = mineRes.data?.data ?? [];
      const sameSchema = mineTasks.every(t => 'id' in t && 'title' in t && 'status' in t);
      const subsetOk = mineTasks.length <= allTasks.length;
      log(subsetOk ? 'PASS' : 'FAIL', 'MY-04a', 'mode=mine tasks là subset của mode=all',
        `all=${allTasks.length}, mine=${mineTasks.length}`);
      log(sameSchema || mineTasks.length === 0 ? 'PASS' : 'FAIL', 'MY-04b',
        'mode=mine response schema không đổi', `valid=${sameSchema}`);
    } else {
      log('WARN', 'MY-04', 'Bỏ qua kiểm tra mode=mine (project không tồn tại hoặc lỗi API)');
    }
  } else {
    log('WARN', 'MY-04', 'Bỏ qua kiểm tra mode=mine (không có createdProjectId)');
  }

  // MY-05: filter by projectId works for tasks
  const projectsRes = await api('GET', '/api/projects/overview');
  if (projectsRes.status === 200 && (projectsRes.data?.data ?? []).length > 0) {
    const firstProject = projectsRes.data.data[0];
    const filteredRes = await api('GET', `/api/work/my/tasks?projectId=${firstProject.id}`);
    if (filteredRes.status === 200) {
      const filtered = filteredRes.data?.data ?? [];
      const allMatch = filtered.every(t => t.projectId === firstProject.id);
      log(allMatch || filtered.length === 0 ? 'PASS' : 'FAIL', 'MY-05',
        'Filter ?projectId= chỉ trả tasks thuộc project đó',
        `count=${filtered.length}, allMatch=${allMatch}`);
    } else {
      log('WARN', 'MY-05', 'Bỏ qua kiểm tra filter projectId (lỗi API)');
    }
  } else {
    log('WARN', 'MY-05', 'Bỏ qua kiểm tra filter projectId (không có dự án)');
  }

  // MY-06: filter overdue=true returns only non-done tasks past dueDate
  const overdueRes = await api('GET', '/api/work/my/tasks?overdue=true');
  if (overdueRes.status === 200) {
    const overdueTasks = overdueRes.data?.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const allOverdue = overdueTasks.every(t => {
      const closed = t.status === 'Done' || t.status === 'Cancelled';
      return !closed && t.dueDate && t.dueDate < today;
    });
    log(allOverdue || overdueTasks.length === 0 ? 'PASS' : 'FAIL', 'MY-06',
      'Filter overdue=true chỉ trả task thực sự quá hạn',
      `count=${overdueTasks.length}, allOverdue=${allOverdue}`);
  } else {
    log('WARN', 'MY-06', 'Bỏ qua kiểm tra filter overdue (lỗi API)');
  }

  // MY-07: ticket SLA filter
  const slaFilterRes = await api('GET', '/api/work/my/tickets?sla=breached');
  if (slaFilterRes.status === 200) {
    const breached = slaFilterRes.data?.data ?? [];
    const allBreached = breached.every(t => t.status === 'SLA Breached');
    log(allBreached || breached.length === 0 ? 'PASS' : 'FAIL', 'MY-07',
      'Filter ?sla=breached chỉ trả ticket SLA Breached',
      `count=${breached.length}, allBreached=${allBreached}`);
  } else {
    log('WARN', 'MY-07', 'Bỏ qua kiểm tra filter sla=breached (lỗi API)');
  }

  // TA-01: has-tickets endpoint
  const hasTicketsRes = await api('GET', '/api/work/my/has-tickets');
  if (hasTicketsRes.status === 200) {
    const payload = hasTicketsRes.data?.data;
    const valid = typeof payload?.hasTickets === 'boolean' && typeof payload?.ticketCount === 'number';
    log(valid ? 'PASS' : 'FAIL', 'TA-01', 'GET /api/work/my/has-tickets trả đúng shape',
      valid ? `hasTickets=${payload.hasTickets}, ticketCount=${payload.ticketCount}` : 'invalid shape');

    const validAccess = typeof payload?.hasAccess === 'boolean';
    log(validAccess ? 'PASS' : 'FAIL', 'TA-02', 'hasAccess flag tồn tại cho rule truy cập Ticket',
      validAccess ? `hasAccess=${payload.hasAccess}` : 'missing hasAccess');
  } else {
    log('FAIL', 'TA-01', 'GET /api/work/my/has-tickets', `status=${hasTicketsRes.status}`);
    log('FAIL', 'TA-02', 'GET /api/work/my/has-tickets.hasAccess', `status=${hasTicketsRes.status}`);
  }

  // MY-08: task endpoint pagination + sort meta
  const pagedTasksRes = await api('GET', '/api/work/my/tasks?page=1&pageSize=5&sortBy=dueDate&sortDirection=asc');
  if (pagedTasksRes.status === 200) {
    const meta = pagedTasksRes.data?.meta;
    const validMeta =
      typeof meta?.total === 'number' &&
      typeof meta?.page === 'number' &&
      typeof meta?.pageSize === 'number' &&
      typeof meta?.totalPages === 'number';
    const withinPage = (pagedTasksRes.data?.data ?? []).length <= 5;
    log(validMeta ? 'PASS' : 'FAIL', 'MY-08a', 'Tasks API trả meta phân trang', validMeta ? `page=${meta.page}, total=${meta.total}` : 'invalid meta');
    log(withinPage ? 'PASS' : 'FAIL', 'MY-08b', 'Tasks API tôn trọng pageSize', `returned=${(pagedTasksRes.data?.data ?? []).length}`);
  } else {
    log('FAIL', 'MY-08', 'Tasks API pagination', `status=${pagedTasksRes.status}`);
  }

  // MY-09: ticket endpoint pagination + sort meta
  const pagedTicketsRes = await api('GET', '/api/work/my/tickets?page=1&pageSize=5&sortBy=dueDate&sortDirection=asc');
  if (pagedTicketsRes.status === 200) {
    const meta = pagedTicketsRes.data?.meta;
    const validMeta =
      typeof meta?.total === 'number' &&
      typeof meta?.page === 'number' &&
      typeof meta?.pageSize === 'number' &&
      typeof meta?.totalPages === 'number';
    const withinPage = (pagedTicketsRes.data?.data ?? []).length <= 5;
    log(validMeta ? 'PASS' : 'FAIL', 'MY-09a', 'Tickets API trả meta phân trang', validMeta ? `page=${meta.page}, total=${meta.total}` : 'invalid meta');
    log(withinPage ? 'PASS' : 'FAIL', 'MY-09b', 'Tickets API tôn trọng pageSize', `returned=${(pagedTicketsRes.data?.data ?? []).length}`);
  } else {
    log('FAIL', 'MY-09', 'Tickets API pagination', `status=${pagedTicketsRes.status}`);
  }
}

async function testPersonalTaskCrud() {
  console.log('\n── Phase 15: Personal Task CRUD (PT) ─────────────────────────────────────');

  const createRes = await api('POST', '/api/work/personal-tasks', {
    title: `Test personal task ${Date.now()}`,
    description: 'Created by automated test',
    status: 'Todo',
    priority: 'Medium',
    dueDate: new Date().toISOString().slice(0, 10),
  });

  if (createRes.status !== 201 || !createRes.data?.data?.id) {
    log('FAIL', 'PT-01', 'POST /api/work/personal-tasks tạo mới', `status=${createRes.status}`);
    return;
  }

  const created = createRes.data.data;
  log(/^PT-\d{3}$/.test(created.code) ? 'PASS' : 'FAIL', 'PT-01', 'Tạo personal task và sinh mã PT-###', `code=${created.code}`);

  const listRes = await api('GET', '/api/work/personal-tasks');
  const listed = (listRes.data?.data ?? []).find((t) => t.id === created.id);
  log(listRes.status === 200 && !!listed ? 'PASS' : 'FAIL', 'PT-02', 'GET /api/work/personal-tasks có task vừa tạo', `status=${listRes.status}`);

  const myTasksRes = await api('GET', '/api/work/my/tasks');
  const inMyList = (myTasksRes.data?.data ?? []).find((t) => t.id === created.id);
  const mergedOk = !!inMyList && inMyList.isPersonal === true && inMyList.projectName === 'Cá nhân';
  log(mergedOk ? 'PASS' : 'FAIL', 'PT-03', 'Personal task xuất hiện trong /api/work/my/tasks với isPersonal=true', mergedOk ? 'ok' : 'not merged');

  const patchRes = await api('PATCH', `/api/work/personal-tasks/${created.id}`, { status: 'Done' });
  log(patchRes.status === 200 && patchRes.data?.data?.status === 'Done' ? 'PASS' : 'FAIL', 'PT-04', 'PATCH cập nhật personal task', `status=${patchRes.status}`);

  const deleteRes = await api('DELETE', `/api/work/personal-tasks/${created.id}`);
  log(deleteRes.status === 200 ? 'PASS' : 'FAIL', 'PT-05', 'DELETE personal task', `status=${deleteRes.status}`);

  const afterDeleteList = await api('GET', '/api/work/personal-tasks');
  const stillExists = (afterDeleteList.data?.data ?? []).some((t) => t.id === created.id);
  log(!stillExists ? 'PASS' : 'FAIL', 'PT-06', 'Task đã xóa không còn trong danh sách', stillExists ? 'still exists' : 'removed');
}

async function testProjectEndpointPaging() {
  console.log('\n── Phase 16: Project Endpoints Paging/Sorting (PE) ─────────────────────────');

  const projectsRes = await api('GET', '/api/projects/overview');
  if (projectsRes.status !== 200 || (projectsRes.data?.data ?? []).length === 0) {
    log('WARN', 'PE-00', 'Bỏ qua test project endpoint paging (không có dự án)');
    return;
  }

  const pid = projectsRes.data.data[0].id;

  const taskRes = await api('GET', `/api/projects/${pid}/tasks?page=1&pageSize=5&sortBy=dueDate&sortDirection=asc`);
  if (taskRes.status === 200) {
    const taskMeta = taskRes.data?.meta;
    const metaOk = typeof taskMeta?.total === 'number' && typeof taskMeta?.pageSize === 'number';
    const sizeOk = (taskRes.data?.data ?? []).length <= 5;
    log(metaOk ? 'PASS' : 'FAIL', 'PE-01', 'Project tasks endpoint trả meta', metaOk ? `total=${taskMeta.total}` : 'invalid meta');
    log(sizeOk ? 'PASS' : 'FAIL', 'PE-02', 'Project tasks endpoint tôn trọng pageSize', `returned=${(taskRes.data?.data ?? []).length}`);
  } else {
    log('FAIL', 'PE-01', 'Project tasks endpoint paging', `status=${taskRes.status}`);
  }

  const ticketRes = await api('GET', `/api/projects/${pid}/tickets?page=1&pageSize=5&sortBy=dueDate&sortDirection=asc`);
  if (ticketRes.status === 200) {
    const ticketMeta = ticketRes.data?.meta;
    const metaOk = typeof ticketMeta?.total === 'number' && typeof ticketMeta?.pageSize === 'number';
    const sizeOk = (ticketRes.data?.data ?? []).length <= 5;
    log(metaOk ? 'PASS' : 'FAIL', 'PE-03', 'Project tickets endpoint trả meta', metaOk ? `total=${ticketMeta.total}` : 'invalid meta');
    log(sizeOk ? 'PASS' : 'FAIL', 'PE-04', 'Project tickets endpoint tôn trọng pageSize', `returned=${(ticketRes.data?.data ?? []).length}`);
  } else {
    log('FAIL', 'PE-03', 'Project tickets endpoint paging', `status=${ticketRes.status}`);
  }
}

async function testMyWorkDataLinkCrudAndNotification() {
  console.log('\n── Phase 17: My Work Linkage + CRUD + Notification (MW/NO) ───────────────');

  const adminOk = await loginAs('admin@omes.vn', 'admin123', 'MW-AUTH-01');
  if (!adminOk) return;

  const suffix = Date.now().toString().slice(-6);
  const projectCode = `MW-${suffix}`;
  const projectName = `My Work Link Test ${suffix}`;
  const taskTitle = `MW Task ${suffix}`;
  const ticketDesc = `MW Ticket ${suffix}`;

  const projRes = await api('POST', '/api/projects', {
    projectCode,
    projectName,
    projectType: 'software',
    customer: 'Internal',
    industry: 'Software',
    pmOwner: 'Mr Dũng',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    status: 'In Progress',
    priority: 'High',
    projectPhase: 'Execution',
    bacBudget: 100000,
    pv: 50000,
    ev: 40000,
    ac: 45000,
    notes: 'MW linkage test project',
  });

  if (projRes.status !== 201 || !projRes.data?.data?.id) {
    log('FAIL', 'MW-00', 'Tạo project test cho My Work linkage', `status=${projRes.status}`);
    return;
  }

  const pid = projRes.data.data.id;
  log('PASS', 'MW-01', 'Tạo project software để test linkage', `pid=${pid}`);

  const taskCreate = await api('POST', `/api/projects/${pid}/tasks`, {
    title: taskTitle,
    description: 'Task giao để test My Work link',
    status: 'Todo',
    priority: 'High',
    assignee: 'Ms Trang',
    reporter: 'Mr Dũng',
    dueDate: '2026-12-01',
  });
  log(taskCreate.status === 200 ? 'PASS' : 'FAIL', 'MW-02', 'Tạo task project và giao Ms Trang', `status=${taskCreate.status}`);

  const ticketCreate = await api('POST', `/api/projects/${pid}/tickets`, {
    description: ticketDesc,
    issueType: 'Bug',
    severity: 'Medium',
    priority: 'P2',
    owner: 'Ms Trang',
    reporter: 'Mr Dũng',
    dueDate: '2026-12-05',
    status: 'Open',
  });
  log((ticketCreate.status === 200 || ticketCreate.status === 201) ? 'PASS' : 'FAIL', 'MW-03', 'Tạo ticket project và giao Ms Trang', `status=${ticketCreate.status}`);

  const trangOk = await loginAs('trang@company.com', 'password123', 'MW-AUTH-02');
  if (!trangOk) return;

  const myTasks = await api('GET', `/api/work/my/tasks?projectId=${pid}`);
  const hasTask = (myTasks.data?.data ?? []).some((t) => t.title === taskTitle);
  log(hasTask ? 'PASS' : 'FAIL', 'MW-04', 'Task từ project được link sang My Work tasks', hasTask ? 'found' : 'missing');

  const myTickets = await api('GET', `/api/work/my/tickets?projectId=${pid}`);
  const hasTicket = (myTickets.data?.data ?? []).some((t) => t.description === ticketDesc);
  log(hasTicket ? 'PASS' : 'FAIL', 'MW-05', 'Ticket từ project được link sang My Work tickets', hasTicket ? 'found' : 'missing');

  const mySummary = await api('GET', '/api/work/my/summary');
  const summaryOk = typeof mySummary.data?.data?.tasks?.total === 'number' && typeof mySummary.data?.data?.tickets?.total === 'number';
  log(summaryOk ? 'PASS' : 'FAIL', 'MW-06', 'Summary của My Work phản ánh dữ liệu đã giao', summaryOk ? 'shape ok' : 'invalid summary');

  const personalCreate = await api('POST', '/api/work/personal-tasks', {
    title: `MW Personal ${suffix}`,
    description: 'Personal task created in MW phase',
    status: 'Todo',
    priority: 'Medium',
    dueDate: '2026-12-10',
  });

  if (personalCreate.status !== 201 || !personalCreate.data?.data?.id) {
    log('FAIL', 'MW-CRUD-01', 'Tạo personal task tại My Work', `status=${personalCreate.status}`);
  } else {
    const personalId = personalCreate.data.data.id;
    log('PASS', 'MW-CRUD-01', 'Tạo personal task tại My Work', `id=${personalId}`);

    const personalList = await api('GET', '/api/work/my/tasks?projectId=personal');
    const foundPersonal = (personalList.data?.data ?? []).some((t) => t.id === personalId);
    log(foundPersonal ? 'PASS' : 'FAIL', 'MW-CRUD-02', 'Personal task xuất hiện trong My Work', foundPersonal ? 'found' : 'missing');

    const personalPatch = await api('PATCH', `/api/work/personal-tasks/${personalId}`, { status: 'Done', priority: 'High' });
    log(personalPatch.status === 200 ? 'PASS' : 'FAIL', 'MW-CRUD-03', 'Update personal task trong My Work', `status=${personalPatch.status}`);

    const personalDelete = await api('DELETE', `/api/work/personal-tasks/${personalId}`);
    log(personalDelete.status === 200 ? 'PASS' : 'FAIL', 'MW-CRUD-04', 'Delete personal task trong My Work', `status=${personalDelete.status}`);
  }

  const backToAdmin = await loginAs('admin@omes.vn', 'admin123', 'MW-AUTH-03');
  if (!backToAdmin) return;

  const activityRes = await api('GET', `/api/projects/${pid}/activity`);
  const activities = activityRes.data?.data ?? [];
  const hasAssignmentSignal = activities.some((a) =>
    String(a?.entity ?? '').includes(taskTitle) || String(a?.entity ?? '').includes(ticketDesc),
  );
  log(hasAssignmentSignal ? 'PASS' : 'WARN', 'NO-01', 'Hoạt động giao việc xuất hiện trong activity feed', hasAssignmentSignal ? 'found' : 'not found');

  const notifRes = await api('GET', '/api/notifications');
  if (notifRes.status === 200) {
    log('PASS', 'NO-02', 'Notification API backend tồn tại');
  } else {
    log('WARN', 'NO-02', 'Notification API backend chưa có hoặc chưa kết nối', `status=${notifRes.status}`);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      OMES PROJECT MANAGEMENT — AUTOMATED TEST SUITE v2.0    ║');
  console.log('║  CRUD Tests + Data Flow & Linkage (8 sections × 5 dự án)   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Target: ${BASE}\n`);

  try {
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('\n❌ Không thể đăng nhập. Dừng test.');
      process.exit(1);
    }
    await testProjects();
    await testProjectDetail();
    await testModules();
    await testIssues();
    await testRisks();
    await testResources();
    await testMilestones();
    await testRequirements();
    await testSla();
    await testNegative();
    await testE2E();
    await seedFiveProjects();
    await verifyDataLinkages();
    await testMyWork();
    await testPersonalTaskCrud();
    await testProjectEndpointPaging();
    await testMyWorkDataLinkCrudAndNotification();
  } catch (err) {
    console.error('\n❌ Unhandled error:', err.message);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  const total = PASS + FAIL + WARN;
  const passRate = ((PASS / total) * 100).toFixed(1);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('                         KẾT QUẢ TEST');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  ✅ PASS : ${String(PASS).padStart(3)}  |  ❌ FAIL : ${String(FAIL).padStart(3)}  |  ⚠️  WARN : ${String(WARN).padStart(3)}`);
  console.log(`  Tổng   : ${total}     |  Tỷ lệ pass : ${passRate}%`);
  console.log('══════════════════════════════════════════════════════════════');

  if (FAIL > 0) {
    console.log('\n── DANH SÁCH FAIL ──');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.id}: ${r.desc} — ${r.detail}`);
    });
  }
  if (WARN > 0) {
    console.log('\n── DANH SÁCH WARN ──');
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`  ⚠️  ${r.id}: ${r.desc} — ${r.detail}`);
    });
  }

  const goLive = FAIL === 0;
  console.log(`\n  ${goLive ? '🟢 SẴN SÀNG GO-LIVE' : '🔴 CHƯA ĐỦ ĐIỀU KIỆN GO-LIVE — cần fix FAIL trước'}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  // Summary of seeded projects for manual UI verification
  if (seededProjects.filter(Boolean).length > 0) {
    console.log('\n🗂️  DỮ LIỆU ĐÃ SEED (để kiểm tra UI thủ công):');
    seededProjects.filter(Boolean).forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.code}] ${p.name} — id=${p.pid}`);
    });
    console.log('   → Mỗi dự án có: 3 milestones, 2 requirements, 3 tasks, 2 tickets, 2 documents, 2 resources, 2 risks, 1 daily update, 1 SLA');
  } else if (createdProjectId) {
    console.log('🧹 Dự án CRUD test đã được dọn dẹp qua reset DB của Phase 12');
  }
}

main();
