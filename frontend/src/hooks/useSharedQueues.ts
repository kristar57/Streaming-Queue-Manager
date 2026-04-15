import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { SharedQueue, QueueMember, QueueTitleWithMemberEntries, WatchlistEntryWithTitle } from '../types'

// ---------------------------------------------------------------
// useTitleQueueMap — which of the user's titles appear in shared queues?
// Returns a map: title_id → [{ queueId, queueName, status }]
// Used to show "also in shared queue" badges on personal list entries.
// ---------------------------------------------------------------
export interface TitleQueueRef {
  queueId: string
  queueName: string
  status: string   // 'active' | 'proposed' | 'shelved'
}

export function useTitleQueueMap(userId: string | undefined, queues: SharedQueue[]) {
  const [map, setMap] = useState<Record<string, TitleQueueRef[]>>({})

  const fetch = useCallback(async () => {
    if (!userId || queues.length === 0) { setMap({}); return }

    const queueIds = queues.map((q) => q.id)
    const { data } = await supabase
      .from('queue_titles')
      .select('title_id, queue_id, status')
      .in('queue_id', queueIds)
      .in('status', ['active', 'proposed', 'shelved'])

    if (!data) return

    const result: Record<string, TitleQueueRef[]> = {}
    const queueNameMap = Object.fromEntries(queues.map((q) => [q.id, q.name]))
    for (const row of data) {
      const tid = row.title_id as string
      if (!result[tid]) result[tid] = []
      result[tid].push({
        queueId: row.queue_id as string,
        queueName: queueNameMap[row.queue_id as string] ?? 'Shared queue',
        status: row.status as string,
      })
    }
    setMap(result)
  }, [userId, queues])

  useEffect(() => {
    fetch()

    if (!userId || queues.length === 0) return
    const queueIds = queues.map((q) => q.id)
    const channel = supabase
      .channel(`title_queue_map_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_titles', filter: `queue_id=in.(${queueIds.join(',')})` },
        fetch
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch, userId, queues])

  return { map, refresh: fetch }
}

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
export function useQueueDetail(queueId: string | null) {
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

    // Fetch watchlist entries for all members for all titles in this queue.
    // This is independent of the personal watchlist hook so we always get
    // every member's status regardless of who is currently logged in.
    const titleIds = rawTitles.map((qt) => qt.title_id)
    const memberIds = memberList.map((m) => m.user_id)
    const entryIndex = new Map<string, WatchlistEntryWithTitle>()
    const queueRatingIndex = new Map<string, -1 | 1 | 2 | 3>()

    if (titleIds.length > 0 && memberIds.length > 0) {
      const [{ data: entryData }, { data: ratingData }] = await Promise.all([
        supabase
          .from('watchlist_entries')
          .select('*, title:titles(*), profile:profiles(id, display_name)')
          .in('user_id', memberIds)
          .in('title_id', titleIds),
        supabase
          .from('queue_title_ratings')
          .select('user_id, title_id, rating')
          .eq('queue_id', queueId)
          .in('title_id', titleIds),
      ])

      for (const e of (entryData ?? []) as WatchlistEntryWithTitle[]) {
        entryIndex.set(`${e.user_id}:${e.title_id}`, e)
      }
      for (const r of (ratingData ?? []) as { user_id: string; title_id: string; rating: -1 | 1 | 2 | 3 }[]) {
        queueRatingIndex.set(`${r.user_id}:${r.title_id}`, r.rating)
      }
    }

    // Attach each member's entry and queue rating to each title
    const enriched: QueueTitleWithMemberEntries[] = rawTitles.map((qt) => ({
      ...qt,
      member_entries: memberList.map((m) => ({
        user_id: m.user_id,
        display_name: m.profile?.display_name ?? m.user_id,
        entry: entryIndex.get(`${m.user_id}:${qt.title_id}`) ?? null,
        queue_rating: queueRatingIndex.get(`${m.user_id}:${qt.title_id}`) ?? null,
      })),
    }))

    setTitles(enriched)
    setLoading(false)
  }, [queueId])

  useEffect(() => {
    fetchDetail()

    const channel = supabase
      .channel(`queue_detail_${queueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_titles' }, fetchDetail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_members' }, fetchDetail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist_entries' }, fetchDetail)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_title_ratings' }, fetchDetail)
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

  // Approve a proposed title (changes status → active)
  const approveTitle = useCallback(async (queueTitleId: string) => {
    await supabase.from('queue_titles').update({ status: 'active' }).eq('id', queueTitleId)
    await fetchDetail()
  }, [fetchDetail])

  // Reject a proposed title (hard no)
  const rejectTitle = useCallback(async (queueTitleId: string) => {
    await supabase.from('queue_titles').update({ status: 'rejected' }).eq('id', queueTitleId)
    await fetchDetail()
  }, [fetchDetail])

  // Shelf a proposed title (not now, revisit later)
  const shelfTitle = useCallback(async (queueTitleId: string) => {
    await supabase.from('queue_titles').update({ status: 'shelved' }).eq('id', queueTitleId)
    await fetchDetail()
  }, [fetchDetail])

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

  return { members, titles, loading, addTitle, approveTitle, rejectTitle, shelfTitle, removeTitle, reorderTitle, refresh: fetchDetail }
}
