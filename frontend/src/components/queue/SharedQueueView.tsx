import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import type { QueueTitleWithMemberEntries, StreamingAvailability } from '../../types'

interface SharedQueueViewProps {
  titles: QueueTitleWithMemberEntries[]
  availability: Record<string, StreamingAvailability[]>
  currentUserId: string
  onReorder: (id: string, dir: 'up' | 'down') => void
  onApprove: (queueTitleId: string) => void
  onReject: (queueTitleId: string) => void
  onRemove: (queueTitleId: string) => void
  onMyStatusChange: (entryId: string, status: 'want_to_watch' | 'watching' | 'watched') => void
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  want_to_watch: { label: 'Up next',   color: 'bg-white/10 text-[var(--text-secondary)]' },
  watching:      { label: 'Watching',  color: 'bg-indigo-500/20 text-indigo-300' },
  watched:       { label: 'Watched',   color: 'bg-green-500/20 text-green-300' },
  anticipated:   { label: 'Anticipated', color: 'bg-yellow-500/20 text-yellow-300' },
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
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRemove: (id: string) => void
  onMyStatusChange: (entryId: string, status: 'want_to_watch' | 'watching' | 'watched') => void
}

function QueueRow({
  qt, canMoveUp, canMoveDown, currentUserId, availability,
  onReorder, onApprove, onReject, onRemove, onMyStatusChange,
}: QueueRowProps) {
  const { title } = qt
  const [expanded, setExpanded] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const myEntry = qt.member_entries.find((m) => m.user_id === currentUserId)?.entry ?? null
  const others  = qt.member_entries.filter((m) => m.user_id !== currentUserId)

  const proposerName = qt.added_by_profile?.display_name ?? 'Someone'
  const isProposer   = qt.added_by === currentUserId
  const isProposed   = qt.status === 'proposed'
  const isRejected   = qt.status === 'rejected'

  const statusChip = getTitleStatusChip(title)
  const runtime    = formatRuntime(title)
  const year       = releaseYear(title)

  const myStatus = myEntry?.status ?? 'want_to_watch'
  const nextMyStatus: Record<string, { label: string; status: 'watching' | 'watched' }> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  return (
    <div className={`px-3 py-3 transition-colors ${isRejected ? 'opacity-60' : 'hover:bg-white/5'}`}>
      <div className="flex items-start gap-2.5">
        {/* Reorder arrows (active items only) */}
        {!isProposed && !isRejected ? (
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
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Poster */}
        {title.poster_path ? (
          <img src={thumbnailUrl(title.poster_path)} alt="" className="w-9 h-[54px] object-cover rounded flex-shrink-0 mt-0.5" />
        ) : (
          <div className="w-9 h-[54px] bg-white/10 rounded flex-shrink-0 mt-0.5 flex items-center justify-center text-white/20 text-xs">?</div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-medium text-white leading-snug">{title.title}</p>

            {/* Status badge */}
            {isProposed && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 flex-shrink-0">
                {isProposer ? 'Proposed by you' : `Proposed by ${proposerName}`}
              </span>
            )}
            {isRejected && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 flex-shrink-0">
                Rejected
              </span>
            )}
            {statusChip && !isProposed && !isRejected && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${CHIP_COLORS[statusChip.color]}`}>
                {statusChip.label}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-secondary)] flex-wrap">
            {year && <span>{year}</span>}
            {title.genres.slice(0, 2).map((g) => <span key={g}>· {g}</span>)}
            {runtime && <span>· {runtime}</span>}
            {title.tmdb_rating && <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>}
          </div>

          {/* Member status dots (active items) */}
          {!isProposed && !isRejected && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_LABEL[myStatus]?.color ?? STATUS_LABEL.want_to_watch.color}`}>
                You: {STATUS_LABEL[myStatus]?.label ?? myStatus}
              </span>
              {others.map((m) => (
                <MemberStatusDot key={m.user_id} status={m.entry?.status ?? null} name={m.display_name} />
              ))}
            </div>
          )}

          {/* Streaming (active items) */}
          {!isProposed && !isRejected && availability.length > 0 && (
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

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-center flex-shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors p-1 cursor-pointer"
          title="Actions"
        >
          <span className="text-xs">{expanded ? '▲' : '⋯'}</span>
        </button>
      </div>

      {/* Actions row */}
      {expanded && (
        <div className="flex flex-wrap gap-1.5 mt-2 pl-[calc(16px+36px+10px+8px)]">
          {/* Proposed — non-proposer sees approve/reject */}
          {isProposed && !isProposer && (
            <>
              <button
                onClick={() => onApprove(qt.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 transition-colors cursor-pointer"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => onReject(qt.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                ✗ Reject
              </button>
            </>
          )}

          {/* Proposed — proposer can cancel */}
          {isProposed && isProposer && (
            <button
              onClick={() => onRemove(qt.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              Cancel proposal
            </button>
          )}

          {/* Rejected — anyone can restore (re-propose) or permanently remove */}
          {isRejected && (
            <>
              <button
                onClick={() => onApprove(qt.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                Restore
              </button>
              {confirmRemove ? (
                <>
                  <button
                    onClick={() => onRemove(qt.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                  >
                    Remove permanently
                  </button>
                  <button
                    onClick={() => setConfirmRemove(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                >
                  Remove…
                </button>
              )}
            </>
          )}

          {/* Active — status advance + remove */}
          {!isProposed && !isRejected && (
            <>
              {nextMyStatus[myStatus] && myEntry && (
                <button
                  onClick={() => onMyStatusChange(myEntry.id, nextMyStatus[myStatus].status)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                >
                  {nextMyStatus[myStatus].label}
                </button>
              )}
              {confirmRemove ? (
                <>
                  <button
                    onClick={() => onRemove(qt.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer"
                  >
                    Confirm remove
                  </button>
                  <button
                    onClick={() => setConfirmRemove(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                >
                  Remove from queue
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function SharedQueueView({
  titles, availability, currentUserId,
  onReorder, onApprove, onReject, onRemove, onMyStatusChange,
}: SharedQueueViewProps) {
  const proposed  = titles.filter((qt) => qt.status === 'proposed')
  const active    = titles.filter((qt) => qt.status === 'active')
  const rejected  = titles.filter((qt) => qt.status === 'rejected')
  const upNext    = active.filter((qt) => qt.member_entries.some((m) => m.entry?.status !== 'watched'))
  const allWatched = active.filter((qt) => qt.member_entries.every((m) => m.entry?.status === 'watched'))

  if (titles.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)]">
        This queue is empty. Search for a title above or use the ＋ button on any personal list entry.
      </div>
    )
  }

  const renderGroup = (
    group: QueueTitleWithMemberEntries[],
    label: string,
    allForReorder: QueueTitleWithMemberEntries[]
  ) =>
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
              canMoveDown={idx < allForReorder.length - 1}
              currentUserId={currentUserId}
              availability={availability[qt.title_id] ?? []}
              onReorder={onReorder}
              onApprove={onApprove}
              onReject={onReject}
              onRemove={onRemove}
              onMyStatusChange={onMyStatusChange}
            />
          ))}
        </div>
      </section>
    )

  return (
    <div className="space-y-6">
      {renderGroup(proposed,   'Proposed',    proposed)}
      {renderGroup(upNext,     'Up next',     active)}
      {renderGroup(allWatched, 'All watched', active)}
      {renderGroup(rejected,   'Rejected',    rejected)}
    </div>
  )
}
