import { useState, useEffect } from 'react'
import type { Todo, PomodoroSession, JournalEntry } from '../types/electron'

interface DayDetailPanelProps {
  date: string
  onClose: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function DayDetailPanel({ date, onClose }: DayDetailPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [journal, setJournal] = useState<JournalEntry | null>(null)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])

  useEffect(() => {
    Promise.all([
      window.electronAPI.getTodos(date),
      window.electronAPI.getJournalEntry(date),
      window.electronAPI.getPomodoroSessions(date),
    ]).then(([t, j, s]) => {
      setTodos(t)
      setJournal(j)
      setSessions(s)
    })
  }, [date])

  const completedSessions = sessions.filter(s => s.completed)
  const completedTodos = todos.filter(t => t.completed)

  return (
    <div
      className="animate-fadeIn h-full overflow-auto p-5 space-y-4"
      style={{ background: '#F5EDE0', borderLeft: '1px solid rgba(201, 184, 232, 0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg text-[#3D3250] font-semibold">{formatDate(date)}</h2>
          <p className="text-xs text-[#8B7D9B] mt-0.5">
            {completedSessions.length} pomodoro{completedSessions.length !== 1 ? 's' : ''} · {completedTodos.length}/{todos.length} tasks done
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[#8B7D9B] hover:text-[#3D3250] transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="celestial-divider text-xs">✦</div>

      {/* Pomodoros */}
      {completedSessions.length > 0 && (
        <div>
          <h3 className="font-display text-sm text-[#3D3250] font-semibold mb-2">Focus Sessions</h3>
          <div className="flex flex-wrap gap-1.5">
            {completedSessions.map((session, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#C9B8E8]/30 text-[#3D3250]">
                🍅 {session.duration_minutes ?? 25}m
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Todos */}
      {todos.length > 0 && (
        <div>
          <h3 className="font-display text-sm text-[#3D3250] font-semibold mb-2">Tasks</h3>
          <ul className="space-y-1.5">
            {todos.map(todo => (
              <li key={todo.id} className={`flex items-center gap-2 text-sm ${todo.completed ? 'text-[#8B7D9B]' : 'text-[#3D3250]'}`}>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 text-xs ${todo.completed ? 'bg-[#B8D4C0] border-[#B8D4C0] text-white' : 'border-[#C9B8E8]'}`}>
                  {todo.completed ? '✓' : ''}
                </span>
                <span className={todo.completed ? 'line-through' : ''}>{todo.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Journal */}
      <div>
        <h3 className="font-display text-sm text-[#3D3250] font-semibold mb-2">Journal</h3>
        {journal?.content ? (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'Caveat, cursive', fontSize: '15px', color: '#3D3250' }}
          >
            {journal.content}
          </p>
        ) : (
          <p className="text-sm text-[#8B7D9B] italic">No journal entry for this day.</p>
        )}
      </div>

      {/* Empty state */}
      {todos.length === 0 && completedSessions.length === 0 && !journal?.content && (
        <div className="text-center py-8 text-[#8B7D9B]">
          <div className="text-3xl mb-2">🌙</div>
          <p className="text-sm">Nothing recorded for this day.</p>
        </div>
      )}
    </div>
  )
}
