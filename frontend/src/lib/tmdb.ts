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
