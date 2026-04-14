import { useState } from 'react'
import { thumbnailUrl } from '../../lib/tmdb'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { TMDBSearchResult, EntryFormFields, EntryStatus, EntryPriority } from '../../types'

interface AddEntryFormProps {
  result: TMDBSearchResult
  genres: string[]
  onSubmit: (fields: EntryFormFields) => Promise<void>
  onCancel: () => void
}

const STATUS_OPTS: { value: EntryStatus; label: string }[] = [
  { value: 'anticipated',   label: 'Anticipated' },
  { value: 'want_to_watch', label: 'Up next' },
  { value: 'watching',      label: 'Watching' },
  { value: 'watched',       label: 'Watched' },
]

const PRIORITY_OPTS: { value: EntryPriority; label: string }[] = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

export function AddEntryForm({ result, genres, onSubmit, onCancel }: AddEntryFormProps) {
  const [status, setStatus] = useState<EntryStatus>('want_to_watch')
  const [priority, setPriority] = useState<EntryPriority>('medium')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const title = result.title ?? result.name ?? 'Unknown'
  const year = (result.release_date ?? result.first_air_date ?? '').slice(0, 4)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      await onSubmit({
        status,
        priority,
        notes,
        custom_tags: [],
        current_season: null,
        current_episode: null,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onCancel} title="Add to watchlist">
      {/* Title preview */}
      <div className="flex gap-3 mb-5">
        {result.poster_path ? (
          <img
            src={thumbnailUrl(result.poster_path)}
            alt=""
            className="w-12 h-[72px] object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-[72px] bg-white/10 rounded-lg flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-white leading-tight">{title}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {result.media_type === 'movie' ? 'Movie' : 'Show'}
            {year ? ` · ${year}` : ''}
          </p>
          {genres.length > 0 && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {genres.slice(0, 3).join(' · ')}
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
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
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
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
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
            {saving ? 'Adding…' : 'Add to watchlist'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
