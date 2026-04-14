import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface CreateQueueModalProps {
  currentUserId: string
  onCreated: (queueId: string) => void
  onCancel: () => void
}

export function CreateQueueModal({ currentUserId, onCreated, onCancel }: CreateQueueModalProps) {
  const [name, setName] = useState('')
  const [allProfiles, setAllProfiles] = useState<{ id: string; display_name: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name')
      .neq('id', currentUserId)
      .then(({ data }) => setAllProfiles(data ?? []))
  }, [currentUserId])

  function toggleProfile(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    setErr(null)
    try {
      const { data: queueData, error } = await supabase
        .from('shared_queues')
        .insert({ name: name.trim(), created_by: currentUserId })
        .select('id')
        .single()

      if (error) throw error
      const queueId = queueData.id as string

      // Add creator + selected members
      const members = [currentUserId, ...selectedIds].map((uid) => ({
        queue_id: queueId,
        user_id: uid,
      }))
      await supabase.from('queue_members').insert(members)

      onCreated(queueId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create queue')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onCancel} title="New shared queue">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Queue name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Watch Together, Movie Nights…"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {allProfiles.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Invite members
            </label>
            <div className="space-y-1.5">
              {allProfiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleProfile(p.id)}
                    className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-[var(--accent)]"
                  />
                  <span className="text-sm text-white">{p.display_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" disabled={!name.trim() || saving} onClick={handleCreate}>
            {saving ? 'Creating…' : 'Create queue'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
