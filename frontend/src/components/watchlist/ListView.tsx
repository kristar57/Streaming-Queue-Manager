import { EntryRow } from './EntryRow'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface ListViewProps {
  groups: { label: string; entries: WatchlistEntryWithTitle[]; isUpNext?: boolean }[]
  availability: Record<string, StreamingAvailability[]>
  subscribedIds: Set<number>
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onReorder: (id: string, dir: 'up' | 'down') => void
  onRecommend: (entry: WatchlistEntryWithTitle) => void
  onAddToQueue?: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function ListView({ groups, availability, subscribedIds, onStatusChange, onPriorityCycle, onCaughtUpToggle, onEdit, onReorder, onRecommend, onAddToQueue, onDelete }: ListViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) =>
        group.entries.length === 0 ? null : (
          <section key={group.label}>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-3 mb-1">
              {group.label} ({group.entries.length})
            </h2>
            <div className="bg-[var(--bg-card)] rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {group.entries.map((entry, idx) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  providers={availability[entry.title_id] ?? []}
                  subscribedIds={subscribedIds}
                  canMoveUp={group.isUpNext && idx > 0}
                  canMoveDown={group.isUpNext && idx < group.entries.length - 1}
                  onStatusChange={onStatusChange}
                  onPriorityCycle={onPriorityCycle}
                  onCaughtUpToggle={onCaughtUpToggle}
                  onEdit={onEdit}
                  onReorder={group.isUpNext ? onReorder : undefined}
                  onRecommend={onRecommend}
                  onAddToQueue={onAddToQueue}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  )
}
