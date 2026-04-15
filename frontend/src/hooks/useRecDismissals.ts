import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRecDismissals(userId: string | undefined) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!userId) return
    supabase
      .from('rec_dismissals')
      .select('tmdb_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setDismissedIds(new Set((data ?? []).map((d: { tmdb_id: number }) => d.tmdb_id)))
      })
  }, [userId])

  async function dismiss(tmdbId: number) {
    if (!userId) return
    // Optimistic update — card disappears immediately
    setDismissedIds((prev) => new Set([...prev, tmdbId]))
    await supabase.from('rec_dismissals').insert({ user_id: userId, tmdb_id: tmdbId })
  }

  return { dismissedIds, dismiss }
}
