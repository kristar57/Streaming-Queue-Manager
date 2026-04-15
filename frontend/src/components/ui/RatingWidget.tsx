import { useState, useEffect, useRef } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

type Rating = -1 | 1 | 2 | 3 | null

interface RatingWidgetProps {
  rating: Rating
  onChange: (rating: Rating) => void
  compact?: boolean
}

const SZ = 13

const OPTIONS: {
  value: -1 | 1 | 2 | 3
  title: string
  activeClass: string
  inactiveClass: string
  icon: React.ReactNode
}[] = [
  {
    value: -1,
    title: 'Not for me',
    activeClass:   'bg-red-500/20 border-red-500/40 text-red-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30',
    icon: <ThumbsDown size={SZ} />,
  },
  {
    value: 1,
    title: 'Liked it',
    activeClass:   'bg-blue-500/20 border-blue-500/40 text-blue-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30',
    icon: <ThumbsUp size={SZ} />,
  },
  {
    value: 2,
    title: 'Really liked it',
    activeClass:   'bg-green-500/20 border-green-500/40 text-green-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-green-400 hover:border-green-500/30',
    icon: <span className="flex"><ThumbsUp size={SZ} /><ThumbsUp size={SZ} /></span>,
  },
  {
    value: 3,
    title: 'Loved it',
    activeClass:   'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-yellow-400 hover:border-yellow-500/30',
    icon: <span className="flex"><ThumbsUp size={SZ} /><ThumbsUp size={SZ} /><ThumbsUp size={SZ} /></span>,
  },
]

function ratingIcon(rating: Rating) {
  if (rating === null) return <ThumbsUp size={14} className="text-[var(--text-secondary)] opacity-40" />
  const o = OPTIONS.find((x) => x.value === rating)!
  const cls = rating === -1 ? 'text-red-400' : rating === 1 ? 'text-blue-400' : rating === 2 ? 'text-green-400' : 'text-yellow-400'
  return <span className={`flex items-center ${cls}`}>{o.icon}</span>
}

// Tap-to-expand inline rating for list rows
function InlineRatingWidget({ rating, onChange }: { rating: Rating; onChange: (r: Rating) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
              className={`px-1.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center ${
                rating === o.value
                  ? o.activeClass + ' ring-1 ring-white/20'
                  : o.inactiveClass
              }`}
            >
              {o.icon}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={rating !== null ? `${OPTIONS.find(o => o.value === rating)?.title} — tap to change` : 'Rate this'}
          className="p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center"
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
          className={`flex-1 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
            rating === o.value
              ? o.activeClass + ' ring-1 ring-white/20'
              : o.inactiveClass
          }`}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}
