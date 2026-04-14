import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import { Button } from '../ui/Button'
import type { QueueTitleWithMemberEntries, StreamingAvailability } from '../../types'

interface SharedQueueViewProps {
  titles: QueueTitleWithMemberEntries[]
  availability: Record<string, StreamingAvailability[]>
  currentUserId: string
  onReorder: (id: string, dir: 'up' | 'down') => void
  onRemove: (queueTitleId: string) => void
  onMyStatusChange: (entryId: string, status: 'want_to_watch' | 'watching' | 'watched') => void
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  want_to_watch: { label: 'Up next',   color: 'bg-white/10 text-[var(--text-secondary)]' },
  watching:      { label: 'Watching',  color: 'bg-indigo-500/20 text-indigo-300' },
  watched:       { label: 'Watched',   color: 'bg-green-500/20 text-green-300' },
}

const CHIP_COLORS = {
  blue:   'bg-blue-500/20 text-blue-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  gray:   'bg-white/10 text-[var(--text-secondary)]',
  red:    'bg-red-500/20 text-red-300',
}

function MemberStatusDot({ status, name }: { status: string | null; name: string }) {
  const s = status ?? 'want_to_watch'
  const dot =
    s === 'watched'  ? 'bg-green-400' :
    s === 'watching' ? 'bg-indigo-400' :
                       'bg-white/20'
  return (
    <span title={`${name}: ${STATUS_LABEL[s]?.label ?? s}`} className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[48px]">{name.split(' ')[0]}</span>
    </span>
  )
}

interface QueueRowProps {
  qt: QueueTitleWithMemberEntries
  canMoveUp: boolean
  canMoveDown: boolean
  currentUserId: string
  availability: StreamingAvailability[]
  onReorder: (id: string, dir: 'up' | 'down') => void
  onRemove: (id: string) => void
  onMyStatusChange: (entryId: string, status: 'want_to_watch' | 'watching' | 'watched') => void
}

function QueueRow({ qt, canMoveUp, canMoveDown, currentUserId, availability, onReorder, onRemove, onMyStatusChange }: QueueRowProps) {
  const { title } = qt
  const [confirmRemove, setConfirmRemove] = useState(false)

  const myEntry = qt.member_entries.find((m) => m.user_id === currentUserId)?.entry ?? null
  const others  = qt.member_entries.filter((m) => m.user_id !== currentUserId)

  const statusChip = getTitleStatusChip(title)
  const runtime    = formatRuntime(title)
  const year       = releaseYear(title)

  const myStatus = myEntry?.status ?? 'want_to_watch'
  const nextMyStatus: Record<string, { label: string; status: 'watching' | 'watched' }> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  return (
    <div className="flex items-start gap-3 px-3 py-3 hover:bg-white/5 transition-colors group">
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 self-center flex-shrink-0 w-4">
        <button
          onClick={() => onReorder(qt.id, 'up')}
          disabled={!canMoveUp}
          className="text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px] leading-none"
        >▲</button>
        <button
          onClick={() => onReorder(qt.id, 'down')}
          disabled={!canMoveDown}
          className="text-[var(--text-secondary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[10px] leading-none"
        >▼</button>
      </div>

      {/* Poster */}
      {title.poster_path ? (
        <img src={thumbnailUrl(title.poster_path)} alt="" className="w-9 h-[54px] object-cover rounded flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-9 h-[54px] bg-white/10 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-white/20 text-xs">?</div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white truncate">{title.title}</p>
          {statusChip && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${CHIP_COLORS[statusChip.color]}`}>
              {statusChip.label}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[var(--text-secondary)] flex-wrap">
          {year && <span>{year}</span>}
          {title.genres.slice(0, 2).map((g) => <span key={g}>· {g}</span>)}
          {runtime && <span>· {runtime}</span>}
          {title.tmdb_rating && <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>}
        </div>

        {/* Member status dots */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* My status chip */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_LABEL[myStatus].color}`}>
            You: {STATUS_LABEL[myStatus].label}
          </span>
          {/* Others' dots */}
          {others.map((m) => (
            <MemberStatusDot key={m.user_id} status={m.entry?.status ?? null} name={m.display_name} />
          ))}
        </div>

        {/* Streaming */}
        {availability.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {availability.slice(0, 3).map((p) => (
              <span key={p.provider_id} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-300 border border-green-500/30">
                {p.provider_logo_path && (
                  <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-3 h-3 rounded-sm object-cover" />
                )}
                {p.provider_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
        {nextMyStatus[myStatus] && myEntry && (
          <Button size="sm" variant="secondary" onClick={() => onMyStatusChange(myEntry.id, nextMyStatus[myStatus].status)}>
            {nextMyStatus[myStatus].label}
          </Button>
        )}
        {confirmRemove ? (
          <>
            <Button size="sm" variant="danger" onClick={() => onRemove(qt.id)}>Remove</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>Remove from queue</Button>
        )}
      </div>
    </div>
  )
}

export function SharedQueueView({ titles, availability, currentUserId, onReorder, onRemove, onMyStatusChange }: SharedQueueViewProps) {
  if (titles.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)]">
        This queue is empty. Add titles from your personal list using the ＋ button on any entry.
      </div>
    )
  }

  // Group by everyone's status: Up Next = any member not yet watched; Done = all watched
  const upNext = titles.filter((qt) => qt.member_entries.some((m) => m.entry?.status !== 'watched'))
  const allWatched = titles.filter((qt) => qt.member_entries.every((m) => m.entry?.status === 'watched'))

  const renderGroup = (group: QueueTitleWithMemberEntries[], label: string) =>
    group.length === 0 ? null : (
      <section key={label}>
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-4 mb-1">
          {label} ({group.length})
        </h2>
        <div className="bg-[var(--bg-card)] rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {group.map((qt, idx) => (
            <QueueRow
              key={qt.id}
              qt={qt}
              canMoveUp={idx > 0}
              canMoveDown={idx < group.length - 1}
              currentUserId={currentUserId}
              availability={availability[qt.title_id] ?? []}
              onReorder={onReorder}
              onRemove={onRemove}
              onMyStatusChange={onMyStatusChange}
            />
          ))}
        </div>
      </section>
    )

  return (
    <div className="space-y-6">
      {renderGroup(upNext, 'Up next')}
      {renderGroup(allWatched, 'All watched')}
    </div>
  )
}
