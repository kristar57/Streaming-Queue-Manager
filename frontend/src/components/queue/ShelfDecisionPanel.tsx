import { cardUrl, thumbnailUrl } from '../../lib/tmdb'
import { formatRuntime, releaseYear } from '../../lib/titleUtils'
import { useTrailer } from '../../hooks/useTrailer'
import type { QueueTitleWithMemberEntries, StreamingAvailability } from '../../types'

interface ShelfDecisionPanelProps {
  qt: QueueTitleWithMemberEntries
  providers: StreamingAvailability[]
  onApprove: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export function ShelfDecisionPanel({ qt, providers, onApprove, onRemove, onClose }: ShelfDecisionPanelProps) {
  const { title } = qt
  const { trailerUrl, loading: trailerLoading } = useTrailer(title.tmdb_id, title.type)
  const runtime = formatRuntime(title)
  const year    = releaseYear(title)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-[var(--bg-primary)] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Backdrop */}
        <div className="relative flex-shrink-0">
          {title.backdrop_path ? (
            <img
              src={cardUrl(title.backdrop_path)}
              alt=""
              className="w-full h-32 sm:h-44 object-cover"
            />
          ) : (
            <div className="w-full h-20 bg-white/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 left-3 flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            ← Back
          </button>

          {/* On the shelf badge */}
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            On the shelf
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Poster + title */}
          <div className="flex gap-4 px-5 -mt-10 relative z-10 mb-4">
            {title.poster_path ? (
              <img
                src={thumbnailUrl(title.poster_path)}
                alt=""
                className="w-14 h-20 object-cover rounded-lg flex-shrink-0 shadow-lg border border-white/10"
              />
            ) : (
              <div className="w-14 h-20 bg-white/10 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 pt-12">
              <h2 className="text-base font-bold text-white leading-snug">{title.title}</h2>
              {title.tagline && (
                <p className="text-xs text-[var(--text-secondary)] italic mt-0.5 leading-snug">{title.tagline}</p>
              )}
            </div>
          </div>

          <div className="px-5 space-y-4 pb-6">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              {year && <span>{year}</span>}
              {title.type === 'movie' ? <span>· Movie</span> : <span>· Series</span>}
              {runtime && <span>· {runtime}</span>}
              {title.tmdb_rating && (
                <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>
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
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{title.overview}</p>
            )}

            {/* Director / Creator */}
            {(title.director || title.created_by) && (
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="opacity-60">{title.type === 'movie' ? 'Dir. ' : 'Created by '}</span>
                {title.director ?? title.created_by}
              </p>
            )}

            {/* Cast */}
            {title.cast_members && title.cast_members.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Cast</p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {title.cast_members.slice(0, 6).map((c) => (
                    <div key={c.name} className="flex-shrink-0 text-center w-12">
                      {c.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${c.profile_path}`}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover mx-auto mb-1 border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 mx-auto mb-1" />
                      )}
                      <p className="text-[10px] text-white leading-tight truncate">{c.name.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming */}
            {providers.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Available on</p>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p) => (
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
                </div>
              </div>
            )}

            {/* Trailer */}
            {!trailerLoading && trailerUrl && (
              <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-600/20 border border-red-600/30 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors"
              >
                ▶ Watch Trailer
              </a>
            )}

            {/* Decision actions */}
            <div className="flex gap-3 pt-1 border-t border-white/10">
              <button
                onClick={() => { onApprove(qt.id); onClose() }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 active:scale-95 transition-all cursor-pointer"
              >
                ✓ Add to queue
              </button>
              <button
                onClick={() => { onRemove(qt.id); onClose() }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
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
