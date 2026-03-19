import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

// Store DB in user data directory
const dbPath = path.join(app.getPath('userData'), 'luna.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')

// ---------------------------------------------------------------------------
// Table creation
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    duration_minutes INTEGER DEFAULT 25,
    completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    date TEXT PRIMARY KEY,
    content TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER REFERENCES habits(id),
    date TEXT NOT NULL,
    UNIQUE(habit_id, date)
  );

  CREATE TABLE IF NOT EXISTS weekly_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TEXT
  );
`)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Todo {
  id: number
  date: string
  text: string
  completed: number
  order_index: number
  created_at: string
}

export interface JournalEntry {
  date: string
  content: string
  updated_at: string
}

export interface PomodoroSession {
  id: number
  date: string
  started_at: string | null
  completed_at: string | null
  duration_minutes: number
  completed: number
}

export interface Habit {
  id: number
  name: string
  icon: string
  is_active: number
  created_at: string
}

export interface HabitCompletion {
  id: number
  habit_id: number
  date: string
}

export interface WeeklyGoal {
  id: number
  week_start: string
  text: string
  completed: number
  created_at: string
}

export interface PomodoroStats {
  today: number
  week: number
  month: number
  allTime: number
}

export interface ArchiveDayData {
  pomodoroCount: number
  todoCount: number
  todoCompleted: number
  hasJournal: boolean
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export function getTodos(date: string): Todo[] {
  return db
    .prepare('SELECT * FROM todos WHERE date = ? ORDER BY order_index ASC')
    .all(date) as Todo[]
}

export function addTodo(date: string, text: string): Todo {
  const countRow = db
    .prepare('SELECT COUNT(*) as cnt FROM todos WHERE date = ?')
    .get(date) as { cnt: number }
  const orderIndex = countRow.cnt
  const createdAt = new Date().toISOString()
  const info = db
    .prepare(
      'INSERT INTO todos (date, text, completed, order_index, created_at) VALUES (?, ?, 0, ?, ?)'
    )
    .run(date, text, orderIndex, createdAt)
  return db
    .prepare('SELECT * FROM todos WHERE id = ?')
    .get(info.lastInsertRowid) as Todo
}

export function updateTodo(
  id: number,
  updates: { text?: string; completed?: number; order_index?: number }
): void {
  const fields = Object.keys(updates) as (keyof typeof updates)[]
  if (fields.length === 0) return
  const setParts = fields.map((f) => `${f} = ?`).join(', ')
  const values = fields.map((f) => updates[f])
  db.prepare(`UPDATE todos SET ${setParts} WHERE id = ?`).run(...values, id)
}

export function deleteTodo(id: number): void {
  db.prepare('DELETE FROM todos WHERE id = ?').run(id)
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export function getJournalEntry(date: string): JournalEntry | null {
  return (
    (db
      .prepare('SELECT * FROM journal_entries WHERE date = ?')
      .get(date) as JournalEntry) ?? null
  )
}

export function upsertJournalEntry(date: string, content: string): void {
  const updatedAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO journal_entries (date, content, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at'
  ).run(date, content, updatedAt)
}

// ---------------------------------------------------------------------------
// Pomodoro
// ---------------------------------------------------------------------------

export function startPomodoro(date: string, durationMinutes: number): number {
  const startedAt = new Date().toISOString()
  const info = db
    .prepare(
      'INSERT INTO pomodoro_sessions (date, started_at, duration_minutes, completed) VALUES (?, ?, ?, 0)'
    )
    .run(date, startedAt, durationMinutes)
  return info.lastInsertRowid as number
}

export function completePomodoro(id: number): void {
  const completedAt = new Date().toISOString()
  db.prepare(
    'UPDATE pomodoro_sessions SET completed = 1, completed_at = ? WHERE id = ?'
  ).run(completedAt, id)
}

export function getPomodoroCount(date: string): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) as cnt FROM pomodoro_sessions WHERE date = ? AND completed = 1'
    )
    .get(date) as { cnt: number }
  return row.cnt
}

export function getPomodoroSessions(date: string): PomodoroSession[] {
  return db
    .prepare('SELECT * FROM pomodoro_sessions WHERE date = ? ORDER BY id ASC')
    .all(date) as PomodoroSession[]
}

export function getPomodoroStats(): PomodoroStats {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Week start (Monday)
  const dayOfWeek = today.getDay() // 0=Sun
  const diffToMonday = (dayOfWeek + 6) % 7
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - diffToMonday)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  // Month start
  const monthStartStr = todayStr.slice(0, 7) + '-01'

  const count = (where: string, ...params: unknown[]): number => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM pomodoro_sessions WHERE completed = 1 AND ${where}`
      )
      .get(...params) as { cnt: number }
    return row.cnt
  }

  return {
    today: count('date = ?', todayStr),
    week: count('date >= ?', weekStartStr),
    month: count('date >= ?', monthStartStr),
    allTime: count('1 = 1'),
  }
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

