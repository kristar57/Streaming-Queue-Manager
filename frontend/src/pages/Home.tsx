import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { useSharedQueues, useQueueDetail } from '../hooks/useSharedQueues'
import { TitleSearch } from '../components/title/TitleSearch'
import { AddEntryForm } from '../components/title/AddEntryForm'
import { EditEntryForm } from '../components/title/EditEntryForm'
import { ListView } from '../components/watchlist/ListView'
import { CardView } from '../components/watchlist/CardView'
import { FilterBar } from '../components/watchlist/FilterBar'
import { RecommendationsPanel, SendRecModal } from '../components/watchlist/RecommendationsPanel'
import { QueueSwitcher } from '../components/queue/QueueSwitcher'
import { CreateQueueModal } from '../components/queue/CreateQueueModal'
import { SharedQueueView } from '../components/queue/SharedQueueView'
import { AddToQueueModal } from '../components/queue/AddToQueueModal'
import { QueueSettingsModal } from '../components/queue/QueueSettingsModal'
import { Button } from '../components/ui/Button'
import { StreamingServicesModal } from '../components/ui/StreamingServicesModal'
import { supabase } from '../lib/supabase'
import { upsertTitle, cacheAvailability } from '../hooks/useWatchlist'
import { Link } from 'react-router-dom'
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
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

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
    if (filter.viewerIds.length && !filter.viewerIds.includes(e.user_id)) return false
    return true
  })
}

