import { useState, useEffect } from 'react'
import type { WeeklyGoal } from '../types/electron'
import { Button } from './ui'

interface WeeklyGoalsProps {
  weekStart: string
}

export default function WeeklyGoals({ weekStart }: WeeklyGoalsProps) {
  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [newText, setNewText] = useState('')

  const loadGoals = async () => {
    const data = await window.electronAPI.getWeeklyGoals(weekStart)
    setGoals(data)
  }

  useEffect(() => { loadGoals() }, [weekStart])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newText.trim()
    if (!text || goals.length >= 3) return
    await window.electronAPI.addWeeklyGoal(weekStart, text)
    setNewText('')
    loadGoals()
  }

  const handleToggle = async (goal: WeeklyGoal) => {
    await window.electronAPI.updateWeeklyGoal(goal.id, goal.completed ? 0 : 1)
    loadGoals()
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteWeeklyGoal(id)
    loadGoals()
  }

  const allComplete = goals.length > 0 && goals.every(g => g.completed)

  return (
    <div className="space-y-3">
      {/* Goal items */}
      <ul className="space-y-2">
        {goals.map(goal => (
          <li key={goal.id} className="flex items-center gap-3 group">
            <button
              onClick={() => handleToggle(goal)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                goal.completed ? 'bg-[#C9B8E8] border-[#C9B8E8]' : 'border-[#C9B8E8] hover:border-[#9B8BC8]'
              }`}
            >
              {goal.completed && <span className="text-white text-xs">✓</span>}
            </button>
            <span
              className={`flex-1 text-sm ${goal.completed ? 'line-through text-[#8B7D9B]' : 'text-[#3D3250]'}`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {goal.text}
            </span>
            <button
              onClick={() => handleDelete(goal.id)}
              className="opacity-0 group-hover:opacity-100 text-[#8B7D9B] hover:text-rose-400 text-xs transition-all"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* Celebration */}
      {allComplete && (
        <p className="text-sm text-[#C9B8E8] animate-fadeIn font-handwritten">✦ Week complete! Amazing work.</p>
      )}

      {/* Add goal (only if < 3) */}
      {goals.length < 3 && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={`Add goal ${goals.length + 1} of 3...`}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#FFF8F0] border border-[#C9B8E8]/40 text-[#3D3250] placeholder-[#8B7D9B] outline-none focus:border-[#C9B8E8] transition-colors"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          />
          <Button type="submit" variant="primary" size="sm">+</Button>
        </form>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <p className="text-xs text-[#8B7D9B]">Set up to 3 goals for this week ✦</p>
      )}
    </div>
  )
}
