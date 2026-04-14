import { EntryCard } from './EntryCard'
import type { WatchlistEntryWithTitle, EntryStatus } from '../../types'

interface CardViewProps {
  groups: { label: string; entries: WatchlistEntryWithTitle[] }[]
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function CardView({ groups, onStatusChange, onPriorityCycle, onDelete }: CardViewProps) {
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
                  onStatusChange={onStatusChange}
                  onPriorityCycle={onPriorityCycle}
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
