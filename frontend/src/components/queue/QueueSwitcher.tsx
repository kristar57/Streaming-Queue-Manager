import type { SharedQueue } from '../../types'

interface QueueSwitcherProps {
  queues: SharedQueue[]
  activeQueueId: string | null   // null = personal list
  onChange: (id: string | null) => void
  onCreateNew: () => void
}

export function QueueSwitcher({ queues, activeQueueId, onChange, onCreateNew }: QueueSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      {/* Personal list tab */}
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
          activeQueueId === null
            ? 'bg-[var(--accent)] text-white'
            : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white border border-white/10'
        }`}
      >
        My List
      </button>

      {/* Shared queue tabs */}
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

      {/* New queue button */}
      <button
        onClick={onCreateNew}
        className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 border border-white/10 border-dashed transition-colors cursor-pointer"
        title="Create new shared queue"
      >
        + New queue
      </button>
    </div>
  )
}
