import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getWatchProviders, getFullTitleDetails } from '../lib/tmdb'
import type {
  WatchlistEntryWithTitle,
  Title,
  EntryFormFields,
  TMDBSearchResult,
  AvailabilityType,
  StreamingAvailability,
} from '../types'

// ---------------------------------------------------------------
// Upsert a title from a TMDB search result, returning its DB id.
// Uses tmdb_id as the conflict key so re-adding the same title
// just refreshes the metadata.
// After the basic upsert, fetches full details + credits from TMDB
// and stores them in the same row.
// ---------------------------------------------------------------
export async function upsertTitle(result: TMDBSearchResult, genres: string[]): Promise<string> {
  const isMovie = result.media_type === 'movie'
  const tmdbType = isMovie ? 'movie' : 'tv'

  const basicPayload: Omit<Title, 'id' | 'created_at' | 'cast_members' | 'tagline' | 'director' | 'created_by' | 'network' | 'last_air_date' | 'next_episode_air_date' | 'in_production'> = {
    tmdb_id: result.id,
    type: isMovie ? 'movie' : 'show',
    title: result.title ?? result.name ?? '',
    overview: result.overview || null,
    poster_path: result.poster_path,
    backdrop_path: result.backdrop_path,
    release_date: (isMovie ? result.release_date : result.first_air_date) ?? null,
    genres,
    tmdb_rating: result.vote_average ?? null,
    runtime_minutes: null,
    season_count: null,
    episode_count: null,
    tmdb_status: null,
    last_synced_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('titles')
    .upsert(basicPayload, { onConflict: 'tmdb_id' })
    .select('id')
    .single()

  if (error) throw error
  const titleId = data.id as string

  // Fetch full details + credits and enrich the row
  try {
    const details = await getFullTitleDetails(tmdbType, result.id)

    const castMembers = (details.credits?.cast ?? [])
      .slice(0, 5)
      .map((c) => ({ name: c.name, character: c.character, profile_path: c.profile_path }))

    const directors = (details.credits?.crew ?? [])
      .filter((c) => c.job === 'Director')
      .map((c) => c.name)
      .join(', ') || null

    const enriched: Partial<Title> = {
      tagline: details.tagline || null,
      tmdb_status: details.status || null,
      cast_members: castMembers.length > 0 ? castMembers : null,
    }

    if (isMovie) {
      enriched.runtime_minutes = details.runtime ?? null
      enriched.director = directors
    } else {
      enriched.season_count = details.number_of_seasons ?? null
      enriched.episode_count = details.number_of_episodes ?? null
      enriched.in_production = details.in_production ?? null
      enriched.last_air_date = details.last_air_date ?? null
      enriched.next_episode_air_date = details.next_episode_to_air?.air_date ?? null
      enriched.created_by = details.created_by?.map((c) => c.name).join(', ') || null
      enriched.network = details.networks?.[0]?.name ?? null
    }

    await supabase.from('titles').update(enriched).eq('id', titleId)
  } catch {
    // Non-fatal — basic data already saved, enrichment will retry on next add
  }

  return titleId
}

// ---------------------------------------------------------------
// Cache streaming availability for a title (fire-and-forget)
// ---------------------------------------------------------------
async function cacheAvailability(titleId: string, tmdbId: number, type: 'movie' | 'tv') {
  try {
    const providers = await getWatchProviders(type, tmdbId)
    const rows: {
      title_id: string
      provider_id: number
      provider_name: string
      provider_logo_path: string | null
      availability_type: AvailabilityType
      country_code: string
      last_checked_at: string
    }[] = []

    const now = new Date().toISOString()
    for (const [avType, list] of Object.entries(providers)) {
      for (const p of list ?? []) {
        rows.push({
          title_id: titleId,
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          provider_logo_path: p.logo_path ?? null,
          availability_type: avType as AvailabilityType,
          country_code: 'US',
          last_checked_at: now,
        })
      }
    }

    if (rows.length > 0) {
      await supabase
        .from('streaming_availability')
        .upsert(rows, { onConflict: 'title_id,provider_id,availability_type,country_code' })
    }
  } catch {
    // Non-fatal — availability will be populated on next sync
  }
}

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------
export function useWatchlist(userId?: string) {
  const [entries, setEntries] = useState<WatchlistEntryWithTitle[]>([])
  const [availability, setAvailability] = useState<Record<string, StreamingAvailability[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('watchlist_entries')
      .select('*, title:titles(*), profile:profiles(id, display_name)')
      .order('updated_at', { ascending: false })

    // Always filter to the current user's own entries for the personal list.
    // Shared queue views fetch other members' entries independently.
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as WatchlistEntryWithTitle[]
    setEntries(rows)

    // Fetch streaming availability for all titles in the list
    const titleIds = [...new Set(rows.map((e) => e.title_id))]
    if (titleIds.length > 0) {
      const { data: avRows } = await supabase
        .from('streaming_availability')
        .select('*')
        .in('title_id', titleIds)
        .eq('country_code', 'US')
        .eq('availability_type', 'flatrate') // flatrate = included in subscription

      const avMap: Record<string, StreamingAvailability[]> = {}
      for (const av of avRows ?? []) {
        const row = av as StreamingAvailability
        if (!avMap[row.title_id]) avMap[row.title_id] = []
        avMap[row.title_id].push(row)
      }
      setAvailability(avMap)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()

    // Realtime: re-fetch on any change to the user's watchlist entries
    const channel = supabase
      .channel('watchlist_entries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watchlist_entries' },
        () => fetchEntries()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchEntries])

  // Add a title from a TMDB search result and create a watchlist entry
  const addEntry = useCallback(
    async (
      result: TMDBSearchResult,
      genres: string[],
      fields: EntryFormFields,
      userId: string
    ) => {
      const titleId = await upsertTitle(result, genres)

      const { error } = await supabase.from('watchlist_entries').insert({
        user_id: userId,
        title_id: titleId,
        status: fields.status,
        priority: fields.priority,
        notes: fields.notes || null,
        custom_tags: fields.custom_tags,
        current_season: fields.current_season,
        current_episode: fields.current_episode,
        date_started: fields.status === 'watching' ? new Date().toISOString() : null,
        date_completed: fields.status === 'watched' ? new Date().toISOString() : null,
      })

      if (error) throw error

      // Fire-and-forget: cache streaming availability
      const tmdbType = result.media_type === 'movie' ? 'movie' : 'tv'
      cacheAvailability(titleId, result.id, tmdbType)

      await fetchEntries()
    },
    [fetchEntries]
  )

  // Update fields on an existing entry
  const updateEntry = useCallback(
    async (entryId: string, fields: Partial<EntryFormFields & { date_started: string | null; date_completed: string | null }>) => {
      const { error } = await supabase
        .from('watchlist_entries')
        .update(fields)
        .eq('id', entryId)

      if (error) throw error
      await fetchEntries()
    },
    [fetchEntries]
  )

  // Quick status change — sets dates automatically, resets caught-up flag
  const setStatus = useCallback(
    async (entryId: string, status: WatchlistEntryWithTitle['status']) => {
      const patch: Record<string, unknown> = { status, is_caught_up: false }
      if (status === 'watching') patch.date_started = new Date().toISOString()
      if (status === 'watched') patch.date_completed = new Date().toISOString()
      await updateEntry(entryId, patch as never)
    },
    [updateEntry]
  )

  // Toggle caught-up state (shows only, while status = watching)
  const toggleCaughtUp = useCallback(
    async (entry: WatchlistEntryWithTitle) => {
      await updateEntry(entry.id, { is_caught_up: !entry.is_caught_up } as never)
    },
    [updateEntry]
  )

  // Cycle priority: high → medium → low → high
  const cyclePriority = useCallback(
    async (entry: WatchlistEntryWithTitle) => {
      const next =
        entry.priority === 'high' ? 'medium' : entry.priority === 'medium' ? 'low' : 'high'
      await updateEntry(entry.id, { priority: next })
    },
    [updateEntry]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const { error } = await supabase
        .from('watchlist_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
      await fetchEntries()
    },
    [fetchEntries]
  )

  // Move an Up Next entry up or down in the manual queue order
  const reorderEntry = useCallback(
    async (entryId: string, direction: 'up' | 'down') => {
      const upNext = [...entries]
        .filter((e) => e.status === 'want_to_watch')
        .sort((a, b) => {
          if (a.queue_position === null && b.queue_position === null) return 0
          if (a.queue_position === null) return 1
          if (b.queue_position === null) return -1
          return a.queue_position - b.queue_position
        })

      const idx = upNext.findIndex((e) => e.id === entryId)
      if (idx === -1) return
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= upNext.length) return

      // Normalise positions then swap
      const positions = upNext.map((_, i) => i + 1)
      const temp = positions[idx]
      positions[idx] = positions[swapIdx]
      positions[swapIdx] = temp

      await Promise.all([
        supabase.from('watchlist_entries').update({ queue_position: positions[idx] }).eq('id', upNext[idx].id),
        supabase.from('watchlist_entries').update({ queue_position: positions[swapIdx] }).eq('id', upNext[swapIdx].id),
      ])

      await fetchEntries()
    },
    [entries, fetchEntries]
  )

  return { entries, availability, loading, error, addEntry, updateEntry, setStatus, toggleCaughtUp, cyclePriority, deleteEntry, reorderEntry, refresh: fetchEntries }
}