function applySorting(
  entries: WatchlistEntryWithTitle[],
  field: SortField,
  dir: 'asc' | 'desc'
): WatchlistEntryWithTitle[] {
  return [...entries].sort((a, b) => {
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
}

function sortUpNext(entries: WatchlistEntryWithTitle[]): WatchlistEntryWithTitle[] {
  const active   = entries.filter((e) => !e.is_caught_up)
  const caughtUp = entries.filter((e) => e.is_caught_up)
  const byPos = (a: WatchlistEntryWithTitle, b: WatchlistEntryWithTitle) => {
    if (a.queue_position === null && b.queue_position === null) return 0
    if (a.queue_position === null) return 1
    if (b.queue_position === null) return -1
    return a.queue_position - b.queue_position
  }
  return [...active.sort(byPos), ...caughtUp.sort(byPos)]
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function Home() {
  const { user, profile, signOut } = useAuth()
  const { entries, availability, loading, error, addEntry, updateEntry, setStatus, toggleCaughtUp, cyclePriority, deleteEntry, reorderEntry } = useWatchlist(user?.id)
  const { subscriptions, subscribedIds, toggleSubscription } = useSubscriptions(user?.id)
  const { queues } = useSharedQueues(user?.id)

  // Active queue: null = personal list, string = shared queue id
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null)

  const { titles: queueTitles, loading: queueLoading, approveTitle, rejectTitle, removeTitle, reorderTitle } = useQueueDetail(activeQueueId)

  const [queueSearchBusy, setQueueSearchBusy] = useState(false)
  const [addAsProposal, setAddAsProposal] = useState(false)

  const [pendingResult, setPendingResult] = useState<TMDBSearchResult | null>(null)
  const [pendingGenres, setPendingGenres] = useState<string[]>([])
  const [editingEntry, setEditingEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [recommendEntry, setRecommendEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [addToQueueEntry, setAddToQueueEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [showCreateQueue, setShowCreateQueue] = useState(false)
  const [showQueueSettings, setShowQueueSettings] = useState(false)
  const [view, setView] = useState<'list' | 'card'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [showRecs, setShowRecs] = useState(false)
  const [showServices, setShowServices] = useState(false)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [recCount, setRecCount] = useState(0)

  useMemo(() => {
    if (!user) return
    supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .then(({ count }) => setRecCount(count ?? 0))
  }, [user])

  const availableViewers = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      if (e.profile) map.set(e.profile.id, e.profile.display_name)
    }
    return [...map.entries()].map(([id, display_name]) => ({ id, display_name }))
  }, [entries])

  const availableGenres = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) e.title.genres.forEach((g) => set.add(g))
    return [...set].sort()
  }, [entries])

  const filtered = useMemo(
    () => applySorting(applyFilters(entries, filter), filter.sortField, filter.sortDir),
    [entries, filter]
  )

  const groups = useMemo(() => [
    {
      label: 'Currently watching',
      entries: filtered.filter((e) => e.status === 'watching' && !e.is_caught_up),
      isUpNext: false,
    },
    {
      label: 'Up next',
      entries: sortUpNext(filtered.filter((e) => e.status === 'want_to_watch' || (e.status === 'watching' && e.is_caught_up))),
      isUpNext: true,
    },
    {
      label: 'Anticipated',
      entries: filtered.filter((e) => e.status === 'anticipated'),
      isUpNext: false,
    },
    {
      label: 'Watched',
      entries: filtered.filter((e) => e.status === 'watched'),
      isUpNext: false,
    },
  ], [filtered])

  const hasActiveFilter =
    filter.search || filter.statuses.length || filter.types.length ||
    filter.genres.length || filter.priorities.length || filter.viewerIds.length

  async function handleAddEntry(fields: EntryFormFields) {
    if (!pendingResult || !user) return
    await addEntry(pendingResult, pendingGenres, fields, user.id)
    // If we're in a shared queue, also add the new title to it
    if (activeQueueId) {
      // The entry will be created by addEntry; we need the title_id
      // We'll handle this via the AddToQueueModal flow instead
    }
    setPendingResult(null)
    setPendingGenres([])
  }

  async function handleEditSave(fields: {
    status: EntryStatus
    priority: string
    notes: string
    is_caught_up: boolean
    current_season: number | null
    current_episode: number | null
  }) {
    if (!editingEntry) return
    const patch: Record<string, unknown> = { ...fields }
    if (fields.status === 'watching' && editingEntry.status !== 'watching') {
      patch.date_started = new Date().toISOString()
    }
    if (fields.status === 'watched' && editingEntry.status !== 'watched') {
      patch.date_completed = new Date().toISOString()
    }
    await updateEntry(editingEntry.id, patch as never)
    setEditingEntry(null)
  }

  const activeQueue = queues.find((q) => q.id === activeQueueId) ?? null

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

          {/* Admin link — visible to admins only */}
          {profile?.is_admin && (
            <Link
              to="/admin"
              className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-2 py-1 rounded border border-white/10 hidden sm:block"
            >
              Admin
            </Link>
          )}

          {/* Streaming services */}
          <button
            onClick={() => setShowServices(true)}
            className={`relative px-2.5 py-1.5 rounded-lg text-sm hover:text-white hover:bg-white/5 transition-colors cursor-pointer ${subscribedIds.size > 0 ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}
            title="My streaming services"
          >
            📺
            {subscribedIds.size > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                {subscribedIds.size}
              </span>
            )}
          </button>

          {/* Recommendations bell */}
          <button
            onClick={() => setShowRecs((v) => !v)}
            className="relative px-2.5 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Recommendations"
          >
            🔔
            {recCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center">
                {recCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 flex-shrink-0">
            <button
              onClick={() => setView('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${view === 'list' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            >
              ☰
            </button>
            <button
              onClick={() => setView('card')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${view === 'card' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
            >
              ⊞
            </button>
          </div>

          <button
            onClick={signOut}
            className="flex-shrink-0 text-[var(--text-secondary)] hover:text-white text-xs transition-colors cursor-pointer px-1"
            title="Sign out"
          >
            <span className="hidden sm:inline">Sign out</span>
            <span className="sm:hidden">↪</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Queue switcher */}
        <QueueSwitcher
          queues={queues}
          activeQueueId={activeQueueId}
          onChange={(id) => { setActiveQueueId(id); setShowFilters(false) }}
          onCreateNew={() => setShowCreateQueue(true)}
        />

        {/* Shared queue header + search */}
        {activeQueue && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">{activeQueue.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {queueTitles.length} title{queueTitles.length !== 1 ? 's' : ''} · shared queue
                </p>
              </div>
              <button
                onClick={() => setShowQueueSettings(true)}
                className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer"
              >
                ⚙ Members
              </button>
            </div>

            {/* Direct search — add or propose a title in this shared queue */}
            <TitleSearch
              placeholder="Search to add a title to this queue…"
              onSelect={async (result, genres) => {
                if (!user || queueSearchBusy) return
                setQueueSearchBusy(true)
                try {
                  const titleId = await upsertTitle(result, genres)
                  cacheAvailability(titleId, result.id, result.media_type === 'movie' ? 'movie' : 'tv')
                  const { error } = await supabase.from('queue_titles').insert({
                    queue_id: activeQueueId,
                    title_id: titleId,
                    added_by: user.id,
                    status: addAsProposal ? 'proposed' : 'active',
                  })
                  if (error && error.code !== '23505') throw error
                } finally {
                  setQueueSearchBusy(false)
                }
              }}
            />
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={addAsProposal}
                onChange={(e) => setAddAsProposal(e.target.checked)}
                className="rounded border border-white/20 bg-white/5 accent-[var(--accent)] cursor-pointer"
              />
              Propose for approval (other members can approve or reject)
            </label>
            {queueSearchBusy && (
              <p className="text-xs text-[var(--text-secondary)] px-1">Adding…</p>
            )}
          </div>
        )}

        {/* Recommendations panel */}
        {showRecs && user && (
          <RecommendationsPanel
            currentUserId={user.id}
            onClose={() => { setShowRecs(false); setRecCount(0) }}
          />
        )}

        {/* Search + filters (personal list only) */}
        {activeQueueId === null && (
          <>
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
                {hasActiveFilter ? '●' : ''} Filters
              </Button>
            </div>

            {showFilters && (
              <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl px-4 pt-4">
                <FilterBar
                  filter={filter}
                  availableGenres={availableGenres}
                  availableViewers={availableViewers}
                  onChange={setFilter}
                />
              </div>
            )}
          </>
        )}

        {/* Main content */}
        {activeQueueId !== null ? (
          // Shared queue view
          queueLoading ? (
            <div className="text-center py-16 text-[var(--text-secondary)]">Loading…</div>
          ) : (
            <SharedQueueView
              titles={queueTitles}
              availability={availability}
              currentUserId={user?.id ?? ''}
              onReorder={reorderTitle}
              onApprove={approveTitle}
              onReject={rejectTitle}
              onRemove={removeTitle}
              onMyStatusChange={setStatus}
            />
          )
        ) : (
          // Personal list view
          loading ? (
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
              availability={availability}
              subscribedIds={subscribedIds}
              onStatusChange={setStatus}
              onPriorityCycle={cyclePriority}
              onCaughtUpToggle={toggleCaughtUp}
              onEdit={setEditingEntry}
              onReorder={reorderEntry}
              onRecommend={setRecommendEntry}
              onAddToQueue={queues.length > 0 ? setAddToQueueEntry : undefined}
              onDelete={deleteEntry}
            />
          ) : (
            <CardView
              groups={groups}
              availability={availability}
              subscribedIds={subscribedIds}
              onStatusChange={setStatus}
              onPriorityCycle={cyclePriority}
              onCaughtUpToggle={toggleCaughtUp}
              onEdit={setEditingEntry}
              onReorder={reorderEntry}
              onRecommend={setRecommendEntry}
              onAddToQueue={queues.length > 0 ? setAddToQueueEntry : undefined}
              onDelete={deleteEntry}
            />
          )
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

      {/* Edit entry modal */}
      {editingEntry && (
        <EditEntryForm
          entry={editingEntry}
          onSubmit={handleEditSave}
          onCancel={() => setEditingEntry(null)}
        />
      )}

      {/* Send recommendation modal */}
      {recommendEntry && user && (
        <SendRecModal
          entry={recommendEntry}
          currentUserId={user.id}
          onClose={() => setRecommendEntry(null)}
        />
      )}

      {/* Add to queue modal */}
      {addToQueueEntry && user && (
        <AddToQueueModal
          entry={addToQueueEntry}
          queues={queues}
          onAdd={async (queueId) => {
            const { error } = await supabase.from('queue_titles').insert({
              queue_id: queueId,
              title_id: addToQueueEntry.title_id,
              added_by: user.id,
            })
            if (error && error.code !== '23505') throw error
          }}
          onClose={() => setAddToQueueEntry(null)}
        />
      )}

      {/* Create queue modal */}
      {showCreateQueue && user && (
        <CreateQueueModal
          currentUserId={user.id}
          onCreated={(id) => { setShowCreateQueue(false); setActiveQueueId(id) }}
          onCancel={() => setShowCreateQueue(false)}
        />
      )}

      {/* Streaming services modal */}
      {showServices && (
        <StreamingServicesModal
          subscriptions={subscriptions}
          subscribedIds={subscribedIds}
          onToggle={toggleSubscription}
          onClose={() => setShowServices(false)}
        />
      )}

      {/* Queue settings modal */}
      {showQueueSettings && activeQueue && user && (
        <QueueSettingsModal
          queue={activeQueue}
          currentUserId={user.id}
          onClose={() => setShowQueueSettings(false)}
          onDeleted={() => { setShowQueueSettings(false); setActiveQueueId(null) }}
        />
      )}
    </div>
  )
}
