import {
  OMES_USERS,
  addTaskCommentById,
  createMentionNotifications,
  createPersonalTask,
  listNotificationsForUser,
  listTaskCommentsById,
  markNotificationRead,
  resetDb,
} from '../lib/omes-mock';

type Check = {
  id: string;
  title: string;
  ok: boolean;
  detail?: string;
};

const checks: Check[] = [];

function addCheck(id: string, title: string, ok: boolean, detail?: string) {
  checks.push({ id, title, ok, detail });
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${id} - ${title}${detail ? `: ${detail}` : ''}`);
}

function summary() {
  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.length - pass;
  console.log('');
  console.log('=== Comment + Mention Notification Flow Summary ===');
  console.log(`Total: ${checks.length}`);
  console.log(`Pass : ${pass}`);
  console.log(`Fail : ${fail}`);
  console.log('');
  if (fail > 0) process.exit(1);
}

function main() {
  resetDb();

  const actor = OMES_USERS.find((u) => u.name === 'Mr Dũng');
  const target = OMES_USERS.find((u) => u.name === 'Ms Trang');

  addCheck('PRE-01', 'Actor exists', !!actor);
  addCheck('PRE-02', 'Target exists', !!target);
  if (!actor || !target) return summary();

  const taskA = createPersonalTask(actor.name, {
    title: 'Comment flow task A',
    description: 'Task to test comment persistence by task id',
    status: 'Todo',
    priority: 'High',
    dueDate: '2026-05-10',
  });
  const taskB = createPersonalTask(actor.name, {
    title: 'Comment flow task B',
    status: 'Todo',
    priority: 'Low',
    dueDate: '2026-05-11',
  });

  const content = `Please review this item @${target.name}`;
  const addResult = addTaskCommentById({
    taskId: taskA.id,
    authorId: actor.id,
    authorName: actor.name,
    content,
    mentionUserIds: [target.id],
    attachments: [],
  });

  addCheck('CMT-01', 'Add comment succeeds', !!addResult?.comment?.id);

  const commentsA = listTaskCommentsById(taskA.id);
  const commentsB = listTaskCommentsById(taskB.id);

  addCheck('CMT-02', 'Comment saved on correct task', commentsA.length === 1, `taskA comments=${commentsA.length}`);
  addCheck('CMT-03', 'Comment not leaked to other task', commentsB.length === 0, `taskB comments=${commentsB.length}`);
  addCheck(
    'CMT-04',
    'Mention metadata is stored',
    (commentsA[0]?.mentionUserIds ?? []).includes(target.id),
    `mentionUserIds=${JSON.stringify(commentsA[0]?.mentionUserIds ?? [])}`,
  );

  createMentionNotifications({
    actorName: actor.name,
    actorId: actor.id,
    taskId: taskA.id,
    taskCode: taskA.code,
    taskTitle: taskA.title,
    content,
    mentionedUserIds: [target.id, actor.id],
  });

  const targetNotifications = listNotificationsForUser(target.id, { limit: 20 });
  const actorNotifications = listNotificationsForUser(actor.id, { limit: 20 });
  const mentionNoti = targetNotifications.find((n) => n.taskId === taskA.id && n.type === 'mention');

  addCheck('NOTI-01', 'Mention notification created for tagged user', !!mentionNoti);
  addCheck('NOTI-02', 'Actor does not receive self-mention notification', actorNotifications.every((n) => n.taskId !== taskA.id));
  addCheck(
    'NOTI-03',
    'Notification deep-link points to task comment tab',
    mentionNoti?.link === `/work?taskId=${taskA.id}&openTab=comments`,
    `link=${mentionNoti?.link ?? 'n/a'}`,
  );

  if (mentionNoti) {
    const markReadOk = markNotificationRead(target.id, mentionNoti.id);
    const targetUnread = listNotificationsForUser(target.id, { unreadOnly: true, limit: 20 });
    addCheck('NOTI-04', 'Notification can be marked read', markReadOk);
    addCheck('NOTI-05', 'Unread list no longer contains notification', targetUnread.every((n) => n.id !== mentionNoti.id));
  }

  summary();
}

main();
