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
  onReorder: (id: string, dir: 'up' | 'down') => void
  onRecommend: (entry: WatchlistEntryWithTitle) => void
  onAddToQueue?: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
  onViewDetail: (entry: WatchlistEntryWithTitle) => void
}

export function CardView({ groups, availability, subscribedIds, titleQueueMap, currentUserId, onStatusChange, onPriorityCycle, onCaughtUpToggle, onEdit, onReorder, onRecommend, onAddToQueue, onDelete, onViewDetail }: CardViewProps) {
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
                  sharedQueues={titleQueueMap?.[entry.title_id]}
                  currentUserId={currentUserId}
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
