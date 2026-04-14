import { useState } from 'react'
import { cardUrl } from '../../lib/tmdb'
import { StatusBadge, PriorityDot } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { WatchlistEntryWithTitle, EntryStatus } from '../../types'

interface EntryCardProps {
  entry: WatchlistEntryWithTitle
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function EntryCard({ entry, onStatusChange, onPriorityCycle, onDelete }: EntryCardProps) {
  const { title } = entry
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nextStatus: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  const accentColor =
    entry.status === 'watching'      ? 'bg-indigo-500' :
    entry.status === 'watched'       ? 'bg-green-500'  :
                                       'bg-gray-600'

  return (
    <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden border border-white/10 flex flex-col">
      {/* 3px platform accent bar */}
      <div className={`h-[3px] w-full ${accentColor}`} />

      {/* Poster */}
      <div className="relative">
        {title.poster_path ? (
          <img
            src={cardUrl(title.poster_path)}
            alt={title.title}
            className="w-full aspect-[2/3] object-cover"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-white/10 flex items-center justify-center text-white/20 text-2xl">
            ?
          </div>
        )}

        {/* Priority dot overlay */}
        <button
          onClick={() => onPriorityCycle(entry)}
          className="absolute top-2 left-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm cursor-pointer"
          title="Click to cycle priority"
        >
          <PriorityDot priority={entry.priority} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-medium text-white leading-tight line-clamp-2">{title.title}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={entry.status} />
          {title.genres.slice(0, 1).map((g) => (
            <span key={g} className="text-xs text-[var(--text-secondary)]">{g}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 flex flex-col gap-1.5">
          {nextStatus[entry.status] && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full justify-center"
              onClick={() => onStatusChange(entry.id, nextStatus[entry.status]!.status)}
            >
              {nextStatus[entry.status]!.label}
            </Button>
          )}
          {confirmDelete ? (
            <div className="flex gap-1">
              <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => onDelete(entry.id)}>Yes, remove</Button>
              <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full justify-center" onClick={() => setConfirmDelete(true)}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
