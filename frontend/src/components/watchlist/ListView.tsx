import { useState } from 'react'
import { EntryRow } from './EntryRow'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'
import type { TitleQueueRef } from '../../hooks/useSharedQueues'

interface ListViewProps {
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

export function ListView({ groups, availability, subscribedIds, titleQueueMap, currentUserId, onStatusChange, onPriorityCycle, onCaughtUpToggle, onEdit, onRecommend, onAddToQueue, onRate, onDelete, onViewDetail }: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  function toggle(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {groups.map((group) =>
        group.entries.length === 0 ? null : (
          <section key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-3 mb-1 hover:text-white transition-colors cursor-pointer w-full text-left"
            >
              <span className="text-[10px] opacity-60">{collapsed.has(group.label) ? '▶' : '▼'}</span>
              {group.label} ({group.entries.length})
            </button>
            {!collapsed.has(group.label) && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-white/20 divide-y divide-white/10 overflow-hidden">
                {group.entries.map((entry) => (
                  <EntryRow
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
            )}
          </section>
        )
      )}
    </div>
  )
}
