import { useState, useEffect } from 'react'
import type { ArchiveMonthEntry } from '../types/electron'

interface CalendarGridProps {
  year: number
  month: number
  onDayClick: (date: string) => void
  selectedDate: string | null
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarGrid({ year, month, onDayClick, selectedDate }: CalendarGridProps) {
  const [monthData, setMonthData] = useState<Map<string, ArchiveMonthEntry>>(new Map())

  useEffect(() => {
    window.electronAPI.getArchiveMonthData(year, month).then(entries => {
      const map = new Map(entries.map(e => [e.date, e]))
      setMonthData(map)
    })
  }, [year, month])

  const today = new Date().toISOString().split('T')[0]
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfWeek = getFirstDayOfWeek(year, month)

  // Build grid cells: empty prefix + days
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="text-center text-xs text-[#8B7D9B] py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />

          const dateStr = toDateStr(year, month, day)
          const entry = monthData.get(dateStr)
          const data = entry?.data
          const isToday = dateStr === today
          const isFuture = dateStr > today
          const isSelected = dateStr === selectedDate
          const hasDone = data && data.todoCompleted > 0

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && onDayClick(dateStr)}
              disabled={isFuture}
              className={`
                relative p-1.5 rounded-lg text-center transition-all duration-150 min-h-[52px] flex flex-col items-center
                ${isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-[#C9B8E8]/20'}
                ${isSelected ? 'bg-[#C9B8E8]/30 ring-1 ring-[#C9B8E8]' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-[#C9B8E8]/60' : ''}
                ${hasDone && !isSelected ? 'bg-[#B8D4C0]/15' : ''}
              `}
            >
              {/* Day number */}
              <span className={`text-sm font-medium ${isFuture ? 'text-[#8B7D9B]' : isToday ? 'text-[#9B8BC8] font-semibold' : 'text-[#3D3250]'}`}>
                {day}
              </span>

              {/* Indicators row */}
              {data && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {/* Pomodoro dots */}
                  {Array.from({ length: Math.min(3, data.pomodoroCount) }).map((_, idx) => (
                    <span key={idx} className="text-[8px] text-[#C9B8E8]">●</span>
                  ))}
                  {/* Journal indicator */}
                  {data.hasJournal && (
                    <span className="text-[8px] text-[#8B7D9B] ml-0.5">✦</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
