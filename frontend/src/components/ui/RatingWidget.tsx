type Rating = -1 | 1 | 2 | 3 | null

interface RatingWidgetProps {
  rating: Rating
  onChange: (rating: Rating) => void
  compact?: boolean
}

const OPTIONS: { value: -1 | 1 | 2 | 3; label: string; title: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: -1,
    label: '👎',
    title: 'Not for me',
    activeClass:   'bg-red-500/20 border-red-500/40 text-red-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30',
  },
  {
    value: 1,
    label: '👍',
    title: 'Liked it',
    activeClass:   'bg-green-500/15 border-green-500/30 text-green-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-green-400 hover:border-green-500/30',
  },
  {
    value: 2,
    label: '👍👍',
    title: 'Really liked it',
    activeClass:   'bg-green-500/25 border-green-500/50 text-green-300',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-green-300 hover:border-green-500/40',
  },
  {
    value: 3,
    label: '👍👍👍',
    title: 'Loved it',
    activeClass:   'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-yellow-400 hover:border-yellow-500/30',
  },
]

// Compact vertical strip for list rows — always visible inline
function CompactRatingWidget({ rating, onChange }: { rating: Rating; onChange: (r: Rating) => void }) {
  return (
    <div className="flex flex-col gap-0.5 flex-shrink-0">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(rating === o.value ? null : o.value)}
          title={rating === o.value ? `Clear rating (${o.title})` : o.title}
          className={`px-1.5 py-0.5 rounded text-[11px] border transition-colors cursor-pointer leading-none ${
            rating === o.value ? o.activeClass : o.inactiveClass
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Full horizontal row for card view
export function RatingWidget({ rating, onChange, compact = false }: RatingWidgetProps) {
  if (compact) return <CompactRatingWidget rating={rating} onChange={onChange} />

  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(rating === o.value ? null : o.value)}
          title={rating === o.value ? `Clear rating (${o.title})` : o.title}
          className={`flex-1 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
            rating === o.value ? o.activeClass : o.inactiveClass
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
