import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { Button } from '../ui/Button'
import type { WatchlistEntryWithTitle, SharedQueue } from '../../types'

interface AddToQueueModalProps {
  entry: WatchlistEntryWithTitle
  queues: SharedQueue[]
  onAdd: (queueId: string, asProposal: boolean) => Promise<void>
  onClose: () => void
}

export function AddToQueueModal({ entry, queues, onAdd, onClose }: AddToQueueModalProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [err, setErr] = useState<string | null>(null)
  const [asProposal, setAsProposal] = useState(false)

  async function handleAdd(queueId: string) {
    setSaving(queueId)
    setErr(null)
    try {
      await onAdd(queueId, asProposal)
      setDone((prev) => new Set([...prev, queueId]))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-white/10 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Add to shared queue</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white text-xl leading-none cursor-pointer">×</button>
        </div>

        {/* Entry preview */}
        <div className="flex gap-3 items-center">
          {entry.title.poster_path && (
            <img src={thumbnailUrl(entry.title.poster_path)} alt="" className="w-10 h-[60px] object-cover rounded-lg flex-shrink-0" />
          )}
          <p className="font-medium text-white text-sm">{entry.title.title}</p>
        </div>

        {/* Propose toggle */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={asProposal}
            onChange={(e) => setAsProposal(e.target.checked)}
            className="mt-0.5 rounded border border-white/20 bg-white/5 accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-xs text-[var(--text-secondary)] leading-snug">
            Propose for approval — others can approve, shelf, or reject it
          </span>
        </label>

        {queues.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-2">
            You don't have any shared queues yet. Create one first.
          </p>
        ) : (
          <div className="space-y-2">
            {queues.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-white">{q.name}</span>
                {done.has(q.id) ? (
                  <span className="text-xs text-green-400 font-medium">Added ✓</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving === q.id}
                    onClick={() => handleAdd(q.id)}
                  >
                    {saving === q.id ? 'Adding…' : asProposal ? 'Propose' : 'Add'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {err && <p className="text-sm text-red-400">{err}</p>}

        <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}
