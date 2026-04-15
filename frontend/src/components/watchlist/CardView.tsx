import { EntryCard } from './EntryCard'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'
import type { TitleQueueRef } from '../../hooks/useSharedQueues'

interface CardViewProps {
  groups: { label: string; entries: WatchlistEntryWithTitle[]; isUpNext?: boolean }[]
  availability: Record<string, StreamingAvailability[]>
  subscribedIds: Set<number>
  titleQueueMap?: Record<string, TitleQueueRef[]>
  currentUserId?: string
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onRecommend: (entry: WatchlistEntryWithTitle) => void
  onAddToQueue?: (entry: WatchlistEntryWithTitle) => void
  onRate: (entry: WatchlistEntryWithTitle, rating: -1 | 1 | 2 | 3 | null) => void
  onDelete: (id: string) => void
  onViewDetail: (entry: WatchlistEntryWithTitle) => void
}

export function CardView({ groups, availability, subscribedIds, titleQueueMap, currentUserId, onStatusChange, onPriorityCycle, onCaughtUpToggle, onEdit, onRecommend, onAddToQueue, onRate, onDelete, onViewDetail }: CardViewProps) {
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
                  sharedQueues={titleQueueMap?.[entry.title_id]}
                  currentUserId={currentUserId}
                  onStatusChange={onStatusChange}
                  onPriorityCycle={onPriorityCycle}
                  onCaughtUpToggle={onCaughtUpToggle}
                  onEdit={onEdit}
                  onRecommend={onRecommend}
                  onAddToQueue={onAddToQueue}
                  onRate={onRate}
                  onDelete={onDelete}
                  onViewDetail={onViewDetail}
                />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  )
}
