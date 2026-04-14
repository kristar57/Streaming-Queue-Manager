import { EntryCard } from './EntryCard'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface CardViewProps {
  groups: { label: string; entries: WatchlistEntryWithTitle[] }[]
  availability: Record<string, StreamingAvailability[]>
  subscribedIds: Set<number>
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function CardView({ groups, availability, subscribedIds, onStatusChange, onPriorityCycle, onCaughtUpToggle, onDelete }: CardViewProps) {
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
              {group.entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  providers={availability[entry.title_id] ?? []}
                  subscribedIds={subscribedIds}
                  onStatusChange={onStatusChange}
                  onPriorityCycle={onPriorityCycle}
                  onCaughtUpToggle={onCaughtUpToggle}
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
