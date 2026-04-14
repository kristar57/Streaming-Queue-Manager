import { useState } from 'react'
import { cardUrl, thumbnailUrl } from '../../lib/tmdb'
import { StatusBadge, PriorityDot } from '../ui/Badge'
import { Button } from '../ui/Button'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

const CHIP_COLORS = {
  blue:   'bg-blue-500/20 text-blue-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  gray:   'bg-white/10 text-[var(--text-secondary)]',
  red:    'bg-red-500/20 text-red-300',
}

interface EntryCardProps {
  entry: WatchlistEntryWithTitle
  providers: StreamingAvailability[]
  subscribedIds: Set<number>
  canMoveUp?: boolean
  canMoveDown?: boolean
  onStatusChange: (id: string, status: EntryStatus) => void
  onPriorityCycle: (entry: WatchlistEntryWithTitle) => void
  onCaughtUpToggle: (entry: WatchlistEntryWithTitle) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onReorder?: (id: string, dir: 'up' | 'down') => void
  onRecommend: (entry: WatchlistEntryWithTitle) => void
  onAddToQueue?: (entry: WatchlistEntryWithTitle) => void
  onDelete: (id: string) => void
}

export function EntryCard({
  entry,
  providers,
  subscribedIds,
  canMoveUp,
  canMoveDown,
  onStatusChange,
  onPriorityCycle,
  onCaughtUpToggle,
  onEdit,
  onReorder,
  onRecommend,
  onAddToQueue,
  onDelete,
}: EntryCardProps) {
  const { title } = entry
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nextStatus: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  const accentColor =
    entry.status === 'watching' ? 'bg-indigo-500' :
    entry.status === 'watched'  ? 'bg-green-500'  :
                                  'bg-gray-600'

  const statusChip = getTitleStatusChip(title)
  const runtime    = formatRuntime(title)
  const year       = releaseYear(title)

  const myProviders    = providers.filter((p) => subscribedIds.has(p.provider_id))
  const otherProviders = providers.filter((p) => !subscribedIds.has(p.provider_id))

  return (
    <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden border border-white/10 flex flex-col">
      {/* 3px status accent bar */}
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

        {/* Priority dot */}
        <button
          onClick={() => onPriorityCycle(entry)}
          className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm cursor-pointer"
          title="Click to cycle priority"
        >
          <PriorityDot priority={entry.priority} />
        </button>

        {/* Queue reorder arrows */}
        {onReorder && (
          <div className="absolute top-2 right-2 flex flex-col gap-0.5">
            <button
              onClick={() => onReorder(entry.id, 'up')}
              disabled={!canMoveUp}
              className="w-5 h-5 flex items-center justify-center rounded bg-black/60 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px]"
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={() => onReorder(entry.id, 'down')}
              disabled={!canMoveDown}
              className="w-5 h-5 flex items-center justify-center rounded bg-black/60 text-white/70 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px]"
              title="Move down"
            >
              ▼
            </button>
          </div>
        )}

        {/* Status chip overlay (no reorder arrows above = top-right) */}
        {statusChip && !onReorder && (
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
            {statusChip.label}
          </span>
        )}
        {statusChip && onReorder && (
          <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
            {statusChip.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-2 min-w-0">
        {/* Title */}
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{title.title}</p>

        {/* Year · runtime/seasons · rating */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-[var(--text-secondary)]">
          {year && <span>{year}</span>}
          {runtime && <><span>·</span><span>{runtime}</span></>}
          {title.tmdb_rating && (
            <><span>·</span><span className="text-yellow-400">★ {title.tmdb_rating.toFixed(1)}</span></>
          )}
        </div>

        {/* Added by (if not own entry) */}
        {entry.profile && (
          <p className="text-[10px] text-[var(--text-secondary)] opacity-60">{entry.profile.display_name}</p>
        )}

        {/* Tagline */}
        {title.tagline && (
          <p className="text-[11px] italic text-[var(--text-secondary)] line-clamp-1 opacity-70">
            {title.tagline}
          </p>
        )}

        {/* Overview */}
        {title.overview && (
          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
            {title.overview}
          </p>
        )}

        {/* Director / Creator / Network */}
        {(title.director || title.created_by) && (
          <p className="text-[11px] text-[var(--text-secondary)]">
            <span className="opacity-60">{title.type === 'movie' ? 'Dir. ' : 'By '}</span>
            {title.director ?? title.created_by}
          </p>
        )}
        {title.network && (
          <p className="text-[11px] text-[var(--text-secondary)] opacity-60">{title.network}</p>
        )}

        {/* Cast */}
        {title.cast_members && title.cast_members.length > 0 && (
          <div className="flex gap-2 mt-0.5">
            {title.cast_members.slice(0, 3).map((c) => (
              <div key={c.name} className="flex flex-col items-center gap-0.5 min-w-0">
                {c.profile_path ? (
                  <img
                    src={thumbnailUrl(c.profile_path)}
                    alt={c.name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
                )}
                <span className="text-[9px] text-[var(--text-secondary)] truncate max-w-[40px] leading-tight">
                  {c.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Streaming availability */}
        {(myProviders.length > 0 || otherProviders.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {myProviders.map((p) => (
              <span
                key={p.provider_id}
                title={`${p.provider_name} — included in your subscription`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30"
              >
                {p.provider_logo_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm object-cover"
                  />
                )}
                {p.provider_name}
              </span>
            ))}
            {otherProviders.slice(0, 2).map((p) => (
              <span
                key={p.provider_id}
                title={`${p.provider_name} — not in your subscriptions`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-[var(--text-secondary)] border border-white/10"
              >
                {p.provider_logo_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm object-cover opacity-50"
                  />
                )}
                {p.provider_name}
              </span>
            ))}
            {otherProviders.length > 2 && (
              <span className="text-[10px] text-[var(--text-secondary)]">
                +{otherProviders.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Status badge */}
        <div className="mt-auto pt-1">
          <StatusBadge status={entry.status} isCaughtUp={entry.is_caught_up} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5">
          {entry.status === 'watching' && entry.title.type === 'show' && (
            <Button
              size="sm"
              variant={entry.is_caught_up ? 'primary' : 'secondary'}
              className="w-full justify-center"
              onClick={() => onCaughtUpToggle(entry)}
            >
              {entry.is_caught_up ? '✓ Caught up' : 'Mark caught up'}
            </Button>
          )}
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
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => onEdit(entry)} title="Edit">✏ Edit</Button>
            <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => onRecommend(entry)} title="Recommend">↗ Rec</Button>
            {onAddToQueue && (
              <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => onAddToQueue(entry)} title="Add to shared queue">＋ Queue</Button>
            )}
          </div>
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
