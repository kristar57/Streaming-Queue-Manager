import type { Title } from '../types'

// ---------------------------------------------------------------
// Human-readable release / airing status chip for a title.
// Returns null when there is nothing notable to display.
// ---------------------------------------------------------------
export function getTitleStatusChip(
  title: Title
): { label: string; color: 'blue' | 'yellow' | 'gray' | 'red' } | null {
  const today = new Date()

  if (title.type === 'movie') {
    const status = title.tmdb_status
    if (!status || status === 'Released') return null
    if (['In Production', 'Post Production', 'Planned', 'Rumored'].includes(status)) {
      if (title.release_date) {
        const rd = new Date(title.release_date)
        if (rd > today) {
          return { label: `Coming ${rd.getFullYear()}`, color: 'yellow' }
        }
      }
      return { label: 'In Production', color: 'yellow' }
    }
    if (status === 'Canceled') return { label: 'Canceled', color: 'red' }
    return null
  }

  // Shows
  if (title.next_episode_air_date) {
    const next = new Date(title.next_episode_air_date)
    if (next > today) {
      const formatted = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { label: `New ep ${formatted}`, color: 'blue' }
    }
  }
  const status = title.tmdb_status
  if (status === 'Returning Series') {
    return title.in_production
      ? { label: 'In production', color: 'blue' }
      : { label: 'Returning', color: 'yellow' }
  }
  if (status === 'Ended') return { label: 'Series ended', color: 'gray' }
  if (status === 'Canceled') return { label: 'Canceled', color: 'red' }
  if (status === 'In Production') return { label: 'In Production', color: 'yellow' }
  return null
}

// Format runtime as "1h 42m" or season/episode count
export function formatRuntime(title: Title): string | null {
  if (title.type === 'movie' && title.runtime_minutes) {
    const h = Math.floor(title.runtime_minutes / 60)
    const m = title.runtime_minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  if (title.type === 'show') {
    const parts: string[] = []
    if (title.season_count) parts.push(`${title.season_count} season${title.season_count !== 1 ? 's' : ''}`)
    if (title.episode_count) parts.push(`${title.episode_count} eps`)
    return parts.join(', ') || null
  }
  return null
}

export function releaseYear(title: Title): string | null {
  const date = title.release_date
  return date ? new Date(date).getFullYear().toString() : null
}
