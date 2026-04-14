import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { SharedQueue } from '../../types'

interface QueueSettingsModalProps {
  queue: SharedQueue
  currentUserId: string
  onClose: () => void
  onDeleted: () => void
}

interface Member {
  user_id: string
  display_name: string
}

export function QueueSettingsModal({ queue, currentUserId, onClose, onDeleted }: QueueSettingsModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [allProfiles, setAllProfiles] = useState<{ id: string; display_name: string }[]>([])
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const isCreator = queue.created_by === currentUserId

  async function load() {
    const [{ data: memberData }, { data: profileData }] = await Promise.all([
      supabase
        .from('queue_members')
        .select('user_id, profile:profiles(display_name)')
        .eq('queue_id', queue.id),
      supabase
        .from('profiles')
        .select('id, display_name'),
    ])

    const memberList: Member[] = (memberData ?? []).map((m: any) => ({
      user_id: m.user_id,
      display_name: m.profile?.display_name ?? m.user_id,
    }))
    setMembers(memberList)

    const memberIds = new Set(memberList.map((m) => m.user_id))
    setAllProfiles((profileData ?? []).filter((p: any) => !memberIds.has(p.id)))
  }

  useEffect(() => { load() }, [queue.id])

  async function invite(userId: string) {
    setBusy(true)
    await supabase.from('queue_members').insert({ queue_id: queue.id, user_id: userId })
    await load()
    setBusy(false)
  }

  async function removeMember(userId: string) {
    setBusy(true)
    await supabase.from('queue_members').delete().eq('queue_id', queue.id).eq('user_id', userId)
    await load()
    setBusy(false)
  }

  async function deleteQueue() {
    setBusy(true)
    await supabase.from('shared_queues').delete().eq('id', queue.id)
    onDeleted()
  }

  async function leaveQueue() {
    setBusy(true)
    await supabase.from('queue_members').delete().eq('queue_id', queue.id).eq('user_id', currentUserId)
    onDeleted()
  }

  return (
    <Modal open onClose={onClose} title={`"${queue.name}" settings`}>
      <div className="space-y-5">

        {/* Current members */}
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Members</p>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 py-0.5">
                <span className="text-sm text-white flex items-center gap-2">
                  {m.display_name}
                  {m.user_id === queue.created_by && (
                    <span className="text-[10px] text-[var(--text-secondary)] border border-white/20 rounded-full px-1.5 py-0.5">creator</span>
                  )}
                </span>
                {isCreator && m.user_id !== currentUserId && (
                  <button
                    disabled={busy}
                    onClick={() => removeMember(m.user_id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
                {!isCreator && m.user_id === currentUserId && (
                  <button
                    disabled={busy}
                    onClick={leaveQueue}
                    className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Leave
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite more people */}
        {isCreator && allProfiles.length > 0 && (
          <div>
            <button
              onClick={() => setAdding((v) => !v)}
              className="text-xs font-medium text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              {adding ? '▲ Hide' : '+ Invite someone'}
            </button>
            {adding && (
              <div className="mt-2 space-y-1.5">
                {allProfiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-0.5">
                    <span className="text-sm text-white">{p.display_name}</span>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => invite(p.id)}>
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        <div className="border-t border-white/10 pt-4">
          {isCreator ? (
            confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-red-400">This will remove the queue for all members. Are you sure?</p>
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" disabled={busy} onClick={deleteQueue}>
                    Delete queue
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                Delete this queue…
              </button>
            )
          ) : (
            <button
              onClick={leaveQueue}
              disabled={busy}
              className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              Leave this queue…
            </button>
          )}
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
