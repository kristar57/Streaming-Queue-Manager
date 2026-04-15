import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface InviteModalProps {
  inviterName: string
  inviterId: string
  onClose: () => void
}

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}`
}

function buildBody(code: string, inviterName: string, inviteeName?: string): string {
  const salutation = inviteeName ? `Hi ${inviteeName},` : 'Hi,'
  return `${salutation}

${inviterName} has invited you to join QueShare — a private app for tracking and sharing what you want to watch together.

Your invite code is: ${code}

Use the link below to create your account:
${APP_URL}/register?code=${code}

This code can only be used once and was sent personally to you.

— ${inviterName}`
}

export function InviteModal({ inviterName, inviterId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [step, setStep] = useState<'form' | 'preview' | 'sent'>('form')
  const [draft, setDraft] = useState<{ toEmail: string; code: string; subject: string; body: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handlePreview() {
    if (!email.trim()) return
    setBusy(true); setError('')
    try {
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
      const { error: dbErr } = await supabase
        .from('invite_codes')
        .insert({ code, created_by: inviterId, expires_at: expiresAt })
      if (dbErr) throw dbErr
      setDraft({
        toEmail: email.trim(),
        code,
        subject: "You're invited to QueShare",
        body: buildBody(code, inviterName, name.trim() || undefined),
      })
      setStep('preview')
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Failed to generate code')
    } finally {
      setBusy(false)
    }
  }

  async function handleSend() {
    if (!draft) return
    setSending(true); setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-invite', {
        body: { to_email: draft.toEmail, code: draft.code, subject: draft.subject, body: draft.body },
      })
      if (fnErr) throw new Error(fnErr.message ?? 'Edge function error')
      if (!data?.ok) throw new Error(data?.error ?? 'Unknown error from send-invite')
      setStep('sent')
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[var(--bg-card)] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Send an invite</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white cursor-pointer text-lg leading-none">✕</button>
        </div>

        {step === 'form' && (
          <>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Their email address"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Their name"
                  className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handlePreview}
                disabled={busy || !email.trim()}
                className="w-full py-2.5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-opacity cursor-pointer"
              >
                {busy ? '…' : '✉ Preview invite'}
              </button>
            </div>
          </>
        )}

        {step === 'preview' && draft && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Preview — looks good?</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">To</label>
                <input type="text" value={draft.toEmail} readOnly className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] cursor-default" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Body</label>
                <textarea
                  rows={8}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep('form')} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white cursor-pointer">Back</button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-opacity cursor-pointer"
              >
                {sending ? '…' : '↗ Send'}
              </button>
            </div>
          </div>
        )}

        {step === 'sent' && draft && (
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-400">✓ Invite sent to {draft.toEmail}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Code: <span className="font-mono text-white">{draft.code}</span></p>
            </div>
            <button onClick={onClose} className="text-sm text-[var(--accent)] hover:opacity-80 cursor-pointer">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}
