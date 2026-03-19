import { Card } from '../components/ui'
import WeeklyGoals from '../components/WeeklyGoals'
import HabitTracker from '../components/HabitTracker'

function getWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatWeekRange(weekStart: string, weekDays: string[]): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekDays[6] + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export default function Goals() {
  const weekStart = getWeekStart()
  const weekDays = getWeekDays(weekStart)

  return (
    <div className="animate-fadeIn h-full overflow-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#3D3250]">Goals</h1>
        <p className="text-sm text-[#8B7D9B] mt-1">Week of {formatWeekRange(weekStart, weekDays)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Goals */}
        <Card>
          <h2 className="font-display text-lg text-[#3D3250] mb-1">This Week's Goals</h2>
          <p className="text-xs text-[#8B7D9B] mb-4">3 intentions for the week ✦</p>
          <WeeklyGoals weekStart={weekStart} />
        </Card>

        {/* Habit Tracker */}
        <Card>
          <h2 className="font-display text-lg text-[#3D3250] mb-1">Habits</h2>
          <p className="text-xs text-[#8B7D9B] mb-4">Daily practices to build on ✦</p>
          <HabitTracker weekStart={weekStart} weekDays={weekDays} />
        </Card>
      </div>
    </div>
  )
}
