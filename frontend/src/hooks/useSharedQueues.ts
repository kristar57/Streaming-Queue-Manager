import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SharedQueue, QueueMember, QueueTitleWithMemberEntries, WatchlistEntryWithTitle } from '../types'

// ---------------------------------------------------------------
// useSharedQueues — list all queues the user belongs to
// ---------------------------------------------------------------
export function useSharedQueues(userId: string | undefined) {
  const [queues, setQueues] = useState<SharedQueue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueues = useCallback(async () => {
    if (!userId) { setLoading(false); return }

    // Get queues where the user is a member
    const { data: memberRows } = await supabase
      .from('queue_members')
      .select('queue_id')
      .eq('user_id', userId)

    const queueIds = (memberRows ?? []).map((r) => r.queue_id as string)
    if (queueIds.length === 0) { setQueues([]); setLoading(false); return }

    const { data } = await supabase
      .from('shared_queues')
      .select('*')
      .in('id', queueIds)
      .order('created_at', { ascending: true })

    setQueues((data ?? []) as SharedQueue[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchQueues()

    const channel = supabase
      .channel('shared_queues_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_queues' }, fetchQueues)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_members' }, fetchQueues)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchQueues])

  // Create a new shared queue and add the creator as first member
  const createQueue = useCallback(async (name: string, inviteUserIds: string[]) => {
    if (!userId) return null

    const { data: queueData, error } = await supabase
      .from('shared_queues')
      .insert({ name, created_by: userId })
      .select('id')
      .single()

    if (error) throw error
    const queueId = queueData.id as string

    // Add creator + invitees as members
    const members = [userId, ...inviteUserIds].map((uid) => ({
      queue_id: queueId,
      user_id: uid,
    }))
    await supabase.from('queue_members').insert(members)

    await fetchQueues()
    return queueId
  }, [userId, fetchQueues])

  const deleteQueue = useCallback(async (queueId: string) => {
    await supabase.from('shared_queues').delete().eq('id', queueId)
    await fetchQueues()
  }, [fetchQueues])

  const leaveQueue = useCallback(async (queueId: string) => {
    if (!userId) return
    await supabase.from('queue_members').delete().eq('queue_id', queueId).eq('user_id', userId)
    await fetchQueues()
  }, [userId, fetchQueues])

  return { queues, loading, createQueue, deleteQueue, leaveQueue, refresh: fetchQueues }
}

// ---------------------------------------------------------------
// useQueueDetail — members + titles for a specific shared queue
// ---------------------------------------------------------------
export function useQueueDetail(
  queueId: string | null,
  allEntries: WatchlistEntryWithTitle[]  // personal watchlist entries for all users
) {
  const [members, setMembers] = useState<QueueMember[]>([])
  const [titles, setTitles] = useState<QueueTitleWithMemberEntries[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!queueId) { setMembers([]); setTitles([]); return }
    setLoading(true)

    // Members
    const { data: memberData } = await supabase
      .from('queue_members')
      .select('*, profile:profiles(id, display_name)')
      .eq('queue_id', queueId)

    const memberList = (memberData ?? []) as QueueMember[]
    setMembers(memberList)

    // Queue titles with joined title data
    const { data: titleData } = await supabase
      .from('queue_titles')
      .select('*, title:titles(*), added_by_profile:profiles!queue_titles_added_by_fkey(id, display_name)')
      .eq('queue_id', queueId)
      .order('queue_position', { ascending: true, nullsFirst: false })

    const rawTitles = (titleData ?? []) as (QueueTitleWithMemberEntries & { title: NonNullable<QueueTitleWithMemberEntries['title']> })[]

    // Build entry index: user_id + title_id -> entry
    const entryIndex = new Map<string, WatchlistEntryWithTitle>()
    for (const e of allEntries) {
      entryIndex.set(`${e.user_id}:${e.title_id}`, e)
    }

    // Attach each member's entry to each title
    const enriched: QueueTitleWithMemberEntries[] = rawTitles.map((qt) => ({
      ...qt,
      member_entries: memberList.map((m) => ({
        user_id: m.user_id,
        display_name: m.profile?.display_name ?? m.user_id,
        entry: entryIndex.get(`${m.user_id}:${qt.title_id}`) ?? null,
      })),
    }))

    setTitles(enriched)
    setLoading(false)
  }, [queueId, allEntries])

  useEffect(() => {
    fetchDetail()

    const channel = supabase
      .channel(`queue_detail_${queueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_titles' }, fetchDetail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_members' }, fetchDetail)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchDetail, queueId])

  // Add a title to the shared queue
  const addTitle = useCallback(async (titleId: string, addedBy: string) => {
    if (!queueId) return
    const { error } = await supabase.from('queue_titles').insert({
      queue_id: queueId,
      title_id: titleId,
      added_by: addedBy,
    })
    if (error && error.code !== '23505') throw error // ignore duplicate
    await fetchDetail()
  }, [queueId, fetchDetail])

  // Remove a title from the shared queue (not from personal lists)
  const removeTitle = useCallback(async (queueTitleId: string) => {
    await supabase.from('queue_titles').delete().eq('id', queueTitleId)
    await fetchDetail()
  }, [fetchDetail])

  // Reorder a title up or down within the shared queue
  const reorderTitle = useCallback(async (queueTitleId: string, direction: 'up' | 'down') => {
    const idx = titles.findIndex((t) => t.id === queueTitleId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= titles.length) return

    const positions = titles.map((_, i) => i + 1)
    const temp = positions[idx]
    positions[idx] = positions[swapIdx]
    positions[swapIdx] = temp

    await Promise.all([
      supabase.from('queue_titles').update({ queue_position: positions[idx] }).eq('id', titles[idx].id),
      supabase.from('queue_titles').update({ queue_position: positions[swapIdx] }).eq('id', titles[swapIdx].id),
    ])

    await fetchDetail()
  }, [titles, fetchDetail])

  return { members, titles, loading, addTitle, removeTitle, reorderTitle, refresh: fetchDetail }
}
