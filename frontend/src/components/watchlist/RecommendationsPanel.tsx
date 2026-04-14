import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { thumbnailUrl } from '../../lib/tmdb'
import { Button } from '../ui/Button'
import type { WatchlistEntryWithTitle } from '../../types'

interface IncomingRec {
  id: string
  from_profile: { id: string; display_name: string }
  title: { id: string; title: string; poster_path: string | null }
  message: string | null
}

interface RecommendationsPanelProps {
  currentUserId: string
  onClose: () => void
  onAddToList?: (titleId: string) => void
}

export function RecommendationsPanel({ currentUserId, onClose }: RecommendationsPanelProps) {
  const [incoming, setIncoming] = useState<IncomingRec[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchIncoming() {
    const { data } = await supabase
      .from('recommendations')
      .select('id, message, title:titles(id, title, poster_path), from_profile:profiles!recommendations_from_user_id_fkey(id, display_name)')
      .eq('to_user_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIncoming((data ?? []) as unknown as IncomingRec[])
    setLoading(false)
  }

  useEffect(() => { fetchIncoming() }, [currentUserId])

  async function respond(recId: string, status: 'accepted' | 'declined') {
    await supabase.from('recommendations').update({ status }).eq('id', recId)
    setIncoming((prev) => prev.filter((r) => r.id !== recId))
  }

  return (
    <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Recommendations</h2>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors text-lg leading-none cursor-pointer">×</button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
      ) : incoming.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">No pending recommendations</div>
      ) : (
        <div className="divide-y divide-white/5">
          {incoming.map((rec) => (
            <div key={rec.id} className="flex gap-3 px-4 py-3">
              {rec.title.poster_path ? (
                <img
                  src={thumbnailUrl(rec.title.poster_path)}
                  alt=""
                  className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-[60px] bg-white/10 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-tight truncate">{rec.title.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  from <span className="text-white">{rec.from_profile.display_name}</span>
                </p>
                {rec.message && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 italic">"{rec.message}"</p>
                )}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => respond(rec.id, 'accepted')}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition-colors cursor-pointer"
                  >
                    Add to list
                  </button>
                  <button
                    onClick={() => respond(rec.id, 'declined')}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-[var(--text-secondary)] border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// Send recommendation modal
// ---------------------------------------------------------------
interface SendRecModalProps {
  entry: WatchlistEntryWithTitle
  currentUserId: string
  onClose: () => void
}

export function SendRecModal({ entry, currentUserId, onClose }: SendRecModalProps) {
  const [profiles, setProfiles] = useState<{ id: string; display_name: string }[]>([])
  const [toUserId, setToUserId] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name')
      .neq('id', currentUserId)
      .then(({ data }) => setProfiles(data ?? []))
  }, [currentUserId])

  async function handleSend() {
    if (!toUserId) return
    setSaving(true)
    setErr(null)
    try {
      const { error } = await supabase.from('recommendations').insert({
        from_user_id: currentUserId,
        to_user_id: toUserId,
        title_id: entry.title_id,
        message: message || null,
      })
      if (error) throw error
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Recommend to someone</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white text-xl leading-none cursor-pointer">×</button>
        </div>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-green-400 font-medium">Recommendation sent!</p>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-3 items-center">
              {entry.title.poster_path && (
                <img src={thumbnailUrl(entry.title.poster_path)} alt="" className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0" />
              )}
              <p className="font-medium text-white text-sm">{entry.title.title}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Send to</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select a person…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Why you'd recommend it…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {err && <p className="text-sm text-red-400">{err}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" disabled={!toUserId || saving} onClick={handleSend}>
                {saving ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
