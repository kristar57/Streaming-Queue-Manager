import { useEffect, useState } from 'react'
import { getTrailerKey } from '../lib/tmdb'
import type { TitleType } from '../types'

export function useTrailer(tmdbId: number | undefined, type: TitleType | undefined) {
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tmdbId || !type) return
    const tmdbType = type === 'show' ? 'tv' : 'movie'
    setLoading(true)
    getTrailerKey(tmdbType, tmdbId)
      .then((key) => {
        setTrailerUrl(key ? `https://www.youtube.com/watch?v=${key}` : null)
      })
      .catch(() => setTrailerUrl(null))
      .finally(() => setLoading(false))
  }, [tmdbId, type])

  return { trailerUrl, loading }
}
