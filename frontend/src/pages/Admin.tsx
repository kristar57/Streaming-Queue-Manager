import { useEffect, useState, useCallback } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}`
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function buildEmailBody(code: string, appUrl: string, inviterName?: string, inviteeName?: string): string {
  const signoff = inviterName ? `— ${inviterName}` : '— The QueShare team'
  const salutation = inviteeName ? `Hi ${inviteeName},` : 'Hi,'
  return `${salutation}

${inviterName ? `${inviterName} has invited you to join` : "You've been invited to join"} QueShare — a private app for tracking and sharing what you want to watch together.

Your invite code is: ${code}

Use the link below to create your account:
${appUrl}/register?code=${code}

This code can only be used once${inviterName ? ' and was sent personally to you' : ''}.

${signoff}`
}

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface InviteCode {
  id: string
  code: string
  created_at: string
  expires_at: string | null
  used_by: string | null
  used_by_name?: string
}

interface UserProfile {
  id: string
  display_name: string
  is_admin: boolean
  can_invite: boolean
  is_disabled: boolean
  created_at: string
}

interface EmailDraft {
  toEmail: string
  code: string
  subject: string
  body: string
}

type InviteStep = 'form' | 'preview' | 'sent'

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------
export default function Admin() {
  const { user, profile, profileReady } = useAuth()

  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingCodes, setLoadingCodes] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Invite send flow
  const [inviteStep, setInviteStep] = useState<InviteStep>('form')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteeName, setInviteeName] = useState('')
  const [inviteFromName, setInviteFromName] = useState(profile?.display_name ?? '')
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<EmailDraft | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  // Code-only (no email) flow
  const [showCodeOnly, setShowCodeOnly] = useState(false)
  const [codeOnlyExpiry, setCodeOnlyExpiry] = useState('')
  const [generatingOnly, setGeneratingOnly] = useState(false)
  const [codesError, setCodesError] = useState('')

  const appUrl = window.location.origin

  // ── Load data ────────────────────────────────────────────────
  const loadCodes = useCallback(async () => {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!data) return

    const usedIds = data.filter((c) => c.used_by).map((c) => c.used_by as string)
    let nameMap: Record<string, string> = {}
    if (usedIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', usedIds)
      for (const p of profiles ?? []) nameMap[p.id] = p.display_name
    }

    setCodes(data.map((c) => ({ ...c, used_by_name: c.used_by ? nameMap[c.used_by] : undefined })))
    setLoadingCodes(false)
  }, [])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, is_admin, can_invite, is_disabled, created_at')
      .order('created_at', { ascending: true })
    setUsers((data ?? []) as UserProfile[])
  }, [])

  useEffect(() => {
    loadCodes()
    loadUsers()

    const channel = supabase
      .channel('admin_invite_codes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invite_codes' }, loadCodes)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadCodes, loadUsers])

  // ── Guard ────────────────────────────────────────────────────
  if (!profileReady) return null
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />

  // ── Invite with email ────────────────────────────────────────
  async function handleGenerateAndPreview() {
    if (!inviteEmail.trim()) return
    setGenerating(true); setCodesError('')
    try {
      const code = generateCode()
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString() // 7 days default
      await supabase.from('invite_codes').insert({ code, created_by: user!.id, expires_at: expiresAt })
      await loadCodes()
      const subject = `You're invited to QueShare`
      const body = buildEmailBody(code, appUrl, inviteFromName.trim() || profile?.display_name, inviteeName.trim() || undefined)
      setDraft({ toEmail: inviteEmail.trim(), code, subject, body })
      setInviteStep('preview')
    } catch (err) {
      setCodesError((err as { message?: string })?.message ?? 'Failed to generate code')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendEmail() {
    if (!draft) return
    setSending(true); setSendError('')
    try {
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          to_email: draft.toEmail,
          code: draft.code,
          subject: draft.subject,
          body: draft.body,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setInviteStep('sent')
    } catch (err) {
      setSendError((err as { message?: string })?.message ?? 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  function resetInviteFlow() {
    setInviteStep('form')
    setInviteEmail('')
    setInviteeName('')
    setDraft(null)
    setSendError('')
  }

  // ── Code only ────────────────────────────────────────────────
  async function handleGenerateOnly() {
    setGeneratingOnly(true); setCodesError('')
    try {
      const code = generateCode()
      const expiresAt = codeOnlyExpiry
        ? new Date(Date.now() + parseInt(codeOnlyExpiry) * 86400000).toISOString()
        : null
      await supabase.from('invite_codes').insert({ code, created_by: user!.id, expires_at: expiresAt })
      await loadCodes()
    } catch (err) {
      setCodesError((err as { message?: string })?.message ?? 'Failed to generate code')
    } finally {
      setGeneratingOnly(false)
    }
  }

  async function handleRevoke(id: string) {
    await supabase.from('invite_codes').delete().eq('id', id)
    await loadCodes()
  }

  async function toggleAdmin(userId: string, current: boolean) {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId)
    await loadUsers()
  }

  async function toggleDelegate(userId: string, current: boolean) {
    await supabase.from('profiles').update({ can_invite: !current }).eq('id', userId)
    await loadUsers()
  }

  async function toggleDisabled(userId: string, current: boolean) {
    await supabase.from('profiles').update({ is_disabled: !current }).eq('id', userId)
    await loadUsers()
  }

  function handleCopy(key: string, text: string) {
    copyText(text)
    setCopiedId(key)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const unusedCodes = codes.filter((c) => !c.used_by)
  const usedCodes   = codes.filter((c) =>  c.used_by)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Que<span className="text-[var(--accent)]">Share</span>
          </Link>
          <span className="text-[var(--text-secondary)] text-xs border border-white/10 rounded-full px-2 py-0.5">Admin</span>
          <div className="flex-1" />
          <Link to="/" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── Invite codes ── */}
        <Section title="Invite codes">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4 space-y-5">

            {/* ── Step: form ── */}
            {inviteStep === 'form' && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Send an invite</p>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateAndPreview() }}
                      placeholder="Invitee email address"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <input
                      type="text"
                      value={inviteeName}
                      onChange={(e) => setInviteeName(e.target.value)}
                      placeholder="Their name"
                      className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteFromName}
                      onChange={(e) => setInviteFromName(e.target.value)}
                      placeholder="Sent from (your name in the email)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={handleGenerateAndPreview}
                      disabled={generating || !inviteEmail.trim()}
                      className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-opacity cursor-pointer flex items-center gap-1.5"
                    >
                      {generating ? '…' : '✉ Preview'}
                    </button>
                  </div>
                </div>

                {codesError && <p className="text-sm text-red-400">{codesError}</p>}

                {/* Code-only toggle */}
                <button
                  onClick={() => setShowCodeOnly((v) => !v)}
                  className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                >
                  {showCodeOnly ? '− Hide' : '+ Generate code without email'}
                </button>

                {showCodeOnly && (
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <input
                      type="number"
                      min={1}
                      value={codeOnlyExpiry}
                      onChange={(e) => setCodeOnlyExpiry(e.target.value)}
                      placeholder="Expiry in days (optional)"
                      className="w-44 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={handleGenerateOnly}
                      disabled={generatingOnly}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      {generatingOnly ? 'Generating…' : 'Generate code'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Step: preview ── */}
            {inviteStep === 'preview' && draft && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Preview — looks good?</p>

                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">To</label>
                    <input
                      type="text" value={draft.toEmail} readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] cursor-default"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Subject</label>
                    <input
                      type="text"
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Body</label>
                    <textarea
                      rows={10}
                      value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
                    />
                  </div>
                </div>

                {sendError && <p className="text-sm text-red-400">{sendError}</p>}

                <div className="flex gap-2 justify-end">
                  <button onClick={resetInviteFlow} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending}
                    className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-opacity cursor-pointer flex items-center gap-1.5"
                  >
                    {sending ? '…' : '↗ Send invite'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: sent ── */}
            {inviteStep === 'sent' && draft && (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-400">✓ Invite sent to {draft.toEmail}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Code <span className="font-mono text-white tracking-widest">{draft.code}</span> has been generated and the email is on its way.
                  </p>
                </div>
                <button
                  onClick={resetInviteFlow}
                  className="text-sm text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer"
                >
                  + Send another invite
                </button>
              </div>
            )}

            {/* ── Active codes ── */}
            {!loadingCodes && unusedCodes.length > 0 && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Active codes</p>
                <div className="space-y-2">
                  {unusedCodes.map((c) => {
                    const link = `${appUrl}/register?code=${c.code}`
                    const expired = c.expires_at && new Date(c.expires_at) < new Date()
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border flex-wrap ${expired ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                        <span className="font-mono text-sm font-semibold text-white tracking-widest">{c.code}</span>
                        {c.expires_at && (
                          <span className={`text-xs ${expired ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                            {expired ? 'Expired' : `Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => handleCopy(c.id + 'code', c.code)}
                          className="text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 rounded px-2 py-1 transition-colors cursor-pointer"
                        >
                          {copiedId === c.id + 'code' ? '✓ Copied' : 'Copy code'}
                        </button>
                        <button
                          onClick={() => handleCopy(c.id + 'link', link)}
                          className="text-xs text-[var(--accent)] hover:opacity-80 border border-[var(--accent)]/30 rounded px-2 py-1 transition-opacity cursor-pointer"
                        >
                          {copiedId === c.id + 'link' ? '✓ Copied' : 'Copy link'}
                        </button>
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Used codes ── */}
            {usedCodes.length > 0 && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Used</p>
                <div className="space-y-1.5">
                  {usedCodes.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 opacity-60">
                      <span className="font-mono text-sm tracking-widest text-white">{c.code}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Used by <span className="text-white">{c.used_by_name ?? 'unknown'}</span>
                      </span>
                      <div className="flex-1" />
                      <span className="text-xs text-[var(--text-secondary)]">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingCodes && codes.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">No invite codes yet.</p>
            )}
          </div>
        </Section>

        {/* ── Users ── */}
        <Section title="Users">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3 flex-wrap ${u.is_disabled ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{u.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                    {u.is_disabled && <span className="ml-2 text-red-400">· Disabled</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {u.is_admin && (
                    <span className="text-[10px] border border-[var(--accent)]/40 text-[var(--accent)] rounded-full px-2 py-0.5">
                      Admin
                    </span>
                  )}
                  {u.can_invite && !u.is_admin && (
                    <span className="text-[10px] border border-indigo-400/40 text-indigo-400 rounded-full px-2 py-0.5">
                      Delegate
                    </span>
                  )}
                  {u.id !== user!.id && (
                    <>
                      <button
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                        className="text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 rounded px-2.5 py-1 transition-colors cursor-pointer"
                      >
                        {u.is_admin ? 'Remove admin' : 'Make admin'}
                      </button>
                      {!u.is_admin && (
                        <button
                          onClick={() => toggleDelegate(u.id, u.can_invite)}
                          className="text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 rounded px-2.5 py-1 transition-colors cursor-pointer"
                        >
                          {u.can_invite ? 'Remove delegate' : 'Make delegate'}
                        </button>
                      )}
                      <button
                        onClick={() => toggleDisabled(u.id, u.is_disabled)}
                        className={`text-xs border rounded px-2.5 py-1 transition-colors cursor-pointer ${
                          u.is_disabled
                            ? 'text-green-400 border-green-500/30 hover:text-green-300'
                            : 'text-red-400 border-red-500/20 hover:text-red-300'
                        }`}
                      >
                        {u.is_disabled ? 'Enable' : 'Disable'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-6">No users yet.</p>
            )}
          </div>
        </Section>

      </main>
    </div>
  )
}
