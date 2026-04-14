import { useState, useEffect, useRef } from 'react'
import { searchTitles, genreIdsToNames } from '../lib/tmdb'
import type { TMDBSearchResult } from '../types'

interface UseTMDBSearch {
  query: string
  results: TMDBSearchResult[]
  genres: Record<number, string[]>   // tmdb_id → genre name array
  loading: boolean
  error: string | null
}

export function useTMDBSearch(query: string): Omit<UseTMDBSearch, 'query'> {
  const [results, setResults] = useState<TMDBSearchResult[]>([])
  const [genres, setGenres] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setGenres({})
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchTitles(query)
        setResults(data)

        // Pre-compute genre names for each result
        const genreMap: Record<number, string[]> = {}
        for (const r of data) {
          genreMap[r.id] = genreIdsToNames(r.genre_ids)
        }
        setGenres(genreMap)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return { results, genres, loading, error }
}
