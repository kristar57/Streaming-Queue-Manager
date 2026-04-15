import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getTmdbRecommendations } from '../lib/tmdb'
import type { WatchlistEntryWithTitle, QueueTitleWithMemberEntries, TMDBSearchResult } from '../types'

// ---------------------------------------------------------------
// Seed weight for an entry.
// Explicit ratings take priority; watched-without-rating is a weak
// implicit positive signal; Pass entries contribute a blacklist.
// ---------------------------------------------------------------
function entryWeight(entry: WatchlistEntryWithTitle): number {
  if (entry.user_rating === -1) return -1         // 👎 — blacklist
  if (entry.user_rating === 3)  return 4          // 👍👍👍 — loved
  if (entry.user_rating === 2)  return 3          // 👍👍 — really liked
  if (entry.user_rating === 1)  return 2          // 👍 — liked
  if (entry.status === 'watched') return 1        // Finished — implicit positive
  return 0                                        // No usable signal
}

// ---------------------------------------------------------------
// Personal recommendations — seeded from the user's own entries
// ---------------------------------------------------------------
export function usePersonalRecs(
  userId: string | undefined,
  entries: WatchlistEntryWithTitle[],
  enabled: boolean
) {
  const [recs, setRecs] = useState<TMDBSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Fingerprint of all current ratings — changes whenever the user rates something
  const ratingsSig = entries
    .filter((e) => e.user_rating !== null)
    .map((e) => `${e.id}:${e.user_rating}`)
    .join(',')

  useEffect(() => {
    if (!userId || !enabled || entries.length === 0) { setRecs([]); return }

    const cacheKey = `personal_recs_${userId}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setRecs(JSON.parse(cached)); return } catch {}
    }

    const existingTmdbIds = new Set(entries.map((e) => e.title.tmdb_id))
    const blacklistTmdbIds = new Set(
      entries.filter((e) => e.user_rating === -1).map((e) => e.title.tmdb_id)
    )

    const seeds = entries
      .map((e) => ({ entry: e, weight: entryWeight(e) }))
      .filter((s) => s.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)

    if (seeds.length === 0) return

    setLoading(true)
    ;(async () => {
      const counts = new Map<number, { result: TMDBSearchResult; score: number }>()

      for (const { entry, weight } of seeds) {
        try {
          const type = entry.title.type === 'movie' ? 'movie' : 'tv'
          const results = await getTmdbRecommendations(type, entry.title.tmdb_id)
          for (const r of results) {
            if (existingTmdbIds.has(r.id) || blacklistTmdbIds.has(r.id)) continue
            const ex = counts.get(r.id)
            if (ex) ex.score += weight
            else counts.set(r.id, { result: r, score: weight })
          }
          await new Promise((r) => setTimeout(r, 100))
        } catch { /* non-fatal */ }
      }

      const sorted = [...counts.values()]
        .sort((a, b) => b.score - a.score || (b.result.vote_average ?? 0) - (a.result.vote_average ?? 0))
        .slice(0, 24)
        .map((x) => x.result)

      setRecs(sorted)
      sessionStorage.setItem(cacheKey, JSON.stringify(sorted))
      setLoading(false)
    })()
  // ratingsSig changes whenever any rating changes, causing the effect to re-run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled, ratingsSig])

  return { recs, loading }
}

// ---------------------------------------------------------------
// Group recommendations — seeded from all members' entry signals in a queue
// ---------------------------------------------------------------
export function useGroupRecs(
  queueId: string | null,
  titles: QueueTitleWithMemberEntries[],
  enabled: boolean
) {
  const [recs, setRecs] = useState<TMDBSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Recompute whenever any queue rating changes
  const ratingsSig = titles
    .flatMap((qt) => qt.member_entries.map((m) => `${qt.title_id}:${m.user_id}:${m.queue_rating}`))
    .join(',')

  useEffect(() => {
    if (!queueId || !enabled || titles.length === 0) { setRecs([]); return }

    // Cache key includes ratings so stale cache is bypassed when ratings change
    const cacheKey = `group_recs_${queueId}_${ratingsSig.length}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setRecs(JSON.parse(cached)); return } catch {}
    }
    // Clear any old cache entries for this queue
    sessionStorage.removeItem(`group_recs_${queueId}`)

    type SeedInfo = { tmdbId: number; type: 'movie' | 'tv'; score: number }
    const seedMap = new Map<number, SeedInfo>()
    const blacklistTmdbIds = new Set<number>()
    const queueTmdbIds = new Set(titles.map((qt) => qt.title.tmdb_id))

    for (const qt of titles) {
      const tmdbId = qt.title.tmdb_id
      const type = qt.title.type === 'movie' ? 'movie' : 'tv'
      let score = 0
      let blacklisted = false
      for (const m of qt.member_entries) {
        const r = m.queue_rating ?? null
        const status = m.entry?.status ?? null
        if (r === -1) { blacklisted = true; break }
        if (r === 3) score += 4
        else if (r === 2) score += 3
        else if (r === 1) score += 2
        else if (status === 'watched') score += 1
      }
      if (blacklisted) { blacklistTmdbIds.add(tmdbId); continue }
      if (score > 0) seedMap.set(tmdbId, { tmdbId, type, score })
    }

    const seeds = [...seedMap.values()].sort((a, b) => b.score - a.score).slice(0, 8)
    if (seeds.length === 0) return

    setLoading(true)
    ;(async () => {
      const counts = new Map<number, { result: TMDBSearchResult; score: number }>()

      for (const seed of seeds) {
        try {
          const results = await getTmdbRecommendations(seed.type, seed.tmdbId)
          for (const r of results) {
            if (queueTmdbIds.has(r.id) || blacklistTmdbIds.has(r.id)) continue
            const ex = counts.get(r.id)
            if (ex) ex.score += seed.score
            else counts.set(r.id, { result: r, score: seed.score })
          }
          await new Promise((r) => setTimeout(r, 100))
        } catch { /* non-fatal */ }
      }

      const sorted = [...counts.values()]
        .sort((a, b) => b.score - a.score || (b.result.vote_average ?? 0) - (a.result.vote_average ?? 0))
        .slice(0, 24)
        .map((x) => x.result)

      setRecs(sorted)
      sessionStorage.setItem(cacheKey, JSON.stringify(sorted))
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId, enabled, ratingsSig])

  return { recs, loading }
}

