import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Todos
  getTodos: (date: string) => ipcRenderer.invoke('get-todos', date),
  addTodo: (date: string, text: string) => ipcRenderer.invoke('add-todo', date, text),
  updateTodo: (id: number, updates: object) => ipcRenderer.invoke('update-todo', id, updates),
  deleteTodo: (id: number) => ipcRenderer.invoke('delete-todo', id),

  // Journal
  getJournalEntry: (date: string) => ipcRenderer.invoke('get-journal-entry', date),
  upsertJournalEntry: (date: string, content: string) => ipcRenderer.invoke('upsert-journal-entry', date, content),

  // Pomodoro
  startPomodoro: (date: string, durationMinutes: number) => ipcRenderer.invoke('start-pomodoro', date, durationMinutes),
  completePomodoro: (id: number) => ipcRenderer.invoke('complete-pomodoro', id),
  getPomodoroCount: (date: string) => ipcRenderer.invoke('get-pomodoro-count', date),
  getPomodoroSessions: (date: string) => ipcRenderer.invoke('get-pomodoro-sessions', date),
  getPomodoroStats: () => ipcRenderer.invoke('get-pomodoro-stats'),

  // Habits
  getHabits: () => ipcRenderer.invoke('get-habits'),
  addHabit: (name: string, icon: string) => ipcRenderer.invoke('add-habit', name, icon),
  deleteHabit: (id: number) => ipcRenderer.invoke('delete-habit', id),
  toggleHabitCompletion: (habitId: number, date: string) => ipcRenderer.invoke('toggle-habit-completion', habitId, date),
  getHabitCompletions: (weekStart: string, weekEnd: string) => ipcRenderer.invoke('get-habit-completions', weekStart, weekEnd),
  getHabitStreak: (habitId: number) => ipcRenderer.invoke('get-habit-streak', habitId),

  // Weekly Goals
  getWeeklyGoals: (weekStart: string) => ipcRenderer.invoke('get-weekly-goals', weekStart),
  addWeeklyGoal: (weekStart: string, text: string) => ipcRenderer.invoke('add-weekly-goal', weekStart, text),
  updateWeeklyGoal: (id: number, completed: number) => ipcRenderer.invoke('update-weekly-goal', id, completed),
  deleteWeeklyGoal: (id: number) => ipcRenderer.invoke('delete-weekly-goal', id),

  // Archive
  getArchiveDayData: (date: string) => ipcRenderer.invoke('get-archive-day-data', date),
  getArchiveMonthData: (year: number, month: number) => ipcRenderer.invoke('get-archive-month-data', year, month),
})
