import { useState, useEffect, useRef, useCallback } from 'react'

interface JournalProps {
  date: string
}

export default function Journal({ date }: JournalProps) {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing entry
  useEffect(() => {
    window.electronAPI.getJournalEntry(date).then(entry => {
      setContent(entry?.content ?? '')
    })
  }, [date])

  // Autosave with debounce
  const handleChange = useCallback((text: string) => {
    setContent(text)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.electronAPI.upsertJournalEntry(date, text)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1000)
  }, [date])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-handwritten text-lg text-[#3D3250]">
          How was your day?
        </label>
        {saved && (
          <span className="text-xs text-[#B8D4C0]">✦ saved</span>
        )}
      </div>
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="Write freely..."
        rows={5}
        className="w-full px-4 py-3 rounded-xl resize-none text-sm text-[#3D3250] placeholder-[#8B7D9B] outline-none transition-colors"
        style={{
          background: 'rgba(255, 248, 240, 0.8)',
          border: '1px solid rgba(201, 184, 232, 0.3)',
          fontFamily: 'Caveat, cursive',
          fontSize: '16px',
          lineHeight: '1.6',
        }}
      />
    </div>
  )
}
