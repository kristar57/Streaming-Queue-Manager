interface RatingWidgetProps {
  rating: -1 | 1 | 2 | null
  onChange: (rating: -1 | 1 | 2 | null) => void
}

const RATINGS: { value: -1 | 1 | 2; label: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: -1,
    label: 'Pass',
    activeClass:   'bg-red-500/20 border-red-500/40 text-red-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30',
  },
  {
    value: 1,
    label: 'Good',
    activeClass:   'bg-green-500/20 border-green-500/40 text-green-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-green-400 hover:border-green-500/30',
  },
  {
    value: 2,
    label: 'Loved',
    activeClass:   'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    inactiveClass: 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-yellow-400 hover:border-yellow-500/30',
  },
]

export function RatingWidget({ rating, onChange }: RatingWidgetProps) {
  return (
    <div className="flex gap-1">
      {RATINGS.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(rating === r.value ? null : r.value)}
          title={rating === r.value ? `Remove rating (${r.label})` : r.label}
          className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
            rating === r.value ? r.activeClass : r.inactiveClass
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
