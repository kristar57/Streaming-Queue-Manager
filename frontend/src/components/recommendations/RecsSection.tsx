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
  onSelect,
}: {
  recs: TMDBSearchResult[]
  loading: boolean
  emptyText: string
  onSelect: (r: TMDBSearchResult) => void
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

  if (recs.length === 0) {
    return <p className="text-xs text-[var(--text-secondary)] py-2 px-1">{emptyText}</p>
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {recs.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className="flex-shrink-0 w-[88px] text-left group cursor-pointer"
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
      ))}
    </div>
  )
}

// Shelf from partner's rated entries (no TMDB call needed)
function PartnerShelf({
  entries,
  myTitleIds,
  onSelect,
}: {
  entries: WatchlistEntryWithTitle[]
  myTitleIds: Set<string>
  onSelect: (r: TMDBSearchResult) => void
}) {
  const visible = entries.filter((e) => !myTitleIds.has(e.title_id))
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
          <button
            key={e.id}
            onClick={() => onSelect(fakeResult)}
            className="flex-shrink-0 w-[88px] text-left group cursor-pointer"
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
            {e.user_rating === 2 && (
              <p className="text-[10px] text-yellow-400">Loved</p>
            )}
          </button>
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
  onToggleEnabled: (v: boolean) => void
  onSelect: (r: TMDBSearchResult) => void
}

export function PersonalRecsPanel({
  personalRecs,
  personalLoading,
  partnerRecs,
  myEntries,
  recsEnabled,
  onToggleEnabled,
  onSelect,
}: PersonalRecsPanelProps) {
  const [open, setOpen] = useState(false)
  const myTitleIds = new Set(myEntries.map((e) => e.title_id))
  const hasPartnerRecs = partnerRecs.some((p) => p.entries.some((e) => !myTitleIds.has(e.title_id)))
  const hasAnyRecs = personalRecs.length > 0 || hasPartnerRecs

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
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
          {/* Opt-in toggle */}
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
              {/* For You */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">For you</p>
                <RecShelf
                  recs={personalRecs}
                  loading={personalLoading}
                  emptyText="Rate some titles (Good or Loved) to get personalised suggestions."
                  onSelect={onSelect}
                />
              </div>

              {/* From partners */}
              {hasPartnerRecs && partnerRecs.map((p) => {
                const visible = p.entries.filter((e) => !myTitleIds.has(e.title_id))
                if (visible.length === 0) return null
                return (
                  <div key={p.partnerId} className="space-y-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Liked by {p.partnerName}
                    </p>
                    <PartnerShelf entries={p.entries} myTitleIds={myTitleIds} onSelect={onSelect} />
                  </div>
                )
              })}

              {!personalLoading && !hasAnyRecs && (
                <p className="text-xs text-[var(--text-secondary)] py-1">
                  Rate titles as Good or Loved to start seeing recommendations.
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
// Group recommendations panel (for shared queue view)
// ---------------------------------------------------------------
interface GroupRecsPanelProps {
  recs: TMDBSearchResult[]
  loading: boolean
  onSelect: (r: TMDBSearchResult) => void
}

export function GroupRecsPanel({ recs, loading, onSelect }: GroupRecsPanelProps) {
  const [open, setOpen] = useState(false)

  if (!loading && recs.length === 0) return null

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Suggested for the queue</span>
          {loading && <span className="text-[10px] text-[var(--text-secondary)]">Loading…</span>}
          {!loading && recs.length > 0 && (
            <span className="text-[10px] text-[var(--accent)] border border-[var(--accent)]/30 rounded-full px-1.5 py-0.5">{recs.length}</span>
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
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  )
}
