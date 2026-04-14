import { supabase } from './supabase'
import type { TMDBSearchResult, TMDBWatchProviders } from '../types'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// TMDB genre ID → name map (movies + shows combined, de-duped)
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV-only genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
}

export function genreIdsToNames(ids: number[]): string[] {
  return ids.map((id) => TMDB_GENRE_MAP[id]).filter(Boolean)
}

export const thumbnailUrl = (path: string) => `${TMDB_IMAGE_BASE}/w92${path}`
export const cardUrl      = (path: string) => `${TMDB_IMAGE_BASE}/w342${path}`
export const fullUrl      = (path: string) => `${TMDB_IMAGE_BASE}/w500${path}`

async function tmdbCall<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tmdb', {
    body: { path, params },
  })
  if (error) throw error
  return data as T
}

export async function searchTitles(query: string): Promise<TMDBSearchResult[]> {
  const data = await tmdbCall<{ results: TMDBSearchResult[] }>('/search/multi', {
    query,
    include_adult: 'false',
  })
  return (data.results ?? []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
}

// ---------------------------------------------------------------
// Detail + credits in one call (append_to_response=credits)
// ---------------------------------------------------------------

interface TMDBCrewMember {
  job: string
  name: string
}

interface TMDBCastMember {
  name: string
  character: string
  profile_path: string | null
  order: number
}

interface TMDBCreator {
  name: string
}

interface TMDBNetwork {
  name: string
}

interface TMDBNextEpisode {
  air_date: string | null
}

export interface TMDBTitleDetails {
  // shared
  runtime?: number                    // movies (minutes)
  status: string
  tagline?: string
  credits: { cast: TMDBCastMember[]; crew: TMDBCrewMember[] }
  // movies
  release_date?: string
  // shows
  number_of_seasons?: number
  number_of_episodes?: number
  episode_run_time?: number[]
  in_production?: boolean
  last_air_date?: string | null
  next_episode_to_air?: TMDBNextEpisode | null
  created_by?: TMDBCreator[]
  networks?: TMDBNetwork[]
}

export async function getFullTitleDetails(
  type: 'movie' | 'tv',
  tmdbId: number
): Promise<TMDBTitleDetails> {
  return tmdbCall<TMDBTitleDetails>(`/${type}/${tmdbId}`, {
    append_to_response: 'credits',
  })
}

export async function getWatchProviders(
  type: 'movie' | 'tv',
  tmdbId: number,
  country = 'US'
): Promise<TMDBWatchProviders> {
  const data = await tmdbCall<{ results: Record<string, TMDBWatchProviders> }>(
    `/${type}/${tmdbId}/watch/providers`
  )
  return data.results?.[country] ?? {}
}

export interface TMDBProvider {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

// Fetches the full list of streaming providers available in a region.
// Results are sorted by display_priority (most prominent services first).
export async function getAvailableProviders(country = 'US'): Promise<TMDBProvider[]> {
  const [movies, tv] = await Promise.all([
    tmdbCall<{ results: TMDBProvider[] }>('/watch/providers/movie', { watch_region: country }),
    tmdbCall<{ results: TMDBProvider[] }>('/watch/providers/tv', { watch_region: country }),
  ])
  const map = new Map<number, TMDBProvider>()
  for (const p of [...(movies.results ?? []), ...(tv.results ?? [])]) {
    if (!map.has(p.provider_id)) map.set(p.provider_id, p)
  }
  return [...map.values()].sort((a, b) => a.display_priority - b.display_priority)
}
