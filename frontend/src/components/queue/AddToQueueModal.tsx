import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import type { WatchlistEntryWithTitle, SharedQueue } from '../../types'

interface AddToQueueModalProps {
  entry: WatchlistEntryWithTitle
  queues: SharedQueue[]
  onAdd: (queueId: string, asProposal: boolean) => Promise<void>
  onClose: () => void
}

export function AddToQueueModal({ entry, queues, onAdd, onClose }: AddToQueueModalProps) {
  const [selectedQueue, setSelectedQueue] = useState<SharedQueue | null>(
    queues.length === 1 ? queues[0] : null
  )
  const [saving, setSaving] = useState<'add' | 'propose' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleAction(asProposal: boolean) {
    if (!selectedQueue) return
    setSaving(asProposal ? 'propose' : 'add')
    setErr(null)
    try {
      await onAdd(selectedQueue.id, asProposal)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add')
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

        {/* Queue selection — shown only when there are multiple queues */}
        {queues.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--text-secondary)]">Choose a queue</p>
            {queues.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQueue(q)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                  selectedQueue?.id === q.id
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-white'
                    : 'border-white/10 text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                }`}
              >
                {q.name}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons + explanation — shown once a queue is selected */}
        {selectedQueue && (
          <div className="space-y-3">
            {queues.length > 1 && (
              <p className="text-xs text-[var(--text-secondary)]">
                Adding to <span className="text-white font-medium">{selectedQueue.name}</span>
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleAction(false)}
                disabled={!!saving}
                className="flex-1 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-opacity cursor-pointer"
              >
                {saving === 'add' ? '…' : 'Add directly'}
              </button>
              <button
                onClick={() => handleAction(true)}
                disabled={!!saving}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer border border-white/10"
              >
                {saving === 'propose' ? '…' : 'Propose'}
              </button>
            </div>

            <div className="text-xs text-[var(--text-secondary)] space-y-1 border-t border-white/10 pt-3">
              <p><span className="text-white font-medium">Add directly</span> — goes straight into the queue. Use this for shows you're already watching together or know the group wants.</p>
              <p><span className="text-white font-medium">Propose</span> — puts it up for consideration. Any member can approve it (moves to the queue) or save it to the shelf for later.</p>
            </div>
          </div>
        )}

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer border border-white/10 rounded-xl"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
