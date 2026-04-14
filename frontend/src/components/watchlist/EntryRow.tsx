import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { StatusBadge, PriorityDot } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { WatchlistEntryWithTitle, EntryStatus } from '../../types'

interface EntryRowProps {
  entry: WatchlistEntryWithTitle
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function EntryRow({ entry, onStatusChange, onPriorityCycle, onDelete }: EntryRowProps) {
  const { title } = entry
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nextStatus: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
      {/* Poster thumbnail */}
      {title.poster_path ? (
        <img
          src={thumbnailUrl(title.poster_path)}
          alt=""
          className="w-9 h-[54px] object-cover rounded flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-[54px] bg-white/10 rounded flex-shrink-0 flex items-center justify-center text-white/20 text-xs">
          ?
        </div>
      )}

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPriorityCycle(entry)}
            className="cursor-pointer flex-shrink-0"
            title="Click to cycle priority"
          >
            <PriorityDot priority={entry.priority} />
          </button>
          <p className="text-sm font-medium text-white truncate">{title.title}</p>
        </div>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <StatusBadge status={entry.status} />
          {title.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-xs text-[var(--text-secondary)]">{g}</span>
          ))}
        </div>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {nextStatus[entry.status] && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onStatusChange(entry.id, nextStatus[entry.status]!.status)}
          >
            {nextStatus[entry.status]!.label}
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button size="sm" variant="danger" onClick={() => onDelete(entry.id)}>Confirm</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>Remove</Button>
        )}
      </div>
    </div>
  )
}
