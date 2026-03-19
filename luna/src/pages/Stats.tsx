import { useState, useEffect } from 'react'
import { Card } from '../components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { PomodoroStats, Habit } from '../types/electron'

interface HabitStreakInfo {
  habit: Habit
  currentStreak: number
  longestStreak: number
}

// Stat card component
function StatCard({ label, value, unit, icon }: { label: string; value: number | string; unit?: string; icon?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-[#8B7D9B]">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl font-semibold text-[#3D3250]">{value}</span>
        {unit && <span className="text-sm text-[#8B7D9B]">{unit}</span>}
      </div>
    </div>
  )
}

// Get last N days as YYYY-MM-DD strings
function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

// Format date for chart x-axis label
function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Stats() {
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats | null>(null)
  const [habitStreaks, setHabitStreaks] = useState<HabitStreakInfo[]>([])
  const [weeklyData, setWeeklyData] = useState<{ date: string; label: string; pomodoros: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setLoading(true)

      // Load pomodoro stats
      const stats = await window.electronAPI.getPomodoroStats()
      setPomodoroStats(stats)

      // Load habits and their streaks
      const habits = await window.electronAPI.getHabits()
      const streakInfos = await Promise.all(habits.map(async habit => ({
        habit,
        currentStreak: await window.electronAPI.getHabitStreak(habit.id),
        longestStreak: 0, // we only have current streak in DB
      })))
      setHabitStreaks(streakInfos.filter(h => h.currentStreak > 0 || true)) // show all

      // Build last 7 days chart data
      const last7 = getLastNDays(7)
      const chartData = await Promise.all(last7.map(async date => ({
        date,
        label: formatChartDate(date),
        pomodoros: await window.electronAPI.getPomodoroCount(date),
      })))
      setWeeklyData(chartData)

      setLoading(false)
    }
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="animate-fadeIn p-6 flex items-center justify-center h-full">
        <p className="text-[#8B7D9B]">Loading stats...</p>
      </div>
    )
  }

  const topStreak = habitStreaks.reduce((max, h) => Math.max(max, h.currentStreak), 0)

  return (
    <div className="animate-fadeIn h-full overflow-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#3D3250]">Stats</h1>
        <p className="text-sm text-[#8B7D9B] mt-1">Your focus &amp; consistency at a glance ✦</p>
      </div>

      {/* Pomodoro stats */}
      <Card>
        <h2 className="font-display text-lg text-[#3D3250] mb-4">Focus Sessions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <StatCard label="Today" value={pomodoroStats?.today ?? 0} unit="sessions" icon="🍅" />
          <StatCard label="This week" value={pomodoroStats?.week ?? 0} unit="sessions" icon="📅" />
          <StatCard label="This month" value={pomodoroStats?.month ?? 0} unit="sessions" icon="🌙" />
          <StatCard label="All time" value={pomodoroStats?.allTime ?? 0} unit="sessions" icon="✦" />
        </div>
      </Card>

      {/* 7-day chart */}
      <Card>
        <h2 className="font-display text-lg text-[#3D3250] mb-4">Last 7 Days</h2>
        {weeklyData.every(d => d.pomodoros === 0) ? (
          <div className="flex flex-col items-center py-8 text-[#8B7D9B]">
            <div className="text-3xl mb-2">🌙</div>
            <p className="text-sm">No pomodoro sessions recorded yet.</p>
            <p className="text-xs mt-1">Start a session on the Today page!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 184, 232, 0.2)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8B7D9B', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(201, 184, 232, 0.3)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8B7D9B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#F5EDE0',
                  border: '1px solid rgba(201, 184, 232, 0.4)',
                  borderRadius: '8px',
                  color: '#3D3250',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(201, 184, 232, 0.1)' }}
                formatter={(value) => {
                  const count = typeof value === 'number' ? value : 0
                  return [`${count} session${count !== 1 ? 's' : ''}`, 'Pomodoros'] as [string, string]
                }}
              />
              <Bar dataKey="pomodoros" fill="#C9B8E8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Habit streaks */}
      <Card>
        <h2 className="font-display text-lg text-[#3D3250] mb-4">Habit Streaks</h2>
        {habitStreaks.length === 0 ? (
          <div className="text-center py-6 text-[#8B7D9B]">
            <p className="text-sm">No habits set up yet.</p>
            <p className="text-xs mt-1">Add habits on the Goals page!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {habitStreaks
              .sort((a, b) => b.currentStreak - a.currentStreak)
              .map(({ habit, currentStreak }) => (
                <div key={habit.id} className="flex items-center gap-3">
                  <span className="text-lg">{habit.icon || '⭐'}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#3D3250]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {habit.name}
                      </span>
                      <span className="text-sm font-medium text-[#3D3250]">
                        {currentStreak > 0 ? `🔥 ${currentStreak} day${currentStreak !== 1 ? 's' : ''}` : '—'}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-[#C9B8E8]/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#C9B8E8] transition-all duration-300"
                        style={{ width: `${Math.min(100, (currentStreak / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Best streak callout */}
      {topStreak > 0 && (
        <div className="text-center py-2">
          <p className="font-handwritten text-lg text-[#C9B8E8]">
            ✦ Best current streak: {topStreak} day{topStreak !== 1 ? 's' : ''} ✦
          </p>
        </div>
      )}
    </div>
  )
}
