import { EntryCard } from './EntryCard'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface CardViewProps {
  groups: { label: string; entries: WatchlistEntryWithTitle[]; isUpNext?: boolean }[]
  availability: Record<string, StreamingAvailability[]>
  subscribedIds: Set<number>
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onReorder: (id: string, dir: 'up' | 'down') => void
  onRecommend: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function CardView({ groups, availability, subscribedIds, onStatusChange, onPriorityCycle, onCaughtUpToggle, onEdit, onReorder, onRecommend, onDelete }: CardViewProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) =>
        group.entries.length === 0 ? null : (
          <section key={group.label}>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              {group.label} ({group.entries.length})
            </h2>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
            >
              {group.entries.map((entry, idx) => (
                <EntryCard
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
