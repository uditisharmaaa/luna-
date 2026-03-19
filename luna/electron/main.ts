import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  getJournalEntry,
  upsertJournalEntry,
  startPomodoro,
  completePomodoro,
  getPomodoroCount,
  getPomodoroSessions,
  getPomodoroStats,
  getHabits,
  addHabit,
  deleteHabit,
  toggleHabitCompletion,
  getHabitCompletions,
  getHabitStreak,
  getWeeklyGoals,
  addWeeklyGoal,
  updateWeeklyGoal,
  deleteWeeklyGoal,
  getArchiveDayData,
  getArchiveMonthData,
} from './db'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

// Helper function to wrap IPC handlers with error handling
function handleIPC<T>(handler: (...args: any[]) => T) {
  return (_event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
    try {
      return handler(...args)
    } catch (error) {
      console.error('[Luna DB Error]', error)
      throw error
    }
  }
}

// Todos
ipcMain.handle('get-todos', handleIPC((date: string) => getTodos(date)))
ipcMain.handle('add-todo', handleIPC((date: string, text: string) => addTodo(date, text)))
ipcMain.handle('update-todo', handleIPC((id: number, updates: { text?: string; completed?: number; order_index?: number }) => updateTodo(id, updates)))
ipcMain.handle('delete-todo', handleIPC((id: number) => deleteTodo(id)))

// Journal
ipcMain.handle('get-journal-entry', handleIPC((date: string) => getJournalEntry(date)))
ipcMain.handle('upsert-journal-entry', handleIPC((date: string, content: string) => upsertJournalEntry(date, content)))

// Pomodoro
ipcMain.handle('start-pomodoro', handleIPC((date: string, durationMinutes: number) => startPomodoro(date, durationMinutes)))
ipcMain.handle('complete-pomodoro', handleIPC((id: number) => completePomodoro(id)))
ipcMain.handle('get-pomodoro-count', handleIPC((date: string) => getPomodoroCount(date)))
ipcMain.handle('get-pomodoro-sessions', handleIPC((date: string) => getPomodoroSessions(date)))
ipcMain.handle('get-pomodoro-stats', handleIPC(() => getPomodoroStats()))

// Habits
ipcMain.handle('get-habits', handleIPC(() => getHabits()))
ipcMain.handle('add-habit', handleIPC((name: string, icon: string) => addHabit(name, icon)))
ipcMain.handle('delete-habit', handleIPC((id: number) => deleteHabit(id)))
ipcMain.handle('toggle-habit-completion', handleIPC((habitId: number, date: string) => toggleHabitCompletion(habitId, date)))
ipcMain.handle('get-habit-completions', handleIPC((weekStart: string, weekEnd: string) => getHabitCompletions(weekStart, weekEnd)))
ipcMain.handle('get-habit-streak', handleIPC((habitId: number) => getHabitStreak(habitId)))

// Weekly Goals
ipcMain.handle('get-weekly-goals', handleIPC((weekStart: string) => getWeeklyGoals(weekStart)))
ipcMain.handle('add-weekly-goal', handleIPC((weekStart: string, text: string) => addWeeklyGoal(weekStart, text)))
ipcMain.handle('update-weekly-goal', handleIPC((id: number, completed: number) => updateWeeklyGoal(id, completed)))
ipcMain.handle('delete-weekly-goal', handleIPC((id: number) => deleteWeeklyGoal(id)))

// Archive
ipcMain.handle('get-archive-day-data', handleIPC((date: string) => getArchiveDayData(date)))
ipcMain.handle('get-archive-month-data', handleIPC((year: number, month: number) => getArchiveMonthData(year, month)))

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
