import { create } from 'zustand'

interface StoreState {
  // Today's date in YYYY-MM-DD format
  todayDate: string
  // Pomodoro state
  pomodoroActive: boolean
  pomodoroSessionId: number | null
  pomodoroTimeLeft: number // seconds
  pomodoroMode: 'work' | 'break'
  pomodoroSettings: {
    workMinutes: number
    breakMinutes: number
  }
  // Actions
  setTodayDate: (date: string) => void
  setPomodoroActive: (active: boolean) => void
  setPomodoroSessionId: (id: number | null) => void
  setPomodoroTimeLeft: (seconds: number | ((prev: number) => number)) => void
  setPomodoroMode: (mode: 'work' | 'break') => void
  updatePomodoroSettings: (settings: Partial<StoreState['pomodoroSettings']>) => void
}

export const useStore = create<StoreState>((set) => ({
  todayDate: new Date().toISOString().split('T')[0],
  pomodoroActive: false,
  pomodoroSessionId: null,
  pomodoroTimeLeft: 25 * 60,
  pomodoroMode: 'work',
  pomodoroSettings: {
    workMinutes: 25,
    breakMinutes: 5,
  },
  setTodayDate: (date) => set({ todayDate: date }),
  setPomodoroActive: (active) => set({ pomodoroActive: active }),
  setPomodoroSessionId: (id) => set({ pomodoroSessionId: id }),
  setPomodoroTimeLeft: (seconds) => set((state) => ({
    pomodoroTimeLeft: typeof seconds === 'function' ? seconds(state.pomodoroTimeLeft) : seconds,
  })),
  setPomodoroMode: (mode) => set({ pomodoroMode: mode }),
  updatePomodoroSettings: (settings) =>
    set((state) => ({
      pomodoroSettings: { ...state.pomodoroSettings, ...settings },
    })),
}))