export function getHabits(): Habit[] {
  return db
    .prepare('SELECT * FROM habits WHERE is_active = 1 ORDER BY id ASC')
    .all() as Habit[]
}

export function addHabit(name: string, icon: string): Habit {
  const createdAt = new Date().toISOString()
  const info = db
    .prepare(
      'INSERT INTO habits (name, icon, is_active, created_at) VALUES (?, ?, 1, ?)'
    )
    .run(name, icon, createdAt)
  return db
    .prepare('SELECT * FROM habits WHERE id = ?')
    .get(info.lastInsertRowid) as Habit
}

export function deleteHabit(id: number): void {
  db.prepare('UPDATE habits SET is_active = 0 WHERE id = ?').run(id)
}

export function toggleHabitCompletion(habitId: number, date: string): void {
  const existing = db
    .prepare(
      'SELECT id FROM habit_completions WHERE habit_id = ? AND date = ?'
    )
    .get(habitId, date)
  if (existing) {
    db.prepare(
      'DELETE FROM habit_completions WHERE habit_id = ? AND date = ?'
    ).run(habitId, date)
  } else {
    db.prepare(
      'INSERT INTO habit_completions (habit_id, date) VALUES (?, ?)'
    ).run(habitId, date)
  }
}

export function getHabitCompletions(
  weekStart: string,
  weekEnd: string
): HabitCompletion[] {
  return db
    .prepare(
      'SELECT * FROM habit_completions WHERE date >= ? AND date <= ? ORDER BY date ASC'
    )
    .all(weekStart, weekEnd) as HabitCompletion[]
}

export function getHabitStreak(habitId: number): number {
  // Get all completion dates for this habit, sorted descending
  const rows = db
    .prepare(
      'SELECT date FROM habit_completions WHERE habit_id = ? ORDER BY date DESC'
    )
    .all(habitId) as { date: string }[]

  if (rows.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let cursor = new Date(today)

  for (const row of rows) {
    const rowDate = new Date(row.date)
    rowDate.setHours(0, 0, 0, 0)
    const diff =
      (cursor.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 0) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (diff === 1 && streak === 0) {
      // Allow streak starting from yesterday if today not yet completed
      streak++
      cursor = new Date(rowDate)
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

// ---------------------------------------------------------------------------
// Weekly Goals
// ---------------------------------------------------------------------------

export function getWeeklyGoals(weekStart: string): WeeklyGoal[] {
  return db
    .prepare(
      'SELECT * FROM weekly_goals WHERE week_start = ? ORDER BY id ASC'
    )
    .all(weekStart) as WeeklyGoal[]
}

export function addWeeklyGoal(weekStart: string, text: string): WeeklyGoal {
  const createdAt = new Date().toISOString()
  const info = db
    .prepare(
      'INSERT INTO weekly_goals (week_start, text, completed, created_at) VALUES (?, ?, 0, ?)'
    )
    .run(weekStart, text, createdAt)
  return db
    .prepare('SELECT * FROM weekly_goals WHERE id = ?')
    .get(info.lastInsertRowid) as WeeklyGoal
}

export function updateWeeklyGoal(id: number, completed: number): void {
  db.prepare('UPDATE weekly_goals SET completed = ? WHERE id = ?').run(
    completed,
    id
  )
}

export function deleteWeeklyGoal(id: number): void {
  db.prepare('DELETE FROM weekly_goals WHERE id = ?').run(id)
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

export function getArchiveDayData(date: string): ArchiveDayData {
  const pomodoroCount = getPomodoroCount(date)

  const todoRow = db
    .prepare(
      'SELECT COUNT(*) as total, SUM(completed) as done FROM todos WHERE date = ?'
    )
    .get(date) as { total: number; done: number | null }

  const journalRow = db
    .prepare('SELECT 1 FROM journal_entries WHERE date = ? AND content != ""')
    .get(date)

  return {
    pomodoroCount,
    todoCount: todoRow.total,
    todoCompleted: todoRow.done ?? 0,
    hasJournal: journalRow != null,
  }
}

export function getArchiveMonthData(
  year: number,
  month: number
): { date: string; data: ArchiveDayData }[] {
  // Generate all days in the given month
  const results: { date: string; data: ArchiveDayData }[] = []
  const daysInMonth = new Date(year, month, 0).getDate() // month is 1-based here
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    results.push({ date, data: getArchiveDayData(date) })
  }
  return results
}

// ---------------------------------------------------------------------------

export default db
