import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Recommendation, Title } from '../types'

interface RecommendationWithDetails extends Recommendation {
  title: Title
  from_profile: { id: string; display_name: string }
}

export function useRecommendations(userId: string | undefined) {
  const [incoming, setIncoming] = useState<RecommendationWithDetails[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data } = await supabase
      .from('recommendations')
      .select('*, title:titles(*), from_profile:profiles!recommendations_from_user_id_fkey(id, display_name)')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setIncoming((data ?? []) as RecommendationWithDetails[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel('recommendations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recommendations' },
        () => fetch()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const sendRecommendation = useCallback(
    async (toUserId: string, titleId: string, message: string) => {
      if (!userId) return
      const { error } = await supabase.from('recommendations').insert({
        from_user_id: userId,
        to_user_id: toUserId,
        title_id: titleId,
        message: message || null,
      })
      if (error) throw error
    },
    [userId]
  )

  const respond = useCallback(
    async (recId: string, status: 'accepted' | 'declined') => {
      const { error } = await supabase
        .from('recommendations')
        .update({ status })
        .eq('id', recId)
      if (error) throw error
      await fetch()
    },
    [fetch]
  )

  return { incoming, loading, sendRecommendation, respond, refresh: fetch }
}
