import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getWatchProviders } from '../lib/tmdb'
import type {
  WatchlistEntryWithTitle,
  Title,
  EntryFormFields,
  TMDBSearchResult,
  AvailabilityType,
} from '../types'

// ---------------------------------------------------------------
// Upsert a title from a TMDB search result, returning its DB id.
// Uses tmdb_id as the conflict key so re-adding the same title
// just refreshes the metadata.
// ---------------------------------------------------------------
async function upsertTitle(result: TMDBSearchResult, genres: string[]): Promise<string> {
  const isMovie = result.media_type === 'movie'

  const payload: Omit<Title, 'id' | 'created_at'> = {
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
    .upsert(payload, { onConflict: 'tmdb_id' })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
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
export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntryWithTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('watchlist_entries')
      .select('*, title:titles(*)')
      .order('updated_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setEntries((data ?? []) as WatchlistEntryWithTitle[])
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

      // Fire-and-forget availability cache
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

  // Quick status change — sets dates automatically
  const setStatus = useCallback(
    async (entryId: string, status: WatchlistEntryWithTitle['status']) => {
      const patch: Record<string, unknown> = { status }
      if (status === 'watching') patch.date_started = new Date().toISOString()
      if (status === 'watched') patch.date_completed = new Date().toISOString()
      await updateEntry(entryId, patch as never)
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

  return { entries, loading, error, addEntry, updateEntry, setStatus, cyclePriority, deleteEntry, refresh: fetchEntries }
}
