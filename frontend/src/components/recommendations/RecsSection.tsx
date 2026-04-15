import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import type { TMDBSearchResult, WatchlistEntryWithTitle } from '../../types'
import type { PartnerRec } from '../../hooks/useAutoRecs'

// ---------------------------------------------------------------
// A single horizontally-scrollable shelf of TMDB recommendation cards
// ---------------------------------------------------------------
function RecShelf({
  recs,
  loading,
  emptyText,
  dismissedIds,
  onSelect,
  onDismiss,
}: {
  recs: TMDBSearchResult[]
  loading: boolean
  emptyText: string
  dismissedIds?: Set<number>
  onSelect: (r: TMDBSearchResult) => void
  onDismiss?: (tmdbId: number) => void
}) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[88px]">
            <div className="w-full aspect-[2/3] bg-white/10 rounded-lg animate-pulse" />
            <div className="h-2.5 bg-white/10 rounded mt-1.5 w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  const visible = dismissedIds ? recs.filter((r) => !dismissedIds.has(r.id)) : recs

  if (visible.length === 0) {
    return <p className="text-xs text-[var(--text-secondary)] py-2 px-1">{emptyText}</p>
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {visible.map((r) => (
        <div key={r.id} className="flex-shrink-0 w-[88px] relative group">
          <button
            onClick={() => onSelect(r)}
            className="w-full text-left cursor-pointer"
          >
            {r.poster_path ? (
              <img
                src={thumbnailUrl(r.poster_path)}
                alt=""
                className="w-full aspect-[2/3] object-cover rounded-lg group-hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-white/10 rounded-lg flex items-center justify-center text-white/20 text-xl">?</div>
            )}
            <p className="text-[11px] text-white mt-1 line-clamp-2 leading-tight">{r.title ?? r.name}</p>
            {(r.vote_average ?? 0) > 0 && (
              <p className="text-[10px] text-yellow-400">★ {r.vote_average.toFixed(1)}</p>
            )}
          </button>

          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(r.id) }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white/70 hover:text-white hover:bg-black/90 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Not interested"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// Shelf from partner's rated entries
function PartnerShelf({
  entries,
  myTitleIds,
  dismissedIds,
  onSelect,
  onDismiss,
}: {
  entries: WatchlistEntryWithTitle[]
  myTitleIds: Set<string>
  dismissedIds?: Set<number>
  onSelect: (r: TMDBSearchResult) => void
  onDismiss?: (tmdbId: number) => void
}) {
  const visible = entries.filter(
    (e) => !myTitleIds.has(e.title_id) && !(dismissedIds?.has(e.title.tmdb_id))
  )
  if (visible.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {visible.map((e) => {
        const fakeResult: TMDBSearchResult = {
          id: e.title.tmdb_id,
          media_type: e.title.type === 'movie' ? 'movie' : 'tv',
          title: e.title.type === 'movie' ? e.title.title : undefined,
          name:  e.title.type === 'show'  ? e.title.title : undefined,
          overview: e.title.overview ?? '',
          poster_path: e.title.poster_path,
          backdrop_path: e.title.backdrop_path,
          release_date: e.title.release_date ?? undefined,
          genre_ids: [],
          vote_average: e.title.tmdb_rating ?? 0,
        }
        return (
          <div key={e.id} className="flex-shrink-0 w-[88px] relative group">
            <button
              onClick={() => onSelect(fakeResult)}
              className="w-full text-left cursor-pointer"
            >
              {e.title.poster_path ? (
                <img
                  src={thumbnailUrl(e.title.poster_path)}
                  alt=""
                  className="w-full aspect-[2/3] object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-white/10 rounded-lg flex items-center justify-center text-white/20 text-xl">?</div>
              )}
              <p className="text-[11px] text-white mt-1 line-clamp-2 leading-tight">{e.title.title}</p>
              {(e.title.tmdb_rating ?? 0) > 0 && (
                <p className="text-[10px] text-yellow-400">★ {e.title.tmdb_rating!.toFixed(1)}</p>
              )}
            </button>

            {onDismiss && (
              <button
                onClick={(ev) => { ev.stopPropagation(); onDismiss(e.title.tmdb_id) }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white/70 hover:text-white hover:bg-black/90 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Not interested"
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------
// Full personal recommendations panel (For You + From Partner)
// ---------------------------------------------------------------
interface PersonalRecsPanelProps {
  personalRecs: TMDBSearchResult[]
  personalLoading: boolean
  partnerRecs: PartnerRec[]
  myEntries: WatchlistEntryWithTitle[]
  recsEnabled: boolean
  dismissedIds?: Set<number>
  onToggleEnabled: (v: boolean) => void
  onSelect: (r: TMDBSearchResult) => void
  onDismiss?: (tmdbId: number) => void
}

export function PersonalRecsPanel({
  personalRecs,
  personalLoading,
  partnerRecs,
  myEntries,
  recsEnabled,
  dismissedIds,
  onToggleEnabled,
  onSelect,
  onDismiss,
}: PersonalRecsPanelProps) {
  const [open, setOpen] = useState(true)
  const myTitleIds = new Set(myEntries.map((e) => e.title_id))
  const hasPartnerRecs = partnerRecs.some((p) => p.entries.some((e) => !myTitleIds.has(e.title_id)))
  const hasAnyRecs = personalRecs.length > 0 || hasPartnerRecs

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Recommended for you</span>
          {!recsEnabled && (
            <span className="text-[10px] text-[var(--text-secondary)] border border-white/10 rounded-full px-1.5 py-0.5">off</span>
          )}
          {recsEnabled && personalLoading && (
            <span className="text-[10px] text-[var(--text-secondary)]">Loading…</span>
          )}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
          <label className="flex items-center gap-2 pt-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recsEnabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="rounded border border-white/20 bg-white/5 accent-[var(--accent)] cursor-pointer"
            />
            <span className="text-xs text-[var(--text-secondary)]">Enable automated recommendations</span>
          </label>

          {recsEnabled && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">For you</p>
                <RecShelf
                  recs={personalRecs}
                  loading={personalLoading}
                  emptyText="Rate some titles (👍 or higher) to get personalised suggestions."
                  dismissedIds={dismissedIds}
                  onSelect={onSelect}
                  onDismiss={onDismiss}
                />
              </div>

              {hasPartnerRecs && partnerRecs.map((p) => {
                const visible = p.entries.filter((e) => !myTitleIds.has(e.title_id))
                if (visible.length === 0) return null
                return (
                  <div key={p.partnerId} className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Liked by {p.partnerName}
                    </p>
                    <PartnerShelf
                      entries={p.entries}
                      myTitleIds={myTitleIds}
                      dismissedIds={dismissedIds}
                      onSelect={onSelect}
                      onDismiss={onDismiss}
                    />
                  </div>
                )
              })}

              {!personalLoading && !hasAnyRecs && (
                <p className="text-xs text-[var(--text-secondary)] py-1">
                  Rate titles as 👍 or higher to start seeing recommendations.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Group recommendations panel (for shared queue)
// ---------------------------------------------------------------
interface GroupRecsPanelProps {
  recs: TMDBSearchResult[]
  loading: boolean
  queueName?: string
  dismissedIds?: Set<number>
  onSelect: (r: TMDBSearchResult) => void
  onDismiss?: (tmdbId: number) => void
}

export function GroupRecsPanel({ recs, loading, queueName, dismissedIds, onSelect, onDismiss }: GroupRecsPanelProps) {
  const [open, setOpen] = useState(true)

  const visible = dismissedIds ? recs.filter((r) => !dismissedIds.has(r.id)) : recs

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Suggested for {queueName ?? 'the queue'}</span>
          {loading && <span className="text-[10px] text-[var(--text-secondary)]">Loading…</span>}
          {!loading && visible.length > 0 && (
            <span className="text-[10px] text-[var(--accent)] border border-[var(--accent)]/30 rounded-full px-1.5 py-0.5">
              {visible.length}
            </span>
          )}
          {!loading && visible.length === 0 && (
            <span className="text-[10px] text-[var(--text-secondary)]">Rate titles in this queue to unlock</span>
          )}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          <RecShelf
            recs={recs}
            loading={loading}
            emptyText="Rate titles in this queue to get group suggestions."
            dismissedIds={dismissedIds}
            onSelect={onSelect}
            onDismiss={onDismiss}
          />
        </div>
      )}
    </div>
  )
}
