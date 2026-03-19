import { useState, useCallback } from 'react'
import { Card } from '../components/ui'
import PomodoroTimer from '../components/PomodoroTimer'
import TodoList from '../components/TodoList'
import Journal from '../components/Journal'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function Today() {
  const today = new Date().toISOString().split('T')[0]
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSessionComplete = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="animate-fadeIn h-full overflow-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#3D3250]">Today</h1>
        <p className="text-sm text-[#8B7D9B] mt-1">{formatDate(today)}</p>
      </div>

      {/* Top row: Pomodoro + Todos */}
      <div className="flex gap-5">
        {/* Pomodoro */}
        <div className="min-w-[260px]">
          <Card className="flex flex-col items-center justify-center h-full">
            <h2 className="font-display text-lg text-[#3D3250] mb-4">Pomodoro</h2>
            <PomodoroTimer date={today} onSessionComplete={handleSessionComplete} />
          </Card>
        </div>

        {/* Todos */}
        <div className="flex-1">
          <Card className="h-full">
            <h2 className="font-display text-lg text-[#3D3250] mb-4">Tasks</h2>
            <TodoList date={today} key={refreshKey} />
          </Card>
        </div>
      </div>

      {/* Celestial divider */}
      <div className="text-center text-xs text-[#C9B8E8]">✦</div>

      {/* Journal */}
      <Card>
        <Journal date={today} />
      </Card>
    </div>
  )
}
