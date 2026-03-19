import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../store/useStore'
import { Button } from './ui'

interface PomodoroTimerProps {
  date: string
  onSessionComplete: () => void
}

const CIRCLE_RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

export default function PomodoroTimer({ date, onSessionComplete }: PomodoroTimerProps) {
  const {
    pomodoroActive, pomodoroTimeLeft, pomodoroMode, pomodoroSettings,
    pomodoroSessionId, setPomodoroActive, setPomodoroTimeLeft,
    setPomodoroMode, setPomodoroSessionId,
  } = useStore()

  const [sessionCount, setSessionCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalTime = pomodoroMode === 'work'
    ? pomodoroSettings.workMinutes * 60
    : pomodoroSettings.breakMinutes * 60

  const progress = pomodoroTimeLeft / totalTime
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const refreshCount = useCallback(async () => {
    const count = await window.electronAPI.getPomodoroCount(date)
    setSessionCount(count)
  }, [date])

  useEffect(() => { refreshCount() }, [refreshCount])

  // Timer tick
  useEffect(() => {
    if (!pomodoroActive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setPomodoroTimeLeft(pomodoroTimeLeft - 1)
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [pomodoroActive, pomodoroTimeLeft, setPomodoroTimeLeft])

  // Handle timer completion
  useEffect(() => {
    if (pomodoroTimeLeft <= 0 && pomodoroActive) {
      setPomodoroActive(false)
      if (pomodoroMode === 'work' && pomodoroSessionId) {
        window.electronAPI.completePomodoro(pomodoroSessionId).then(() => {
          refreshCount()
          onSessionComplete()
        })
        setPomodoroMode('break')
        setPomodoroTimeLeft(pomodoroSettings.breakMinutes * 60)
        setPomodoroSessionId(null)
      } else {
        setPomodoroMode('work')
        setPomodoroTimeLeft(pomodoroSettings.workMinutes * 60)
      }
    }
  }, [pomodoroTimeLeft, pomodoroActive, pomodoroMode, pomodoroSessionId, pomodoroSettings, setPomodoroActive, setPomodoroMode, setPomodoroTimeLeft, setPomodoroSessionId, refreshCount, onSessionComplete])

  const handlePlay = async () => {
    if (pomodoroMode === 'work' && !pomodoroSessionId) {
      const id = await window.electronAPI.startPomodoro(date, pomodoroSettings.workMinutes)
      setPomodoroSessionId(id)
    }
    setPomodoroActive(true)
  }

  const handlePause = () => setPomodoroActive(false)

  const handleReset = () => {
    setPomodoroActive(false)
    setPomodoroTimeLeft(pomodoroSettings.workMinutes * 60)
    setPomodoroMode('work')
    setPomodoroSessionId(null)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const circleColor = pomodoroMode === 'work' ? '#C9B8E8' : '#B8D4C0'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Circle Timer */}
      <div className="relative">
        <svg width="200" height="200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100" cy="100" r={CIRCLE_RADIUS}
            fill="none" stroke="#F5EDE0" strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="100" cy="100" r={CIRCLE_RADIUS}
            fill="none" stroke={circleColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {/* Time display in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-[#3D3250]">
            {formatTime(pomodoroTimeLeft)}
          </span>
          <span className="text-xs text-[#8B7D9B] mt-1 font-sans uppercase tracking-wider">
            {pomodoroMode === 'work' ? 'Focus' : 'Break'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {pomodoroActive ? (
          <Button variant="ghost" size="sm" onClick={handlePause}>⏸ Pause</Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handlePlay}>▶ Start</Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleReset}>↺ Reset</Button>
      </div>

      {/* Session counter */}
      <p className="text-sm text-[#8B7D9B]">
        <span className="font-semibold text-[#3D3250]">{sessionCount}</span>{' '}
        {sessionCount === 1 ? 'pomodoro' : 'pomodoros'} today
      </p>
    </div>
  )
}
