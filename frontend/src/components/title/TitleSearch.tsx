import { useState, useRef, useEffect } from 'react'
import { useTMDBSearch } from '../../hooks/useTMDB'
import { thumbnailUrl } from '../../lib/tmdb'
import type { TMDBSearchResult } from '../../types'

interface TitleSearchProps {
  onSelect: (result: TMDBSearchResult, genres: string[]) => void
  placeholder?: string
}

export function TitleSearch({ onSelect, placeholder = 'Search for a movie or show...' }: TitleSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { results, genres, loading } = useTMDBSearch(query)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = open && query.trim().length > 0

  function handleSelect(result: TMDBSearchResult) {
    onSelect(result, genres[result.id] ?? [])
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors pr-10"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-xs animate-pulse">
            ...
          </span>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full bg-[var(--bg-card)] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r) => {
            const title = r.title ?? r.name ?? 'Unknown'
            const year = (r.release_date ?? r.first_air_date ?? '').slice(0, 4)
            const typeLabel = r.media_type === 'movie' ? 'Movie' : 'Show'
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/10 transition-colors text-left"
                >
                  {r.poster_path ? (
                    <img
                      src={thumbnailUrl(r.poster_path)}
                      alt=""
                      className="w-8 h-12 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-12 bg-white/10 rounded flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {typeLabel}{year ? ` · ${year}` : ''}
                    </p>
                    {genres[r.id]?.length > 0 && (
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {genres[r.id].slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showDropdown && !loading && results.length === 0 && query.trim().length > 1 && (
        <div className="absolute z-40 mt-1 w-full bg-[var(--bg-card)] border border-white/10 rounded-xl shadow-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
