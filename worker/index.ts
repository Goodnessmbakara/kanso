import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, generateToken } from './auth';

type Bindings = {
  DB: D1Database;
  ASSETS?: Fetcher;
};

type Variables = {
  user: {
    id: string;
    email: string;
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper to compute next due date given recurrence string and current due date
function calculateNextDue(currentDueStr: string | null, recurStr: string): { due_at: string; reminder_at: string | null } | null {
  try {
    const recur = JSON.parse(recurStr);
    const hasTime = currentDueStr && currentDueStr.includes('T');
    const baseDate = currentDueStr ? new Date(currentDueStr) : new Date();
    if (isNaN(baseDate.getTime())) return null;

    const nextDate = new Date(baseDate.getTime());

    if (recur.unit === 'day') {
      const days = recur.every || 1;
      nextDate.setDate(nextDate.getDate() + days);
    } else if (recur.unit === 'week') {
      if (Array.isArray(recur.weekdays) && recur.weekdays.length > 0) {
        // Find next matching weekday (0=Sun, 1=Mon, ..., 6=Sat)
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const check = new Date(nextDate.getTime());
          check.setDate(check.getDate() + i);
          const day = check.getDay();
          if (recur.weekdays.includes(day)) {
            nextDate.setTime(check.getTime());
            found = true;
            break;
          }
        }
        if (!found) nextDate.setDate(nextDate.getDate() + 7);
      } else {
        const weeks = recur.every || 1;
        nextDate.setDate(nextDate.getDate() + weeks * 7);
      }
    } else if (recur.unit === 'month') {
      const months = recur.every || 1;
      nextDate.setMonth(nextDate.getMonth() + months);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    const due_at = hasTime ? nextDate.toISOString() : nextDate.toISOString().slice(0, 10);
    const reminder_at = hasTime ? due_at : null;
    return { due_at, reminder_at };
  } catch {
    return null;
  }
}

// ------------------- AUTH MIDDLEWARE -------------------
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  // Public auth endpoints
  if (path === '/api/auth/login' || path === '/api/auth/register') {
    return next();
  }

  const token = getCookie(c, 'todo_session');
  if (!token) {
    return c.json({ error: 'Not signed in' }, 401);
  }

  const sessionRow = await c.env.DB.prepare(
    `SELECT s.token, s.expires_at, u.id, u.email 
     FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.token = ?`
  )
    .bind(token)
    .first<{ token: string; expires_at: string; id: string; email: string }>();

  if (!sessionRow || new Date(sessionRow.expires_at) < new Date()) {
    deleteCookie(c, 'todo_session');
    return c.json({ error: 'Session expired' }, 401);
  }

  c.set('user', { id: sessionRow.id, email: sessionRow.email });
  return next();
});

// ------------------- AUTH ROUTES -------------------
app.post('/api/auth/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }));
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password || password.length < 8) {
    return c.json({ error: 'Email and password (min 8 chars) required' }, 400);
  }

  // Check if exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();
  if (existing) {
    return c.json({ error: 'Account with this email already exists' }, 400);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
  )
    .bind(userId, email, passwordHash)
    .run();

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run();

  setCookie(c, 'todo_session', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 3600,
  });

  return c.json({
    user: { id: userId, email },
    lists: [],
    tasks: [],
    members: [],
  });
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as { email?: string; password?: string }));
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expiresAt)
    .run();

  setCookie(c, 'todo_session', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 3600,
  });

  // Return full bootstrap state on login
  return fetchBootstrapData(c, user.id, user.email);
});

app.post('/api/auth/logout', async (c) => {
  const token = getCookie(c, 'todo_session');
  if (token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    deleteCookie(c, 'todo_session');
  }
  return c.json({ ok: true });
});

app.get('/api/auth/me', (c) => {
  return c.json({ user: c.get('user') });
});