// ---------------------------------------------------------------
// Partner discovery — titles a queue partner rated well that you haven't added
// ---------------------------------------------------------------
export interface PartnerRec {
  partnerName: string
  partnerId: string
  entries: WatchlistEntryWithTitle[]
}

export function usePartnerRecs(
  userId: string | undefined,
  myEntries: WatchlistEntryWithTitle[],
  partners: { id: string; name: string }[],
  enabled: boolean
) {
  const [partnerRecs, setPartnerRecs] = useState<PartnerRec[]>([])

  useEffect(() => {
    if (!userId || !enabled || partners.length === 0) { setPartnerRecs([]); return }

    const myTitleIds = new Set(myEntries.map((e) => e.title_id))
    const others = partners.filter((p) => p.id !== userId)
    if (others.length === 0) { setPartnerRecs([]); return }

    ;(async () => {
      const result: PartnerRec[] = []
      for (const partner of others) {
        const { data } = await supabase
          .from('watchlist_entries')
          .select('*, title:titles(*), profile:profiles(id, display_name)')
          .eq('user_id', partner.id)
          .in('user_rating', [1, 2, 3])
          .order('user_rating', { ascending: false })
          .limit(20)

        const filtered = ((data ?? []) as WatchlistEntryWithTitle[])
          .filter((e) => !myTitleIds.has(e.title_id))

        if (filtered.length > 0) {
          result.push({ partnerName: partner.name, partnerId: partner.id, entries: filtered })
        }
      }
      setPartnerRecs(result)
    })()
  }, [userId, enabled, partners])

  return partnerRecs
}
