import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Button } from './ui'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { pomodoroSettings, updatePomodoroSettings } = useStore()
  const [work, setWork] = useState(pomodoroSettings.workMinutes)
  const [breakMin, setBreakMin] = useState(pomodoroSettings.breakMinutes)

  const handleSave = () => {
    updatePomodoroSettings({ workMinutes: work, breakMinutes: breakMin })
    onClose()
  }

  return (
    // Backdrop overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(61, 50, 80, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="animate-popIn rounded-2xl p-6 w-80 space-y-5 texture-paper"
        style={{ background: '#F5EDE0', border: '1px solid rgba(201, 184, 232, 0.4)' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="font-display text-xl text-[#3D3250] font-semibold">Settings</h2>
          <p className="text-xs text-[#8B7D9B] mt-0.5">Configure your focus sessions</p>
        </div>

        <div className="celestial-divider text-xs">✦</div>

        <div className="space-y-4">
          {/* Work duration */}
          <div>
            <label className="block text-sm text-[#3D3250] mb-1.5 font-medium">
              Focus duration
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5} max={60} step={5}
                value={work}
                onChange={e => setWork(Number(e.target.value))}
                className="flex-1 accent-[#C9B8E8]"
              />
              <span className="text-sm text-[#3D3250] w-16 text-right">{work} min</span>
            </div>
          </div>

          {/* Break duration */}
          <div>
            <label className="block text-sm text-[#3D3250] mb-1.5 font-medium">
              Break duration
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1} max={30} step={1}
                value={breakMin}
                onChange={e => setBreakMin(Number(e.target.value))}
                className="flex-1 accent-[#C9B8E8]"
              />
              <span className="text-sm text-[#3D3250] w-16 text-right">{breakMin} min</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  )
}
