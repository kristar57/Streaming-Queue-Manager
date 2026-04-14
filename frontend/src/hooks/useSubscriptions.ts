import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserSubscription } from '../types'

// Known provider ID aliases due to rebrands or TMDB duplicates. When a user
// subscribes to any one ID in a group, all IDs in that group are treated as
// matching to handle TMDB data inconsistency.
const PROVIDER_ALIAS_GROUPS: number[][] = [
  [384, 1899],      // HBO Max / Max
  [9, 119, 1024],   // Amazon Prime Video variants
]

function expandIds(ids: number[]): Set<number> {
  const set = new Set(ids)
  for (const id of ids) {
    for (const group of PROVIDER_ALIAS_GROUPS) {
      if (group.includes(id)) {
        for (const alias of group) set.add(alias)
      }
    }
  }
  return set
}

export function useSubscriptions(userId: string | undefined) {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('provider_name')

    const rows = (data ?? []) as UserSubscription[]
    setSubscriptions(rows)
    setSubscribedIds(expandIds(rows.map((s) => s.provider_id)))
    setLoading(false)
  }, [userId])

  const toggleSubscription = useCallback(
    async (provider: { provider_id: number; provider_name: string; provider_logo_path: string | null }) => {
      if (!userId) return
      if (subscribedIds.has(provider.provider_id)) {
        await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('provider_id', provider.provider_id)
      } else {
        await supabase.from('user_subscriptions').insert({
          user_id: userId,
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          provider_logo_path: provider.provider_logo_path,
        })
      }
      await fetch()
    },
    [userId, subscribedIds, fetch]
  )

  useEffect(() => { fetch() }, [fetch])

  return { subscriptions, subscribedIds, loading, toggleSubscription, refresh: fetch }
}
