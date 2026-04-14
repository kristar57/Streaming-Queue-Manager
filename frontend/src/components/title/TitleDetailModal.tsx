import { cardUrl, thumbnailUrl } from '../../lib/tmdb'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import { StatusBadge } from '../ui/Badge'
import type { WatchlistEntryWithTitle, EntryStatus, StreamingAvailability } from '../../types'

interface TitleDetailModalProps {
  entry: WatchlistEntryWithTitle
  providers: StreamingAvailability[]
  subscribedIds: Set<number>
  onClose: () => void
  onStatusChange: (id: string, status: EntryStatus) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
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

const NEXT_STATUS: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
  anticipated:   { label: 'Move to Up Next', status: 'want_to_watch' },
  want_to_watch: { label: 'Start watching',  status: 'watching' },
  watching:      { label: 'Mark watched',    status: 'watched' },
}

export function TitleDetailModal({
  entry, providers, subscribedIds,
  onClose, onStatusChange, onEdit, onRecommend, onAddToQueue, onDelete,
}: TitleDetailModalProps) {
  const { title } = entry

  const myProviders    = providers.filter((p) => subscribedIds.has(p.provider_id))
  const otherProviders = providers.filter((p) => !subscribedIds.has(p.provider_id))
  const statusChip     = getTitleStatusChip(title)
  const runtime        = formatRuntime(title)
  const year           = releaseYear(title)
  const nextStatus     = NEXT_STATUS[entry.status]

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-[var(--bg-primary)] sm:rounded-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden">

        {/* Backdrop + back button */}
        <div className="relative flex-shrink-0">
          {title.backdrop_path ? (
            <img
              src={cardUrl(title.backdrop_path)}
              alt=""
              className="w-full h-40 sm:h-52 object-cover"
            />
          ) : (
            <div className="w-full h-24 bg-white/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            ← Back to list
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title + poster row */}
          <div className="flex gap-4 px-5 -mt-12 relative z-10 mb-4">
            {title.poster_path ? (
              <img
                src={thumbnailUrl(title.poster_path)}
                alt=""
                className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-lg border border-white/10"
              />
            ) : (
              <div className="w-16 h-24 bg-white/10 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 pt-14">
              <h1 className="text-lg font-bold text-white leading-snug">{title.title}</h1>
              {title.tagline && (
                <p className="text-xs text-[var(--text-secondary)] italic mt-0.5">{title.tagline}</p>
              )}
            </div>
          </div>

          <div className="px-5 space-y-5 pb-6">
            {/* Meta chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <StatusBadge status={entry.status} isCaughtUp={entry.is_caught_up} />
              {statusChip && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
                  {statusChip.label}
                </span>
              )}
              {year && <span className="text-xs text-[var(--text-secondary)]">{year}</span>}
              {title.type === 'movie' ? (
                <span className="text-xs text-[var(--text-secondary)]">· Movie</span>
              ) : (
                <span className="text-xs text-[var(--text-secondary)]">· Series</span>
              )}
              {runtime && <span className="text-xs text-[var(--text-secondary)]">· {runtime}</span>}
              {title.tmdb_rating && (
                <span className="text-xs text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>
              )}
            </div>

            {/* Genres */}
            {title.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {title.genres.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-[var(--text-secondary)]">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {title.overview && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Overview</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{title.overview}</p>
              </div>
            )}

            {/* Show-specific details */}
            {title.type === 'show' && (title.season_count || title.network || title.created_by) && (
              <div className="grid grid-cols-2 gap-3">
                {title.season_count && (
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">Seasons</p>
                    <p className="text-sm text-white mt-0.5">{title.season_count}</p>
                  </div>
                )}
                {title.episode_count && (
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">Episodes</p>
                    <p className="text-sm text-white mt-0.5">{title.episode_count}</p>
                  </div>
                )}
                {title.network && (
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">Network</p>
                    <p className="text-sm text-white mt-0.5">{title.network}</p>
                  </div>
                )}
                {title.created_by && (
                  <div>
                    <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">Created by</p>
                    <p className="text-sm text-white mt-0.5">{title.created_by}</p>
                  </div>
                )}
              </div>
            )}

            {/* Movie-specific details */}
            {title.type === 'movie' && title.director && (
              <div>
                <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">Director</p>
                <p className="text-sm text-white mt-0.5">{title.director}</p>
              </div>
            )}

            {/* Cast */}
            {title.cast_members && title.cast_members.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Cast</p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {title.cast_members.map((c) => (
                    <div key={c.name} className="flex-shrink-0 text-center w-14">
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover mx-auto mb-1 border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/10 mx-auto mb-1 flex items-center justify-center text-white/20 text-xs">?</div>
                      )}
                      <p className="text-[10px] text-white leading-tight">{c.name}</p>
                      {c.character && (
                        <p className="text-[9px] text-[var(--text-secondary)] leading-tight mt-0.5 truncate">{c.character}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming availability */}
            {(myProviders.length > 0 || otherProviders.length > 0) && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Available on</p>
                <div className="flex flex-wrap gap-2">
                  {myProviders.map((p) => (
                    <span
                      key={p.provider_id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium"
                    >
                      {p.provider_logo_path && (
                        <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-4 h-4 rounded-sm object-cover" />
                      )}
                      {p.provider_name}
                    </span>
                  ))}
                  {otherProviders.map((p) => (
                    <span
                      key={p.provider_id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] text-xs"
                    >
                      {p.provider_logo_path && (
                        <img src={`https://image.tmdb.org/t/p/w45${p.provider_logo_path}`} alt="" className="w-4 h-4 rounded-sm object-cover opacity-50" />
                      )}
                      {p.provider_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                  {entry.notes}
                </p>
              </div>
            )}

            {/* Episode tracking */}
            {entry.current_season && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Progress</p>
                <p className="text-sm text-white">
                  Season {entry.current_season}{entry.current_episode ? `, Episode ${entry.current_episode}` : ''}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {nextStatus && (
                <button
                  onClick={() => { onStatusChange(entry.id, nextStatus.status); onClose() }}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {nextStatus.label}
                </button>
              )}
              <button
                onClick={() => { onEdit(entry); onClose() }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                ✏ Edit
              </button>
              <button
                onClick={() => { onRecommend(entry); onClose() }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                ↗ Recommend
              </button>
              {onAddToQueue && (
                <button
                  onClick={() => { onAddToQueue(entry); onClose() }}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                >
                  ＋ Add to queue
                </button>
              )}
              <button
                onClick={() => { onDelete(entry.id); onClose() }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer ml-auto"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
