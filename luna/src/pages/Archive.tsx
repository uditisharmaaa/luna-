import { useState } from 'react'
import { Card, Button } from '../components/ui'
import CalendarGrid from '../components/CalendarGrid'
import DayDetailPanel from '../components/DayDetailPanel'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Archive() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    const today = new Date()
    if (year === today.getFullYear() && month === today.getMonth() + 1) return // don't go future
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isNextDisabled = () => {
    const today = new Date()
    return year === today.getFullYear() && month === today.getMonth() + 1
  }

  return (
    <div className="animate-fadeIn h-full flex overflow-hidden">
      {/* Main calendar area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-5">
          <h1 className="font-display text-3xl font-semibold text-[#3D3250]">Archive</h1>
          <p className="text-sm text-[#8B7D9B] mt-1">Your history, day by day</p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth}>← Prev</Button>
          <h2 className="font-display text-xl text-[#3D3250] min-w-[180px] text-center">
            {MONTHS[month - 1]} {year}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToNextMonth} disabled={isNextDisabled()}>
            Next →
          </Button>
        </div>

        <Card>
          <CalendarGrid
            year={year}
            month={month}
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-[#8B7D9B]">
          <span className="flex items-center gap-1"><span className="text-[#C9B8E8]">●</span> Pomodoro</span>
          <span className="flex items-center gap-1"><span>✦</span> Journal</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#B8D4C0]/40 inline-block" /> Tasks done</span>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div style={{ width: '280px', minWidth: '280px' }}>
          <DayDetailPanel date={selectedDate} onClose={() => setSelectedDate(null)} />
        </div>
      )}
    </div>
  )
}
