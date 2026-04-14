import { useState, useEffect, useRef } from 'react'

type Rating = -1 | 1 | 2 | 3 | null

interface RatingWidgetProps {
  rating: Rating
  onChange: (rating: Rating) => void
  compact?: boolean
}

const OPTIONS: { value: -1 | 1 | 2 | 3; label: string; title: string; pillClass: string }[] = [
  { value: -1, label: '👎', title: 'Not for me',     pillClass: 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30' },
  { value: 1,  label: '👍', title: 'Liked it',       pillClass: 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30' },
  { value: 2,  label: '👍👍', title: 'Really liked it', pillClass: 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30' },
  { value: 3,  label: '👍👍👍', title: 'Loved it',    pillClass: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30' },
]

// Collapsed button shown when not expanded
function ratingIcon(rating: Rating) {
  if (rating === null) return <span className="text-[var(--text-secondary)] text-base leading-none">☆</span>
  const o = OPTIONS.find((x) => x.value === rating)!
  return <span className="text-sm leading-none">{o.label}</span>
}

// Tap-to-expand inline rating for list rows
function InlineRatingWidget({ rating, onChange }: { rating: Rating; onChange: (r: Rating) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(value: -1 | 1 | 2 | 3) {
    onChange(rating === value ? null : value)
    setOpen(false)
  }

  return (
    <div ref={ref} className="flex-shrink-0 flex items-center self-center">
      {open ? (
        <div className="flex gap-1 items-center">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              title={o.title}
              className={`px-1.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${o.pillClass} ${
                rating === o.value ? 'ring-1 ring-white/30' : ''
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={rating !== null ? `Rating: ${OPTIONS.find(o => o.value === rating)?.title} — tap to change` : 'Rate this'}
          className="p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          {ratingIcon(rating)}
        </button>
      )}
    </div>
  )
}

// Full horizontal row for card view
export function RatingWidget({ rating, onChange, compact = false }: RatingWidgetProps) {
  if (compact) return <InlineRatingWidget rating={rating} onChange={onChange} />

  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(rating === o.value ? null : o.value)}
          title={rating === o.value ? `Clear rating (${o.title})` : o.title}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
            rating === o.value
              ? o.pillClass + ' ring-1 ring-white/20'
              : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
