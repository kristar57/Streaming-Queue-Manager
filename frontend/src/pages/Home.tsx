import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { useSharedQueues, useQueueDetail, useTitleQueueMap } from '../hooks/useSharedQueues'
import { usePersonalRecs, usePartnerRecs, useGroupRecs } from '../hooks/useAutoRecs'
import { PersonalRecsPanel, GroupRecsPanel } from '../components/recommendations/RecsSection'
import { TitleSearch } from '../components/title/TitleSearch'
import { AddEntryForm } from '../components/title/AddEntryForm'
import { EditEntryForm } from '../components/title/EditEntryForm'
import { ListView } from '../components/watchlist/ListView'
import { CardView } from '../components/watchlist/CardView'
import { QueueView } from '../components/watchlist/QueueView'
import { FilterBar } from '../components/watchlist/FilterBar'
import { RecommendationsPanel, SendRecModal } from '../components/watchlist/RecommendationsPanel'
import { QueueSwitcher } from '../components/queue/QueueSwitcher'
import { CreateQueueModal } from '../components/queue/CreateQueueModal'
import { SharedQueueView } from '../components/queue/SharedQueueView'
import { AddToQueueModal } from '../components/queue/AddToQueueModal'
import { QueueSettingsModal } from '../components/queue/QueueSettingsModal'
import { Button } from '../components/ui/Button'
import { StreamingServicesModal } from '../components/ui/StreamingServicesModal'
import { InviteModal } from '../components/ui/InviteModal'
import { TitleDetailModal } from '../components/title/TitleDetailModal'
import { AppShell } from '../components/layout/AppShell'
import { useRecDismissals } from '../hooks/useRecDismissals'
import type { NavPage } from '../components/layout/AppShell'
import { supabase } from '../lib/supabase'
import { upsertTitle, cacheAvailability } from '../hooks/useWatchlist'
import { Link } from 'react-router-dom'
import { PolicyFooter } from '../components/ui/PolicyFooter'
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
  const { entries, availability, loading, error, addEntry, updateEntry, setStatus, toggleCaughtUp, cyclePriority, rateEntry, deleteEntry, reorderEntry, reorderEntriesToPositions, syncAllAvailability } = useWatchlist(user?.id)
  const { subscriptions, subscribedIds, toggleSubscription } = useSubscriptions(user?.id)
  const { queues } = useSharedQueues(user?.id)
  const { map: titleQueueMap, refresh: refreshTitleQueueMap } = useTitleQueueMap(user?.id, queues)

  const [recsEnabled, setRecsEnabled] = useState<boolean>(() => profile?.enable_recommendations ?? true)

  const allPartners = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of entries) {
      if (e.profile && e.user_id !== user?.id) map.set(e.user_id, e.profile.display_name)
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [entries, user?.id])

  const { recs: personalRecs, loading: personalRecsLoading } = usePersonalRecs(user?.id, entries, recsEnabled)
  const partnerRecs = usePartnerRecs(user?.id, entries, allPartners, recsEnabled)

  async function handleToggleRecs(enabled: boolean) {
    setRecsEnabled(enabled)
    if (user) {
      await supabase.from('profiles').update({ enable_recommendations: enabled }).eq('id', user.id)
    }
  }

  // Active shared queue (null = personal / Up Next)
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null)
  const { titles: queueTitles, loading: queueLoading, approveTitle, shelfTitle, removeTitle, reorderTitle, refresh: refreshQueueDetail } = useQueueDetail(activeQueueId)
  const { recs: groupRecs, loading: groupRecsLoading } = useGroupRecs(activeQueueId, queueTitles, recsEnabled)
  const { dismissedIds, dismiss: dismissRec } = useRecDismissals(user?.id)

  const [queueSearchBusy, setQueueSearchBusy] = useState(false)
  const [pendingQueueResult, setPendingQueueResult] = useState<{ result: TMDBSearchResult; genres: string[] } | null>(null)

  // Navigation
  const [activePage, setActivePage] = useState<NavPage>('list')
  // Sub-view within My List page
  const [listView, setListView] = useState<'list' | 'queue' | 'card'>('list')

  // Modals
  const [pendingResult, setPendingResult] = useState<TMDBSearchResult | null>(null)
  const [pendingGenres, setPendingGenres] = useState<string[]>([])
  const [editingEntry, setEditingEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [recommendEntry, setRecommendEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [addToQueueEntry, setAddToQueueEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [showCreateQueue, setShowCreateQueue] = useState(false)
  const [showQueueSettings, setShowQueueSettings] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showServices, setShowServices] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [detailEntry, setDetailEntry] = useState<WatchlistEntryWithTitle | null>(null)
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE)
  const [recCount, setRecCount] = useState(0)

  // Clear badge when Activity page is opened
  useEffect(() => {
    if (activePage === 'activity') setRecCount(0)
  }, [activePage])

  // Auto-select the first shared queue when none is selected
  useEffect(() => {
    if (activeQueueId === null && queues.length > 0) {
      setActiveQueueId(queues[0].id)
    }
  }, [queues])

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
      if (e.profile && e.profile.id !== user?.id) map.set(e.profile.id, e.profile.display_name)
    }
    return [...map.entries()].map(([id, display_name]) => ({ id, display_name }))
  }, [entries, user?.id])

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
      entries: filter.sortField === 'updated_at'
        ? sortUpNext(filtered.filter((e) => e.status === 'want_to_watch' || (e.status === 'watching' && e.is_caught_up)))
        : filtered.filter((e) => e.status === 'want_to_watch' || (e.status === 'watching' && e.is_caught_up)),
      isUpNext: filter.sortField === 'updated_at',
    },
    {
      label: 'Upcoming',
      entries: filtered.filter((e) => e.status === 'upcoming'),
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

  async function handleRateEntry(entry: WatchlistEntryWithTitle, rating: -1 | 1 | 2 | 3 | null) {
    if (!user) return
    await rateEntry(entry.id, rating, user.id)
  }

  async function rateQueueTitle(titleId: string, rating: -1 | 1 | 2 | 3 | null) {
    if (!user || !activeQueueId) return
    if (rating === null) {
      await supabase
        .from('queue_title_ratings')
        .delete()
        .eq('queue_id', activeQueueId)
        .eq('title_id', titleId)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('queue_title_ratings')
        .upsert(
          { queue_id: activeQueueId, title_id: titleId, user_id: user.id, rating },
          { onConflict: 'queue_id,title_id,user_id' }
        )
    }
    await refreshQueueDetail()
  }

  async function handleAddEntry(fields: EntryFormFields) {
    if (!pendingResult || !user) return
    await addEntry(pendingResult, pendingGenres, fields, user.id)
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
    if (activeQueueId) await refreshQueueDetail()
  }

  const activeQueue = queues.find((q) => q.id === activeQueueId) ?? null

  // Queue chip shown in mobile header when there's an active shared queue
  const queueChip = activeQueue ? (
    <button
      onClick={() => setActivePage('queue')}
      className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer max-w-[140px] overflow-hidden"
    >
      <span className="truncate">{activeQueue.name}</span>
      <span className="text-[9px] flex-shrink-0">▾</span>
    </button>
  ) : undefined

  // ── Page: My List ─────────────────────────────────────────────
  function renderList() {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
        {/* Row 1: Search (full width) */}
        <TitleSearch
          onSelect={(result, genres) => {
            setPendingResult(result)
            setPendingGenres(genres)
          }}
        />

        {/* Row 2: Sort + filters + view toggle */}
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 flex-shrink-0">
            <select
              value={filter.sortField}
              onChange={(e) => setFilter({ ...filter, sortField: e.target.value as SortField })}
              className="bg-[var(--bg-card)] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="updated_at">Recent</option>
              <option value="created_at">Added</option>
              <option value="title">A–Z</option>
              <option value="tmdb_rating">Rating</option>
              <option value="priority">Priority</option>
            </select>
            <button
              type="button"
              onClick={() => setFilter({ ...filter, sortDir: filter.sortDir === 'asc' ? 'desc' : 'asc' })}
              className="px-2 py-2 bg-[var(--bg-card)] border border-white/10 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              title="Toggle sort direction"
            >
              {filter.sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <Button
            variant={showFilters || hasActiveFilter ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setShowFilters((v) => !v)}
          >
            {hasActiveFilter ? '● ' : ''}Filters
          </Button>

          <div className="flex-1" />

          {/* List / Up Next / Card sub-toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 flex-shrink-0">
            <button
              onClick={() => setListView('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${listView === 'list' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="List view"
            >☰</button>
            <button
              onClick={() => setListView('queue')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${listView === 'queue' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Up Next"
            >▤</button>
            <button
              onClick={() => setListView('card')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${listView === 'card' ? 'bg-white/15 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Card view"
            >⊞</button>
          </div>
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
        ) : listView === 'queue' ? (
          <QueueView
            entries={entries.filter((e) => e.status === 'want_to_watch' || (e.status === 'watching' && e.is_caught_up))}
            currentUserId={user?.id}
            onReorderToPositions={reorderEntriesToPositions}
            onStatusChange={setStatus}
            onEdit={setEditingEntry}
            onRate={handleRateEntry}
            onDelete={deleteEntry}
            onViewDetail={setDetailEntry}
          />
        ) : listView === 'list' ? (
          <ListView
            groups={groups}
            availability={availability}
            subscribedIds={subscribedIds}
            titleQueueMap={titleQueueMap}
            currentUserId={user?.id}
            onStatusChange={setStatus}
            onPriorityCycle={cyclePriority}
            onCaughtUpToggle={toggleCaughtUp}
            onEdit={setEditingEntry}
            onReorder={reorderEntry}
            onRecommend={setRecommendEntry}
            onAddToQueue={queues.length > 0 ? setAddToQueueEntry : undefined}
            onRate={handleRateEntry}
            onDelete={deleteEntry}
            onViewDetail={setDetailEntry}
          />
        ) : (
          <CardView
            groups={groups}
            availability={availability}
            subscribedIds={subscribedIds}
            titleQueueMap={titleQueueMap}
            currentUserId={user?.id}
            onStatusChange={setStatus}
            onPriorityCycle={cyclePriority}
            onCaughtUpToggle={toggleCaughtUp}
            onEdit={setEditingEntry}
            onReorder={reorderEntry}
            onRecommend={setRecommendEntry}
            onAddToQueue={queues.length > 0 ? setAddToQueueEntry : undefined}
            onRate={handleRateEntry}
            onDelete={deleteEntry}
            onViewDetail={setDetailEntry}
          />
        )}
      </div>
    )
  }

  // ── Page: Queues (shared queues only) ────────────────────────
  function renderQueue() {
    if (queues.length === 0) {
      return (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
          <div className="text-center py-16 text-[var(--text-secondary)] space-y-3">
            <p>You don't have any shared queues yet.</p>
            <button
              onClick={() => setShowCreateQueue(true)}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
            >
              + Create a shared queue
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
        {activeQueue && (
          <>
            {queues.length > 1 ? (
              // Multiple queues: switcher + actions on one row
              <div className="flex items-center gap-2">
                <QueueSwitcher
                  queues={queues}
                  activeQueueId={activeQueueId}
                  onChange={(id) => setActiveQueueId(id)}
                  onCreateNew={() => setShowCreateQueue(true)}
                  showPersonal={false}
                  showNewButton={false}
                />
                <div className="flex-1" />
                <button
                  onClick={() => setShowCreateQueue(true)}
                  className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors border border-white/10 border-dashed rounded-lg px-3 py-1.5 cursor-pointer flex-shrink-0"
                >
                  + New queue
                </button>
                <button
                  onClick={() => setShowQueueSettings(true)}
                  className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer flex-shrink-0"
                >
                  ⚙ Members
                </button>
              </div>
            ) : (
              // Single queue: name + subtitle + actions
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">{activeQueue.name}</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {queueTitles.length} title{queueTitles.length !== 1 ? 's' : ''} · shared queue
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateQueue(true)}
                    className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors border border-white/10 border-dashed rounded-lg px-3 py-1.5 cursor-pointer"
                  >
                    + New queue
                  </button>
                  <button
                    onClick={() => setShowQueueSettings(true)}
                    className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer"
                  >
                    ⚙ Members
                  </button>
                </div>
              </div>
            )}

            {pendingQueueResult ? (
              // Confirm panel — choose how to add
              <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  {pendingQueueResult.result.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${pendingQueueResult.result.poster_path}`}
                      alt=""
                      className="w-9 h-[54px] object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {pendingQueueResult.result.title ?? pendingQueueResult.result.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">How would you like to add this?</p>
                  </div>
                  <button
                    onClick={() => setPendingQueueResult(null)}
                    className="text-[var(--text-secondary)] hover:text-white transition-colors text-lg leading-none cursor-pointer flex-shrink-0"
                  >×</button>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={queueSearchBusy}
                    onClick={async () => {
                      if (!user || !activeQueueId) return
                      setQueueSearchBusy(true)
                      try {
                        const { result, genres } = pendingQueueResult
                        const titleId = await upsertTitle(result, genres)
                        cacheAvailability(titleId, result.id, result.media_type === 'movie' ? 'movie' : 'tv')
                        const { error } = await supabase.from('queue_titles').insert({
                          queue_id: activeQueueId, title_id: titleId, added_by: user.id, status: 'active',
                        })
                        if (error && error.code !== '23505') throw error
                        setPendingQueueResult(null)
                      } finally { setQueueSearchBusy(false) }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    + Add to queue
                  </button>
                  <button
                    disabled={queueSearchBusy}
                    onClick={async () => {
                      if (!user || !activeQueueId) return
                      setQueueSearchBusy(true)
                      try {
                        const { result, genres } = pendingQueueResult
                        const titleId = await upsertTitle(result, genres)
                        cacheAvailability(titleId, result.id, result.media_type === 'movie' ? 'movie' : 'tv')
                        const { error } = await supabase.from('queue_titles').insert({
                          queue_id: activeQueueId, title_id: titleId, added_by: user.id, status: 'proposed',
                        })
                        if (error && error.code !== '23505') throw error
                        setPendingQueueResult(null)
                      } finally { setQueueSearchBusy(false) }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Propose for approval
                  </button>
                </div>
              </div>
            ) : (
              <TitleSearch
                placeholder="Search to add a title to this queue…"
                onSelect={(result, genres) => setPendingQueueResult({ result, genres })}
              />
            )}

            {queueLoading ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">Loading…</div>
            ) : (
              <SharedQueueView
                titles={queueTitles}
                availability={availability}
                currentUserId={user?.id ?? ''}
                onReorder={reorderTitle}
                onApprove={approveTitle}
                onShelf={shelfTitle}
                onRemove={removeTitle}
                onMyStatusChange={setStatus}
                onEdit={setEditingEntry}
                onViewDetail={setDetailEntry}
                onQueueRate={rateQueueTitle}
              />
            )}
          </>
        )}
      </div>
    )
  }

  // ── Page: Browse ──────────────────────────────────────────────
  function renderBrowse() {
    async function addToQueue(result: TMDBSearchResult) {
      if (!user || !activeQueueId) return
      const titleId = await upsertTitle(result, [])
      cacheAvailability(titleId, result.id, result.media_type === 'movie' ? 'movie' : 'tv')
      const { error } = await supabase.from('queue_titles').insert({
        queue_id: activeQueueId,
        title_id: titleId,
        added_by: user.id,
        status: 'active',
      })
      if (error && error.code !== '23505') throw error
      await refreshQueueDetail()
    }

    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <PersonalRecsPanel
          personalRecs={personalRecs}
          personalLoading={personalRecsLoading}
          partnerRecs={partnerRecs}
          myEntries={entries}
          recsEnabled={recsEnabled}
          dismissedIds={dismissedIds}
          onToggleEnabled={handleToggleRecs}
          onSelect={(result) => {
            setPendingResult(result)
            setPendingGenres([])
          }}
          onDismiss={dismissRec}
        />
        {activeQueueId && (
          <div className="mt-4">
            <GroupRecsPanel
              recs={groupRecs}
              loading={groupRecsLoading}
              queueName={activeQueue?.name}
              dismissedIds={dismissedIds}
              onSelect={addToQueue}
              onDismiss={dismissRec}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Page: Activity ────────────────────────────────────────────
  function renderActivity() {
    if (!user) return null
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <RecommendationsPanel
          currentUserId={user.id}
          onClose={() => setActivePage('list')}
        />
      </div>
    )
  }

  // ── Page: Settings ────────────────────────────────────────────
  function renderSettings() {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">Settings</h2>

        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10">
          {/* Streaming Services */}
          <button
            onClick={() => setShowServices(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <span className="text-base">📺</span>
            <div>
              <div className="font-medium">Streaming Services</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                {subscriptions.length > 0 ? `${subscriptions.length} service${subscriptions.length !== 1 ? 's' : ''} configured` : 'No services added yet'}
              </div>
            </div>
            <span className="ml-auto text-[var(--text-secondary)] text-xs">›</span>
          </button>

          {/* Invite */}
          {(profile?.is_admin || profile?.can_invite) && (
            <button
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <span className="text-base">✉</span>
              <div>
                <div className="font-medium">Invite Someone</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Send an invite link to join QueShare</div>
              </div>
              <span className="ml-auto text-[var(--text-secondary)] text-xs">›</span>
            </button>
          )}

          {/* Admin */}
          {profile?.is_admin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3.5 text-sm text-white hover:bg-white/5 transition-colors"
            >
              <span className="text-base">🛡</span>
              <div>
                <div className="font-medium">Admin Panel</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Manage users and invite codes</div>
              </div>
              <span className="ml-auto text-[var(--text-secondary)] text-xs">›</span>
            </Link>
          )}
        </div>

        {/* Account */}
        <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <span className="text-base">↪</span>
            <span>Sign out</span>
          </button>
        </div>

        <PolicyFooter />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <AppShell
        activePage={activePage}
        onNavigate={setActivePage}
        activityCount={recCount}
        profile={profile}
        onSignOut={signOut}
        onInvite={(profile?.is_admin || profile?.can_invite) ? () => setShowInvite(true) : undefined}
        headerExtra={(activePage === 'queue' || activePage === 'browse') ? queueChip : undefined}
      >
        {activePage === 'list'     && renderList()}
        {activePage === 'queue'    && renderQueue()}
        {activePage === 'browse'   && renderBrowse()}
        {activePage === 'activity' && renderActivity()}
        {activePage === 'settings' && renderSettings()}
      </AppShell>

      {/* Global modals (page-independent) */}

      {pendingResult && (
        <AddEntryForm
          result={pendingResult}
          genres={pendingGenres}
          onSubmit={handleAddEntry}
          onCancel={() => { setPendingResult(null); setPendingGenres([]) }}
        />
      )}

      {editingEntry && (
        <EditEntryForm
          entry={editingEntry}
          onSubmit={handleEditSave}
          onCancel={() => setEditingEntry(null)}
        />
      )}

      {recommendEntry && user && (
        <SendRecModal
          entry={recommendEntry}
          currentUserId={user.id}
          onClose={() => setRecommendEntry(null)}
        />
      )}

      {addToQueueEntry && user && (
        <AddToQueueModal
          entry={addToQueueEntry}
          queues={queues}
          onAdd={async (queueId, asProposal) => {
            const { error } = await supabase.from('queue_titles').insert({
              queue_id: queueId,
              title_id: addToQueueEntry.title_id,
              added_by: user.id,
              status: asProposal ? 'proposed' : 'active',
            })
            if (error && error.code !== '23505') throw error
            await refreshTitleQueueMap()
          }}
          onClose={() => setAddToQueueEntry(null)}
        />
      )}

      {showCreateQueue && user && (
        <CreateQueueModal
          currentUserId={user.id}
          onCreated={(id) => { setShowCreateQueue(false); setActiveQueueId(id) }}
          onCancel={() => setShowCreateQueue(false)}
        />
      )}

      {detailEntry && (
        <TitleDetailModal
          entry={detailEntry}
          providers={availability[detailEntry.title_id] ?? []}
          subscribedIds={subscribedIds}
          onClose={() => setDetailEntry(null)}
          onStatusChange={(id, status) => { setStatus(id, status); setDetailEntry(null) }}
          onEdit={(entry) => { setEditingEntry(entry); setDetailEntry(null) }}
          onRecommend={(entry) => { setRecommendEntry(entry); setDetailEntry(null) }}
          onAddToQueue={queues.length > 0 ? (entry) => { setAddToQueueEntry(entry); setDetailEntry(null) } : undefined}
          onDelete={(id) => { deleteEntry(id); setDetailEntry(null) }}
        />
      )}

      {showInvite && user && profile && (
        <InviteModal
          inviterName={profile.display_name}
          inviterId={user.id}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showServices && (
        <StreamingServicesModal
          subscriptions={subscriptions}
          subscribedIds={subscribedIds}
          onToggle={toggleSubscription}
          onSyncAll={syncAllAvailability}
          onClose={() => setShowServices(false)}
        />
      )}

      {showQueueSettings && activeQueue && user && (
        <QueueSettingsModal
          queue={activeQueue}
          currentUserId={user.id}
          onClose={() => setShowQueueSettings(false)}
          onDeleted={() => { setShowQueueSettings(false); setActiveQueueId(null) }}
        />
      )}
    </>
  )
}
