import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { StatusBadge, PriorityDot } from '../ui/Badge'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface EntryRowProps {
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
}: EntryRowProps) {
  const { title } = entry
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
    <div className="px-3 py-2.5 hover:bg-white/5 transition-colors">
      {/* Main row */}
      <div className="flex items-start gap-2.5">
        {/* Queue reorder arrows (Up Next only) */}
        {onReorder && (
          <div className="flex flex-col gap-0.5 self-center flex-shrink-0">
            <button
              onClick={() => onReorder(entry.id, 'up')}
              disabled={!canMoveUp}
              className="text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px] leading-none"
              title="Move up"
            >▲</button>
            <button
              onClick={() => onReorder(entry.id, 'down')}
              disabled={!canMoveDown}
              className="text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px] leading-none"
              title="Move down"
            >▼</button>
          </div>
        )}

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

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-1.5">
            <button onClick={() => onPriorityCycle(entry)} className="cursor-pointer flex-shrink-0 mt-0.5" title="Cycle priority">
              <PriorityDot priority={entry.priority} />
            </button>
            <p className="text-sm font-medium text-white leading-snug flex-1 min-w-0">{title.title}</p>
            <div className="flex-shrink-0 flex items-center gap-1">
              <StatusBadge status={entry.status} isCaughtUp={entry.is_caught_up} />
              {statusChip && (
                <span className={`hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
                  {statusChip.label}
                </span>
              )}
            </div>
          </div>

          {/* Meta line */}
          <div className="flex items-center gap-1 mt-0.5 flex-wrap text-[11px] text-[var(--text-secondary)]">
            {year && <span>{year}</span>}
            {title.genres.slice(0, 2).map((g) => <span key={g}>· {g}</span>)}
            {runtime && <span>· {runtime}</span>}
            {title.tmdb_rating && <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>}
            {entry.profile && <span className="opacity-60">· {entry.profile.display_name}</span>}
            {statusChip && (
              <span className={`sm:hidden px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
                {statusChip.label}
              </span>
            )}
          </div>

          {/* Streaming providers (compact) */}
          {(myProviders.length > 0 || otherProviders.length > 0) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {myProviders.slice(0, 2).map((p) => (
                <span
                  key={p.provider_id}
                  title={`${p.provider_name} — in your subscriptions`}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30"
                >
                  {p.provider_logo_path && (
                    <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-3 h-3 rounded-sm object-cover" />
                  )}
                  <span className="hidden sm:inline">{p.provider_name}</span>
                </span>
              ))}
              {otherProviders.slice(0, 1).map((p) => (
                <span
                  key={p.provider_id}
                  title={`${p.provider_name} — not in your subscriptions`}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-secondary)] border border-white/10"
                >
                  {p.provider_logo_path && (
                    <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-3 h-3 rounded-sm object-cover opacity-40" />
                  )}
                  <span className="hidden sm:inline">{p.provider_name}</span>
                </span>
              ))}
              {(myProviders.length + otherProviders.length) > 3 && (
                <span className="text-[10px] text-[var(--text-secondary)]">+{myProviders.length + otherProviders.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Expand toggle — always visible on mobile */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-center flex-shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors p-1 cursor-pointer"
          title="Actions"
        >
          <span className="text-xs">{expanded ? '▲' : '⋯'}</span>
        </button>
      </div>

      {/* Actions row — always visible on mobile via expand, desktop via hover group */}
      {expanded && (
        <div className="flex flex-wrap gap-1.5 mt-2 pl-[calc(36px+10px+8px)]">
          {(entry.status === 'watching' || entry.status === 'want_to_watch') && title.type === 'show' && (
            <button
              onClick={() => onCaughtUpToggle(entry)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                entry.is_caught_up
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {entry.is_caught_up ? '✓ Caught up' : 'Caught up'}
            </button>
          )}
          {nextStatus[entry.status] && (
            <button
              onClick={() => onStatusChange(entry.id, nextStatus[entry.status]!.status)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              {nextStatus[entry.status]!.label}
            </button>
          )}
          <button onClick={() => onEdit(entry)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
            ✏ Edit
          </button>
          <button onClick={() => onRecommend(entry)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
            ↗ Rec
          </button>
          {onAddToQueue && (
            <button onClick={() => onAddToQueue(entry)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
              ＋ Queue
            </button>
          )}
          {confirmDelete ? (
            <>
              <button onClick={() => onDelete(entry.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer">
                Confirm remove
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
