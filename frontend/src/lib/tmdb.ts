import { supabase } from './supabase'
import type { TMDBSearchResult, TMDBWatchProviders } from '../types'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

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

export async function getMovieDetails(tmdbId: number) {
  return tmdbCall(`/movie/${tmdbId}`)
}

export async function getShowDetails(tmdbId: number) {
  return tmdbCall(`/tv/${tmdbId}`)
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
