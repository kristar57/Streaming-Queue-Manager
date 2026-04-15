import type { SharedQueue } from '../../types'

interface QueueSwitcherProps {
  queues: SharedQueue[]
  activeQueueId: string | null   // null = personal Up Next
  onChange: (id: string | null) => void
  onCreateNew: () => void
  personalLabel?: string
  showPersonal?: boolean
  showNewButton?: boolean
}

export function QueueSwitcher({ queues, activeQueueId, onChange, onCreateNew, personalLabel = 'My List', showPersonal = true, showNewButton = true }: QueueSwitcherProps) {
  return (
    <>
      {/* Mobile: native dropdown */}
      <div className="sm:hidden flex items-center gap-2 w-full">
        <select
          value={activeQueueId ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="flex-1 bg-[var(--bg-card)] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)] cursor-pointer"
        >
          {showPersonal && <option value="">{personalLabel}</option>}
          {queues.map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
        {showNewButton && (
          <button
            onClick={onCreateNew}
            className="px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white border border-white/10 border-dashed transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            + New
          </button>
        )}
      </div>

      {/* sm+: tab pills */}
      <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
        {showPersonal && (
          <button
            onClick={() => onChange(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeQueueId === null
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {personalLabel}
          </button>
        )}
        {queues.map((q) => (
          <button
            key={q.id}
            onClick={() => onChange(q.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeQueueId === q.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {q.name}
          </button>
        ))}
        {showNewButton && (
          <button
            onClick={onCreateNew}
            className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 border border-white/10 border-dashed transition-colors cursor-pointer"
          >
            + New queue
          </button>
        )}
      </div>
    </>
  )
}
