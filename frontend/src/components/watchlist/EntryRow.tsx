import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { StatusBadge, PriorityDot } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface EntryRowProps {
  entry: WatchlistEntryWithTitle
  providers: StreamingAvailability[]
  subscribedIds: Set<number>
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

const CHIP_COLORS = {
  blue:   'bg-blue-500/20 text-blue-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  gray:   'bg-white/10 text-[var(--text-secondary)]',
  red:    'bg-red-500/20 text-red-300',
}

export function EntryRow({
  entry,
  providers,
  subscribedIds,
  onStatusChange,
  onPriorityCycle,
  onCaughtUpToggle,
  onDelete,
}: EntryRowProps) {
  const { title } = entry
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nextStatus: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  const statusChip = getTitleStatusChip(title)
  const runtime    = formatRuntime(title)
  const year       = releaseYear(title)

  const myProviders    = providers.filter((p) => subscribedIds.has(p.provider_id))
  const otherProviders = providers.filter((p) => !subscribedIds.has(p.provider_id))

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
      {/* Poster thumbnail */}
      {title.poster_path ? (
        <img
          src={thumbnailUrl(title.poster_path)}
          alt=""
          className="w-9 h-[54px] object-cover rounded flex-shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-9 h-[54px] bg-white/10 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-white/20 text-xs">?</div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: priority + title + status badge */}
        <div className="flex items-center gap-2">
          <button onClick={() => onPriorityCycle(entry)} className="cursor-pointer flex-shrink-0" title="Click to cycle priority">
            <PriorityDot priority={entry.priority} />
          </button>
          <p className="text-sm font-medium text-white truncate">{title.title}</p>
          <div className="flex-shrink-0 ml-auto flex items-center gap-1.5">
            <StatusBadge status={entry.status} isCaughtUp={entry.is_caught_up} />
            {statusChip && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
                {statusChip.label}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: year · genres · runtime */}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-[var(--text-secondary)]">
          {year && <span>{year}</span>}
          {title.genres.slice(0, 2).map((g) => (
            <span key={g}>· {g}</span>
          ))}
          {runtime && <span>· {runtime}</span>}
          {title.tmdb_rating && (
            <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>
          )}
        </div>

        {/* Row 3: streaming providers (compact) */}
        {(myProviders.length > 0 || otherProviders.length > 0) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {myProviders.map((p) => (
              <span
                key={p.provider_id}
                title={`${p.provider_name} — in your subscriptions`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30"
              >
                {p.provider_logo_path && (
                  <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-3 h-3 rounded-sm object-cover" />
                )}
                {p.provider_name}
              </span>
            ))}
            {otherProviders.slice(0, 2).map((p) => (
              <span
                key={p.provider_id}
                title={`${p.provider_name} — not in your subscriptions`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-secondary)] border border-white/10"
              >
                {p.provider_logo_path && (
                  <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-3 h-3 rounded-sm object-cover opacity-40" />
                )}
                {p.provider_name}
              </span>
            ))}
            {otherProviders.length > 2 && (
              <span className="text-[10px] text-[var(--text-secondary)]">+{otherProviders.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
        {entry.status === 'watching' && title.type === 'show' && (
          <Button
            size="sm"
            variant={entry.is_caught_up ? 'primary' : 'ghost'}
            onClick={() => onCaughtUpToggle(entry)}
            title={entry.is_caught_up ? 'Mark as still watching' : 'Mark as caught up'}
          >
            {entry.is_caught_up ? '✓ Caught up' : 'Caught up'}
          </Button>
        )}
        {nextStatus[entry.status] && (
          <Button size="sm" variant="secondary" onClick={() => onStatusChange(entry.id, nextStatus[entry.status]!.status)}>
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
