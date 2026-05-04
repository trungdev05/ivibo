type LoginResult = {
  cookie: string;
  user: { id: string; fullName: string; email: string };
};

type MyTask = {
  id: string;
  title: string;
  code: string;
};

type NotificationItem = {
  id: string;
  type: string;
  actorName?: string;
  taskId?: string;
  link?: string;
  unread: boolean;
};

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

function logCheck(id: string, ok: boolean, detail: string) {
  checks.push({ id, ok, detail });
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${id} - ${detail}`);
}

function printSummaryAndExit() {
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  console.log('');
  console.log('=== API Comment + Notification Flow Summary ===');
  console.log(`Total: ${checks.length}`);
  console.log(`Pass : ${passed}`);
  console.log(`Fail : ${failed}`);
  if (failed > 0) process.exit(1);
}

async function requestJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

async function resetDb() {
  const { res } = await requestJson('/api/projects', {
    method: 'DELETE',
    headers: {
      'x-user-role': 'admin',
    },
  });
  logCheck('API-00', res.status === 200, `reset db status=${res.status}`);
}

async function login(email: string, password: string): Promise<LoginResult> {
  const { res, data } = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 200) {
    throw new Error(`Login failed (${email}), status=${res.status}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`Missing set-cookie for ${email}`);
  const cookie = setCookie.split(';')[0];

  const user = (data as { user?: { id: string; fullName: string; email: string } })?.user;
  if (!user) throw new Error(`Missing user payload for ${email}`);

  return { cookie, user };
}

async function listMyTasks(cookie: string): Promise<MyTask[]> {
  const { res, data } = await requestJson('/api/work/my/tasks?page=1&pageSize=20&sortBy=updatedAt&sortDirection=desc', {
    method: 'GET',
    headers: { Cookie: cookie },
  });
  if (res.status !== 200) throw new Error(`listMyTasks failed: status=${res.status}`);
  return ((data as { data?: MyTask[] })?.data ?? []).map((t) => ({ id: t.id, title: t.title, code: t.code }));
}

async function listTaskComments(cookie: string, taskId: string) {
  const { res, data } = await requestJson(`/api/work/my/tasks/${taskId}/comments`, {
    method: 'GET',
    headers: { Cookie: cookie },
  });
  if (res.status !== 200) throw new Error(`listTaskComments failed: status=${res.status}`);
  return (data as { data?: Array<{ id: string; content: string; authorName: string; mentionUserIds?: string[] }> })?.data ?? [];
}

async function postComment(cookie: string, taskId: string, content: string, mentionUserIds: string[]) {
  const { res, data } = await requestJson(`/api/work/my/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ content, mentionUserIds, attachments: [] }),
  });
  return { status: res.status, data };
}

async function listNotifications(cookie: string, unreadOnly = false): Promise<NotificationItem[]> {
  const suffix = unreadOnly ? '?limit=50&unreadOnly=true' : '?limit=50';
  const { res, data } = await requestJson(`/api/notifications${suffix}`, {
    method: 'GET',
    headers: { Cookie: cookie },
  });
  if (res.status !== 200) throw new Error(`listNotifications failed: status=${res.status}`);
  return (data as { data?: NotificationItem[] })?.data ?? [];
}

async function markNotificationRead(cookie: string, id: string) {
  const { res } = await requestJson('/api/notifications/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ id }),
  });
  return res.status;
}

async function main() {
  try {
    await requestJson('/api/auth/me');
  } catch {
    console.error('Cannot connect to server. Start app first (npm run dev) or set TEST_BASE_URL.');
    process.exit(1);
  }

  await resetDb();

  const actor = await login('dung@company.com', 'password123');
  const target = await login('trang@company.com', 'password123');

  logCheck('API-01', actor.user.fullName === 'Mr Dũng', `actor=${actor.user.fullName}`);
  logCheck('API-02', target.user.fullName === 'Ms Trang', `target=${target.user.fullName}`);

  const tasks = await listMyTasks(actor.cookie);
  logCheck('API-03', tasks.length >= 2, `actor tasks=${tasks.length}`);
  if (tasks.length < 2) return printSummaryAndExit();

  const taskUnderTest = tasks[0];
  const controlTask = tasks[1];

  const beforeMain = await listTaskComments(actor.cookie, taskUnderTest.id);
  const beforeControl = await listTaskComments(actor.cookie, controlTask.id);

  const stamp = new Date().toISOString();
  const content = `API mention flow ${stamp} @${target.user.fullName}`;

  const post = await postComment(actor.cookie, taskUnderTest.id, content, [target.user.id]);
  logCheck('API-04', post.status === 201, `post comment status=${post.status}`);

  const afterMain = await listTaskComments(actor.cookie, taskUnderTest.id);
  const afterControl = await listTaskComments(actor.cookie, controlTask.id);

  logCheck('API-05', afterMain.length === beforeMain.length + 1, `main before=${beforeMain.length}, after=${afterMain.length}`);
  logCheck('API-06', afterControl.length === beforeControl.length, `control before=${beforeControl.length}, after=${afterControl.length}`);

  const newest = afterMain[afterMain.length - 1];
  const hasMentionId = (newest?.mentionUserIds ?? []).includes(target.user.id);
  logCheck('API-07', newest?.content === content, `newest content match=${newest?.content === content}`);
  logCheck('API-08', hasMentionId, `mentionUserIds=${JSON.stringify(newest?.mentionUserIds ?? [])}`);

  const unread = await listNotifications(target.cookie, true);
  const mentionNoti = unread.find((n) => n.type === 'mention' && n.taskId === taskUnderTest.id && n.actorName === actor.user.fullName);

  logCheck('API-09', !!mentionNoti, `mention notification found=${!!mentionNoti}`);
  logCheck(
    'API-10',
    mentionNoti?.link === `/work?taskId=${taskUnderTest.id}&openTab=comments`,
    `link=${mentionNoti?.link ?? 'n/a'}`,
  );

  if (mentionNoti) {
    const markStatus = await markNotificationRead(target.cookie, mentionNoti.id);
    logCheck('API-11', markStatus === 200, `mark read status=${markStatus}`);

    const unreadAfter = await listNotifications(target.cookie, true);
    logCheck('API-12', unreadAfter.every((n) => n.id !== mentionNoti.id), 'notification removed from unread list');
  }

  printSummaryAndExit();
}

main();
