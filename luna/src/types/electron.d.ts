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

export interface ArchiveMonthEntry {
  date: string
  data: ArchiveDayData
}

export interface ElectronAPI {
  // Todos
  getTodos: (date: string) => Promise<Todo[]>
  addTodo: (date: string, text: string) => Promise<Todo>
  updateTodo: (id: number, updates: { text?: string; completed?: number; order_index?: number }) => Promise<void>
  deleteTodo: (id: number) => Promise<void>

  // Journal
  getJournalEntry: (date: string) => Promise<JournalEntry | null>
  upsertJournalEntry: (date: string, content: string) => Promise<void>

  // Pomodoro
  startPomodoro: (date: string, durationMinutes: number) => Promise<number>
  completePomodoro: (id: number) => Promise<void>
  getPomodoroCount: (date: string) => Promise<number>
  getPomodoroSessions: (date: string) => Promise<PomodoroSession[]>
  getPomodoroStats: () => Promise<PomodoroStats>

  // Habits
  getHabits: () => Promise<Habit[]>
  addHabit: (name: string, icon: string) => Promise<Habit>
  deleteHabit: (id: number) => Promise<void>
  toggleHabitCompletion: (habitId: number, date: string) => Promise<void>
  getHabitCompletions: (weekStart: string, weekEnd: string) => Promise<HabitCompletion[]>
  getHabitStreak: (habitId: number) => Promise<number>

  // Weekly Goals
  getWeeklyGoals: (weekStart: string) => Promise<WeeklyGoal[]>
  addWeeklyGoal: (weekStart: string, text: string) => Promise<WeeklyGoal>
  updateWeeklyGoal: (id: number, completed: number) => Promise<void>
  deleteWeeklyGoal: (id: number) => Promise<void>

  // Archive
  getArchiveDayData: (date: string) => Promise<ArchiveDayData>
  getArchiveMonthData: (year: number, month: number) => Promise<ArchiveMonthEntry[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