// Helper for aggregating accessible lists, tasks, and list_members
async function fetchBootstrapData(c: any, userId: string, userEmail: string) {
  // Lists user owns or is a member of
  const listsRes = await c.env.DB.prepare(
    `SELECT l.id, l.owner_id, l.name, l.created_at
     FROM lists l
     LEFT JOIN list_members lm ON l.id = lm.list_id
     WHERE l.owner_id = ? OR lm.user_id = ?
     GROUP BY l.id
     ORDER BY l.created_at ASC`
  )
    .bind(userId, userId)
    .all();

  const listIds = (listsRes.results || []).map((l: any) => l.id);

  let tasks: any[] = [];
  let members: any[] = [];

  if (listIds.length > 0) {
    const placeholders = listIds.map(() => '?').join(',');

    const tasksRes = await c.env.DB.prepare(
      `SELECT * FROM tasks WHERE list_id IN (${placeholders}) ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(...listIds)
      .all();
    tasks = tasksRes.results || [];

    const membersRes = await c.env.DB.prepare(
      `SELECT lm.list_id, lm.user_id, u.email, lm.created_at
       FROM list_members lm
       JOIN users u ON lm.user_id = u.id
       WHERE lm.list_id IN (${placeholders})`
    )
      .bind(...listIds)
      .all();
    members = membersRes.results || [];
  }

  return c.json({
    user: { id: userId, email: userEmail },
    lists: listsRes.results || [],
    tasks,
    members,
  });
}

// ------------------- BOOTSTRAP -------------------
app.get('/api/bootstrap', async (c) => {
  const user = c.get('user');
  return fetchBootstrapData(c, user.id, user.email);
});

// ------------------- LISTS -------------------
app.post('/api/lists', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ id?: string; name: string }>().catch(() => ({ name: '', id: undefined }));
  const name = body.name?.trim();
  if (!name) return c.json({ error: 'List name required' }, 400);

  const listId = body.id || crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO lists (id, owner_id, name, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(listId, user.id, name, createdAt)
    .run();

  return c.json({
    list: {
      id: listId,
      owner_id: user.id,
      name,
      created_at: createdAt,
    },
  });
});

app.patch('/api/lists/:id', async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');
  const body = await c.req.json<{ name: string }>().catch(() => ({ name: '' }));
  const name = body.name?.trim();
  if (!name) return c.json({ error: 'Name required' }, 400);

  // Check permission (owner or member)
  const accessible = await c.env.DB.prepare(
    `SELECT l.id FROM lists l 
     LEFT JOIN list_members lm ON l.id = lm.list_id 
     WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)`
  )
    .bind(listId, user.id, user.id)
    .first();

  if (!accessible) return c.json({ error: 'List not found or permission denied' }, 404);

  await c.env.DB.prepare('UPDATE lists SET name = ? WHERE id = ?').bind(name, listId).run();
  return c.json({ ok: true, name });
});

app.delete('/api/lists/:id', async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');

  // Only owner can delete list
  const list = await c.env.DB.prepare('SELECT owner_id FROM lists WHERE id = ?')
    .bind(listId)
    .first<{ owner_id: string }>();

  if (!list) return c.json({ error: 'List not found' }, 404);
  if (list.owner_id !== user.id) return c.json({ error: 'Only owner can delete this list' }, 403);

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM tasks WHERE list_id = ?').bind(listId),
    c.env.DB.prepare('DELETE FROM list_members WHERE list_id = ?').bind(listId),
    c.env.DB.prepare('DELETE FROM lists WHERE id = ?').bind(listId),
  ]);

  return c.json({ ok: true });
});

// ------------------- SHARING / COLLABORATION -------------------
app.post('/api/lists/:id/share', async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');
  const body = await c.req.json<{ email: string }>().catch(() => ({ email: '' }));
  const targetEmail = body.email?.trim().toLowerCase();

  if (!targetEmail) return c.json({ error: 'Email required' }, 400);

  // Verify list ownership
  const list = await c.env.DB.prepare('SELECT owner_id FROM lists WHERE id = ?')
    .bind(listId)
    .first<{ owner_id: string }>();

  if (!list || list.owner_id !== user.id) {
    return c.json({ error: 'Only the list owner can share this list' }, 403);
  }

  // Find target user
  const targetUser = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
    .bind(targetEmail)
    .first<{ id: string; email: string }>();

  if (!targetUser) {
    return c.json({ error: `No account found for "${targetEmail}". They must register first.` }, 404);
  }

  if (targetUser.id === user.id) {
    return c.json({ error: 'You already own this list' }, 400);
  }

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO list_members (list_id, user_id) VALUES (?, ?)'
  )
    .bind(listId, targetUser.id)
    .run();

  const membersRes = await c.env.DB.prepare(
    `SELECT lm.user_id, u.email, lm.created_at
     FROM list_members lm
     JOIN users u ON lm.user_id = u.id
     WHERE lm.list_id = ?`
  )
    .bind(listId)
    .all();

  return c.json({ ok: true, members: membersRes.results || [] });
});

app.delete('/api/lists/:id/share/:userId', async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');
  const targetUserId = c.req.param('userId');

  const list = await c.env.DB.prepare('SELECT owner_id FROM lists WHERE id = ?')
    .bind(listId)
    .first<{ owner_id: string }>();

  if (!list) return c.json({ error: 'List not found' }, 404);

  // Either list owner, or user unsharing themselves
  if (list.owner_id !== user.id && user.id !== targetUserId) {
    return c.json({ error: 'Permission denied' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')
    .bind(listId, targetUserId)
    .run();

  const membersRes = await c.env.DB.prepare(
    `SELECT lm.user_id, u.email, lm.created_at
     FROM list_members lm
     JOIN users u ON lm.user_id = u.id
     WHERE lm.list_id = ?`
  )
    .bind(listId)
    .all();

  return c.json({ ok: true, members: membersRes.results || [] });
});

// ------------------- TASKS -------------------
app.post('/api/tasks', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    id?: string;
    list_id: string;
    parent_id?: string | null;
    title: string;
    notes?: string;
    due_at?: string | null;
    reminder_at?: string | null;
    priority?: number;
    sort_order?: number;
    recur?: string | null;
  }>().catch(() => null);

  if (!body || !body.list_id || !body.title?.trim()) {
    return c.json({ error: 'list_id and title required' }, 400);
  }

  // Check access to list
  const access = await c.env.DB.prepare(
    `SELECT l.id FROM lists l 
     LEFT JOIN list_members lm ON l.id = lm.list_id 
     WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)`
  )
    .bind(body.list_id, user.id, user.id)
    .first();

  if (!access) return c.json({ error: 'List not found or access denied' }, 403);

  const taskId = body.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const task = {
    id: taskId,
    list_id: body.list_id,
    parent_id: body.parent_id || null,
    title: body.title.trim(),
    notes: body.notes || '',
    due_at: body.due_at || null,
    reminder_at: body.reminder_at || null,
    priority: body.priority || 0,
    completed_at: null,
    sort_order: body.sort_order || 0,
    recur: body.recur || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  await c.env.DB.prepare(
    `INSERT INTO tasks (id, list_id, parent_id, title, notes, due_at, reminder_at, priority, completed_at, sort_order, recur, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      task.id,
      task.list_id,
      task.parent_id,
      task.title,
      task.notes,
      task.due_at,
      task.reminder_at,
      task.priority,
      task.completed_at,
      task.sort_order,
      task.recur,
      task.created_by,
      task.created_at,
      task.updated_at
    )
    .run();

  return c.json({ task });
});

