import express from 'express';
import cors from 'cors';
import { initDb, db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

initDb();

// --- Children CRUD ---

app.get('/api/children', (_req, res) => {
  const rows = db().prepare('SELECT * FROM children ORDER BY name ASC').all();
  res.json(rows.map(mapChild));
});

app.post('/api/children', (req, res) => {
  const { name, birthDate, avatarColor, notes } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const id = crypto.randomUUID();
  db().prepare(
    'INSERT INTO children (id, name, birth_date, avatar_color, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), birthDate || null, avatarColor || '#8b5cf6', notes || null);
  const child = db().prepare('SELECT * FROM children WHERE id = ?').get(id);
  res.json(mapChild(child));
});

app.patch('/api/children/:id', (req, res) => {
  const { id } = req.params;
  const { name, birthDate, avatarColor, notes } = req.body;
  const existing = db().prepare('SELECT * FROM children WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Child not found' });
  db().prepare(
    'UPDATE children SET name = ?, birth_date = ?, avatar_color = ?, notes = ? WHERE id = ?'
  ).run(
    name !== undefined ? name.trim() : existing.name,
    birthDate !== undefined ? birthDate : existing.birth_date,
    avatarColor !== undefined ? avatarColor : existing.avatar_color,
    notes !== undefined ? notes : existing.notes,
    id
  );
  const updated = db().prepare('SELECT * FROM children WHERE id = ?').get(id);
  res.json(mapChild(updated));
});

app.delete('/api/children/:id', (req, res) => {
  const { id } = req.params;
  db().prepare('DELETE FROM child_goals WHERE child_id = ?').run(id);
  db().prepare('DELETE FROM child_schedule WHERE child_id = ?').run(id);
  db().prepare('DELETE FROM child_milestones WHERE child_id = ?').run(id);
  db().prepare('DELETE FROM child_daily_log WHERE child_id = ?').run(id);
  db().prepare('DELETE FROM children WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- Dashboard Stats ---

app.get('/api/children/dashboard/stats', (_req, res) => {
  const allChildren = db().prepare('SELECT * FROM children ORDER BY name ASC').all() as any[];
  const allGoals = db().prepare('SELECT * FROM child_goals').all() as any[];
  const todayDow = new Date().getDay();
  const todaySchedule = db().prepare(
    'SELECT * FROM child_schedule WHERE day_of_week = ? ORDER BY start_time ASC'
  ).all(todayDow) as any[];
  const allMilestones = db().prepare(
    'SELECT * FROM child_milestones ORDER BY achieved_date DESC'
  ).all() as any[];
  const recentLogs = db().prepare(
    'SELECT * FROM child_daily_log ORDER BY date DESC LIMIT 30'
  ).all() as any[];

  const childStats = allChildren.map((child: any) => {
    const goals = allGoals.filter((g: any) => g.child_id === child.id);
    const activeGoals = goals.filter((g: any) => g.status === 'active');
    const completedGoals = goals.filter((g: any) => g.status === 'completed');
    const schedule = todaySchedule.filter((s: any) => s.child_id === child.id);
    const milestones = allMilestones.filter((m: any) => m.child_id === child.id);
    const logs = recentLogs.filter((l: any) => l.child_id === child.id);
    const avgProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum: number, g: any) => sum + (g.progress || 0), 0) / activeGoals.length)
      : 0;

    const goalsByCategory: Record<string, { active: number; completed: number }> = {};
    goals.forEach((g: any) => {
      if (!goalsByCategory[g.category]) goalsByCategory[g.category] = { active: 0, completed: 0 };
      if (g.status === 'active') goalsByCategory[g.category].active++;
      if (g.status === 'completed') goalsByCategory[g.category].completed++;
    });

    return {
      child: mapChild(child),
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      avgProgress,
      todaySchedule: schedule.map(mapSchedule),
      recentMilestones: milestones.slice(0, 5).map(mapMilestone),
      recentLogs: logs.slice(0, 7).map(mapLog),
      goalsByCategory,
      goals: activeGoals.map(mapGoal),
    };
  });

  res.json({
    children: allChildren.map(mapChild),
    totalActiveGoals: allGoals.filter((g: any) => g.status === 'active').length,
    totalCompletedGoals: allGoals.filter((g: any) => g.status === 'completed').length,
    totalTodayActivities: todaySchedule.length,
    totalMilestones: allMilestones.length,
    childStats,
  });
});

// --- Goals CRUD ---

app.get('/api/children/:childId/goals', (req, res) => {
  const rows = db().prepare(
    'SELECT * FROM child_goals WHERE child_id = ? ORDER BY created_at DESC'
  ).all(req.params.childId);
  res.json(rows.map(mapGoal));
});

app.post('/api/children/:childId/goals', (req, res) => {
  const { category, title, description, targetDate } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Title and category required' });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db().prepare(
    'INSERT INTO child_goals (id, child_id, category, title, description, target_date, status, progress, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.childId, category, title.trim(), description || null, targetDate || null, 'active', 0, now, now);
  const goal = db().prepare('SELECT * FROM child_goals WHERE id = ?').get(id);
  res.json(mapGoal(goal));
});

app.patch('/api/children/:childId/goals/:goalId', (req, res) => {
  const { goalId } = req.params;
  const existing = db().prepare('SELECT * FROM child_goals WHERE id = ?').get(goalId) as any;
  if (!existing) return res.status(404).json({ error: 'Goal not found' });
  const { title, description, targetDate, status, progress, category } = req.body;
  db().prepare(
    'UPDATE child_goals SET title = ?, description = ?, target_date = ?, status = ?, progress = ?, category = ?, updated_at = ? WHERE id = ?'
  ).run(
    title !== undefined ? title.trim() : existing.title,
    description !== undefined ? description : existing.description,
    targetDate !== undefined ? targetDate : existing.target_date,
    status !== undefined ? status : existing.status,
    progress !== undefined ? Math.max(0, Math.min(100, progress)) : existing.progress,
    category !== undefined ? category : existing.category,
    new Date().toISOString(),
    goalId
  );
  const updated = db().prepare('SELECT * FROM child_goals WHERE id = ?').get(goalId);
  res.json(mapGoal(updated));
});

app.delete('/api/children/:childId/goals/:goalId', (req, res) => {
  db().prepare('DELETE FROM child_goals WHERE id = ?').run(req.params.goalId);
  res.json({ success: true });
});

// --- Schedule CRUD ---

app.get('/api/children/:childId/schedule', (req, res) => {
  const rows = db().prepare(
    'SELECT * FROM child_schedule WHERE child_id = ? ORDER BY day_of_week, start_time'
  ).all(req.params.childId);
  res.json(rows.map(mapSchedule));
});

app.post('/api/children/:childId/schedule', (req, res) => {
  const { dayOfWeek, startTime, endTime, activity, category, color } = req.body;
  if (dayOfWeek === undefined || !startTime || !endTime || !activity) {
    return res.status(400).json({ error: 'dayOfWeek, startTime, endTime, activity required' });
  }
  const id = crypto.randomUUID();
  db().prepare(
    'INSERT INTO child_schedule (id, child_id, day_of_week, start_time, end_time, activity, category, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.childId, dayOfWeek, startTime, endTime, activity.trim(), category || null, color || null);
  const entry = db().prepare('SELECT * FROM child_schedule WHERE id = ?').get(id);
  res.json(mapSchedule(entry));
});

app.delete('/api/children/:childId/schedule/:entryId', (req, res) => {
  db().prepare('DELETE FROM child_schedule WHERE id = ?').run(req.params.entryId);
  res.json({ success: true });
});

// --- Milestones CRUD ---

app.get('/api/children/:childId/milestones', (req, res) => {
  const rows = db().prepare(
    'SELECT * FROM child_milestones WHERE child_id = ? ORDER BY achieved_date DESC'
  ).all(req.params.childId);
  res.json(rows.map(mapMilestone));
});

app.post('/api/children/:childId/milestones', (req, res) => {
  const { title, description, category, achievedDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = crypto.randomUUID();
  db().prepare(
    'INSERT INTO child_milestones (id, child_id, title, description, category, achieved_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.childId, title.trim(), description || null, category || null, achievedDate || new Date().toISOString().split('T')[0]);
  const milestone = db().prepare('SELECT * FROM child_milestones WHERE id = ?').get(id);
  res.json(mapMilestone(milestone));
});

app.delete('/api/children/:childId/milestones/:milestoneId', (req, res) => {
  db().prepare('DELETE FROM child_milestones WHERE id = ?').run(req.params.milestoneId);
  res.json({ success: true });
});

// --- Daily Log CRUD ---

app.get('/api/children/:childId/daily-log', (req, res) => {
  const rows = db().prepare(
    'SELECT * FROM child_daily_log WHERE child_id = ? ORDER BY date DESC LIMIT 30'
  ).all(req.params.childId);
  res.json(rows.map(mapLog));
});

app.post('/api/children/:childId/daily-log', (req, res) => {
  const { date, mood, sleepHours, notes, highlights } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });
  const id = crypto.randomUUID();
  db().prepare(
    'INSERT INTO child_daily_log (id, child_id, date, mood, sleep_hours, notes, highlights) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.childId, date, mood || null, sleepHours || null, notes || null, highlights ? JSON.stringify(highlights) : null);
  const entry = db().prepare('SELECT * FROM child_daily_log WHERE id = ?').get(id);
  res.json(mapLog(entry));
});

app.patch('/api/children/:childId/daily-log/:logId', (req, res) => {
  const { logId } = req.params;
  const existing = db().prepare('SELECT * FROM child_daily_log WHERE id = ?').get(logId) as any;
  if (!existing) return res.status(404).json({ error: 'Log not found' });
  const { mood, sleepHours, notes, highlights } = req.body;
  db().prepare(
    'UPDATE child_daily_log SET mood = ?, sleep_hours = ?, notes = ?, highlights = ? WHERE id = ?'
  ).run(
    mood !== undefined ? mood : existing.mood,
    sleepHours !== undefined ? sleepHours : existing.sleep_hours,
    notes !== undefined ? notes : existing.notes,
    highlights !== undefined ? JSON.stringify(highlights) : existing.highlights,
    logId
  );
  const updated = db().prepare('SELECT * FROM child_daily_log WHERE id = ?').get(logId);
  res.json(mapLog(updated));
});

// --- Mappers (snake_case DB -> camelCase API) ---

function mapChild(row: any) {
  if (!row) return row;
  return { id: row.id, name: row.name, birthDate: row.birth_date, avatarColor: row.avatar_color, notes: row.notes, createdAt: row.created_at };
}

function mapGoal(row: any) {
  if (!row) return row;
  return { id: row.id, childId: row.child_id, category: row.category, title: row.title, description: row.description, targetDate: row.target_date, status: row.status, progress: row.progress, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapSchedule(row: any) {
  if (!row) return row;
  return { id: row.id, childId: row.child_id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time, activity: row.activity, category: row.category, color: row.color };
}

function mapMilestone(row: any) {
  if (!row) return row;
  return { id: row.id, childId: row.child_id, title: row.title, description: row.description, category: row.category, achievedDate: row.achieved_date };
}

function mapLog(row: any) {
  if (!row) return row;
  return { id: row.id, childId: row.child_id, date: row.date, mood: row.mood, sleepHours: row.sleep_hours, notes: row.notes, highlights: row.highlights ? JSON.parse(row.highlights) : null };
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
