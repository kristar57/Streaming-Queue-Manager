import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { WatchlistEntryWithTitle, EntryStatus, EntryPriority } from '../../types'

interface EditEntryFormProps {
  entry: WatchlistEntryWithTitle
  onSubmit: (fields: {
    status: EntryStatus
    priority: EntryPriority
    notes: string
    is_caught_up: boolean
    current_season: number | null
    current_episode: number | null
  }) => Promise<void>
  onCancel: () => void
}

const STATUS_OPTS: { value: EntryStatus; label: string }[] = [
  { value: 'want_to_watch', label: 'Up next' },
  { value: 'watching',      label: 'Watching' },
  { value: 'watched',       label: 'Watched' },
]

const PRIORITY_OPTS: { value: EntryPriority; label: string }[] = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

export function EditEntryForm({ entry, onSubmit, onCancel }: EditEntryFormProps) {
  const { title } = entry
  const [status, setStatus] = useState<EntryStatus>(entry.status)
  const [priority, setPriority] = useState<EntryPriority>(entry.priority)
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [isCaughtUp, setIsCaughtUp] = useState(entry.is_caught_up)
  const [currentSeason, setCurrentSeason] = useState(entry.current_season ?? '')
  const [currentEpisode, setCurrentEpisode] = useState(entry.current_episode ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isShow = title.type === 'show'
  const year = (title.release_date ?? '').slice(0, 4)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSubmit({
        status,
        priority,
        notes,
        is_caught_up: status === 'watching' && isShow ? isCaughtUp : false,
        current_season: currentSeason !== '' ? Number(currentSeason) : null,
        current_episode: currentEpisode !== '' ? Number(currentEpisode) : null,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onCancel} title="Edit entry">
      {/* Title preview */}
      <div className="flex gap-3 mb-5">
        {title.poster_path ? (
          <img
            src={thumbnailUrl(title.poster_path)}
            alt=""
            className="w-12 h-[72px] object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-[72px] bg-white/10 rounded-lg flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-white leading-tight">{title.title}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {isShow ? 'Show' : 'Movie'}
            {year ? ` · ${year}` : ''}
          </p>
          {title.genres.length > 0 && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {title.genres.slice(0, 3).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatus(o.value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
                  status === o.value
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority</label>
          <div className="flex gap-2">
            {PRIORITY_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPriority(o.value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
                  priority === o.value
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Show-specific: caught up + progress */}
        {isShow && status === 'watching' && (
          <>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCaughtUp}
                  onChange={(e) => setIsCaughtUp(e.target.checked)}
                  className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-[var(--accent)]"
                />
                <span className="text-sm text-white">Caught up (watched all available episodes)</span>
              </label>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Current season
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentSeason}
                  onChange={(e) => setCurrentSeason(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="—"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Current episode
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentEpisode}
                  onChange={(e) => setCurrentEpisode(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="—"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Recommended by, context, etc."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
