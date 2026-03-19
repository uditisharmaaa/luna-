import { useState, useEffect, useCallback } from 'react'
import type { Habit, HabitCompletion } from '../types/electron'
import { Button } from './ui'

interface HabitTrackerProps {
  weekStart: string
  weekDays: string[]
}

const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const today = new Date().toISOString().split('T')[0]

export default function HabitTracker({ weekStart, weekDays }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [streaks, setStreaks] = useState<Record<number, number>>({})
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')

  const loadData = useCallback(async () => {
    const weekEnd = weekDays[6]
    const [h, c] = await Promise.all([
      window.electronAPI.getHabits(),
      window.electronAPI.getHabitCompletions(weekStart, weekEnd),
    ])
    setHabits(h)
    setCompletions(c)

    // Load streaks for all habits
    const streakMap: Record<number, number> = {}
    await Promise.all(h.map(async (habit: Habit) => {
      streakMap[habit.id] = await window.electronAPI.getHabitStreak(habit.id)
    }))
    setStreaks(streakMap)
  }, [weekStart, weekDays])

  useEffect(() => { loadData() }, [loadData])

  const isCompleted = (habitId: number, date: string) =>
    completions.some(c => c.habit_id === habitId && c.date === date)

  const handleToggle = async (habitId: number, date: string) => {
    await window.electronAPI.toggleHabitCompletion(habitId, date)
    loadData()
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    await window.electronAPI.addHabit(name, newIcon)
    setNewName('')
    setNewIcon('⭐')
    loadData()
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteHabit(id)
    loadData()
  }

  return (
    <div className="space-y-4">
      {/* Habit rows */}
      {habits.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-[#8B7D9B] py-1 pr-4 w-40">Habit</th>
                {weekDays.map((date, i) => (
                  <th
                    key={date}
                    className={`text-center text-xs py-1 w-10 ${date === today ? 'text-[#9B8BC8] font-semibold' : 'text-[#8B7D9B]'}`}
                  >
                    {DAY_ABBR[i]}
                  </th>
                ))}
                <th className="text-center text-xs text-[#8B7D9B] py-1 w-12">Streak</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => (
                <tr key={habit.id} className="group hover:bg-[#C9B8E8]/10 rounded">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2 text-sm text-[#3D3250]">
                      <span>{habit.icon || '⭐'}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif' }}>{habit.name}</span>
                    </span>
                  </td>
                  {weekDays.map((date) => {
                    const done = isCompleted(habit.id, date)
                    const isFuture = date > today
                    return (
                      <td key={date} className="text-center py-2">
                        <button
                          onClick={() => !isFuture && handleToggle(habit.id, date)}
                          disabled={isFuture}
                          className={`w-7 h-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all text-xs ${
                            done
                              ? 'bg-[#B8D4C0] border-[#B8D4C0] text-white'
                              : isFuture
                              ? 'border-[#E5D9F0]/50 opacity-40 cursor-default'
                              : 'border-[#C9B8E8]/60 hover:border-[#9B8BC8]'
                          } ${date === today && !done ? 'border-[#C9B8E8]' : ''}`}
                        >
                          {done && '✓'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="text-center py-2">
                    <span className="text-xs text-[#8B7D9B]">
                      {streaks[habit.id] > 0 ? `🔥 ${streaks[habit.id]}` : '-'}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#8B7D9B] hover:text-rose-400 text-xs transition-all"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-[#8B7D9B]">
          <div className="text-2xl mb-2">🌱</div>
          <p className="text-sm">No habits yet. Add one below to start tracking.</p>
        </div>
      )}

      {/* Add habit form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newIcon}
          onChange={e => setNewIcon(e.target.value)}
          className="w-12 px-2 py-2 rounded-lg text-center bg-[#FFF8F0] border border-[#C9B8E8]/40 text-[#3D3250] outline-none focus:border-[#C9B8E8]"
          placeholder="⭐"
          maxLength={2}
        />
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New habit..."
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#FFF8F0] border border-[#C9B8E8]/40 text-[#3D3250] placeholder-[#8B7D9B] outline-none focus:border-[#C9B8E8] transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
        <Button type="submit" variant="primary" size="sm">+</Button>
      </form>
    </div>
  )
}