app.patch('/api/tasks/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');
  const changes: Record<string, any> = await c.req.json<Record<string, any>>().catch(() => ({}));

  // Fetch current task
  const existing = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(taskId)
    .first<any>();

  if (!existing) return c.json({ error: 'Task not found' }, 404);

  // Check access to task's list
  const access = await c.env.DB.prepare(
    `SELECT l.id FROM lists l 
     LEFT JOIN list_members lm ON l.id = lm.list_id 
     WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)`
  )
    .bind(existing.list_id, user.id, user.id)
    .first();

  if (!access) return c.json({ error: 'Access denied' }, 403);

  const allowedFields = [
    'title',
    'notes',
    'due_at',
    'reminder_at',
    'priority',
    'completed_at',
    'sort_order',
    'recur',
    'list_id',
    'parent_id',
  ];

  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (field in changes) {
      updates.push(`${field} = ?`);
      values.push(changes[field]);
    }
  }

  if (updates.length === 0) {
    return c.json({ task: existing });
  }

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  values.push(now);
  values.push(taskId);

  await c.env.DB.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updatedTask = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(taskId)
    .first<any>();

  // Check recurrence spawning: if task just got completed and has recur rule
  let spawned: any = null;
  const isNowCompleted = Boolean(changes.completed_at);
  const wasNotCompleted = !existing.completed_at;

  if (isNowCompleted && wasNotCompleted && updatedTask.recur) {
    const nextDue = calculateNextDue(updatedTask.due_at, updatedTask.recur);
    if (nextDue) {
      const nextId = crypto.randomUUID();
      const nextSortOrder = (updatedTask.sort_order || 0) + 1;
      spawned = {
        id: nextId,
        list_id: updatedTask.list_id,
        parent_id: updatedTask.parent_id,
        title: updatedTask.title,
        notes: updatedTask.notes || '',
        due_at: nextDue.due_at,
        reminder_at: nextDue.reminder_at,
        priority: updatedTask.priority,
        completed_at: null,
        sort_order: nextSortOrder,
        recur: updatedTask.recur,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      };

      await c.env.DB.prepare(
        `INSERT INTO tasks (id, list_id, parent_id, title, notes, due_at, reminder_at, priority, completed_at, sort_order, recur, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          spawned.id,
          spawned.list_id,
          spawned.parent_id,
          spawned.title,
          spawned.notes,
          spawned.due_at,
          spawned.reminder_at,
          spawned.priority,
          spawned.completed_at,
          spawned.sort_order,
          spawned.recur,
          spawned.created_by,
          spawned.created_at,
          spawned.updated_at
        )
        .run();
    }
  }

  return c.json({ task: updatedTask, spawned });
});

app.delete('/api/tasks/:id', async (c) => {
  const user = c.get('user');
  const taskId = c.req.param('id');

  const task = await c.env.DB.prepare('SELECT list_id FROM tasks WHERE id = ?')
    .bind(taskId)
    .first<{ list_id: string }>();

  if (!task) return c.json({ error: 'Task not found' }, 404);

  // Check access to list
  const access = await c.env.DB.prepare(
    `SELECT l.id FROM lists l 
     LEFT JOIN list_members lm ON l.id = lm.list_id 
     WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)`
  )
    .bind(task.list_id, user.id, user.id)
    .first();

  if (!access) return c.json({ error: 'Access denied' }, 403);

  // Delete subtasks and task
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM tasks WHERE parent_id = ?').bind(taskId),
    c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId),
  ]);

  return c.json({ ok: true });
});

// Fallback to static assets if served from Cloudflare Workers
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.notFound();
});

export default app;
