import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import { TitleSearch } from '../components/title/TitleSearch'
import { AddEntryForm } from '../components/title/AddEntryForm'
import { ListView } from '../components/watchlist/ListView'
import { CardView } from '../components/watchlist/CardView'
import { FilterBar } from '../components/watchlist/FilterBar'
import { Button } from '../components/ui/Button'
import type {
  TMDBSearchResult,
  EntryFormFields,
  WatchlistEntryWithTitle,
  FilterState,
  EntryStatus,
  SortField,
} from '../types'
import { DEFAULT_FILTER_STATE } from '../types'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const STATUS_GROUPS: { status: EntryStatus; label: string }[] = [
  { status: 'watching',      label: 'Currently watching' },
  { status: 'want_to_watch', label: 'Up next' },
  { status: 'watched',       label: 'Watched' },
]

function applyFilters(
  entries: WatchlistEntryWithTitle[],
  filter: FilterState
): WatchlistEntryWithTitle[] {
  return entries.filter((e) => {
    if (filter.search && !e.title.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    if (filter.statuses.length && !filter.statuses.includes(e.status)) return false
    if (filter.types.length && !filter.types.includes(e.title.type)) return false
    if (filter.priorities.length && !filter.priorities.includes(e.priority)) return false
    if (filter.genres.length && !filter.genres.some((g) => e.title.genres.includes(g))) return false
    return true
  })
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function applySorting(
  entries: WatchlistEntryWithTitle[],
  field: SortField,
  dir: 'asc' | 'desc'
): WatchlistEntryWithTitle[] {
  const sorted = [...entries].sort((a, b) => {
    let va: string | number = 0
    let vb: string | number = 0
    switch (field) {
      case 'title':       va = a.title.title.toLowerCase(); vb = b.title.title.toLowerCase(); break
      case 'tmdb_rating': va = a.title.tmdb_rating ?? 0;    vb = b.title.tmdb_rating ?? 0;    break
      case 'priority':    va = PRIORITY_ORDER[a.priority];  vb = PRIORITY_ORDER[b.priority];  break
      case 'created_at':  va = a.created_at;                vb = b.created_at;                break
      default:            va = a.updated_at;                vb = b.updated_at;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1  : -1
    return 0
  })
  return sorted
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function Home() {
  const { user, profile, signOut } = useAuth()
  const { entries, loading, error, addEntry, setStatus, cyclePriority, deleteEntry } = useWatchlist()

  const [pendingResult, setPendingResult] = useState<TMDBSearchResult | null>(null)
  const [pendingGenres, setPendingGenres] = useState<string[]>([])
  const [view, setView] = useState<'list' | 'card'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE)

  // Collect all unique genres present in the watchlist
  const availableGenres = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) e.title.genres.forEach((g) => set.add(g))
    return [...set].sort()
  }, [entries])

  // Filter + sort
  const filtered = useMemo(
    () => applySorting(applyFilters(entries, filter), filter.sortField, filter.sortDir),
    [entries, filter]
  )

  // Group by status
  const groups = STATUS_GROUPS.map(({ status, label }) => ({
    label,
    entries: filtered.filter((e) => e.status === status),
  }))

  const hasActiveFilter =
    filter.search || filter.statuses.length || filter.types.length ||
    filter.genres.length || filter.priorities.length

  async function handleAddEntry(fields: EntryFormFields) {
    if (!pendingResult || !user) return
    await addEntry(pendingResult, pendingGenres, fields, user.id)
    setPendingResult(null)
    setPendingGenres([])
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight flex-shrink-0">
            Que<span className="text-[var(--accent)]">Share</span>
          </h1>
          <span className="text-[var(--text-secondary)] text-sm hidden sm:block">
            {profile?.display_name}
          </span>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setView('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${view === 'list' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            >
              ☰ List
            </button>
            <button
              onClick={() => setView('card')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${view === 'card' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            >
              ⊞ Cards
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Search bar */}
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <TitleSearch
              onSelect={(result, genres) => {
                setPendingResult(result)
                setPendingGenres(genres)
              }}
            />
          </div>
          <Button
            variant={showFilters || hasActiveFilter ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setShowFilters((v) => !v)}
          >
            {hasActiveFilter ? '● ' : ''}Filters
          </Button>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl px-4 pt-4">
            <FilterBar
              filter={filter}
              availableGenres={availableGenres}
              onChange={setFilter}
            />
          </div>
        )}

        {/* Watchlist */}
        {loading ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">Loading…</div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            {entries.length === 0
              ? 'Your watchlist is empty. Search for a movie or show above to add one.'
              : 'No entries match the current filters.'}
          </div>
        ) : view === 'list' ? (
          <ListView
            groups={groups}
            onStatusChange={setStatus}
            onPriorityCycle={cyclePriority}
            onDelete={deleteEntry}
          />
        ) : (
          <CardView
            groups={groups}
            onStatusChange={setStatus}
            onPriorityCycle={cyclePriority}
            onDelete={deleteEntry}
          />
        )}
      </main>

      {/* Add entry modal */}
      {pendingResult && (
        <AddEntryForm
          result={pendingResult}
          genres={pendingGenres}
          onSubmit={handleAddEntry}
          onCancel={() => { setPendingResult(null); setPendingGenres([]) }}
        />
      )}
    </div>
  )
}
