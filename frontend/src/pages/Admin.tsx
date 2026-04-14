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
  can_delegate: boolean
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

// Role helpers
// Sponsor  = can_invite, no can_delegate
// Delegate = can_invite + can_delegate (can also enable others to invite)
type UserRole = 'none' | 'sponsor' | 'delegate'

function getRole(u: UserProfile): UserRole {
  if (u.can_delegate) return 'delegate'
  if (u.can_invite) return 'sponsor'
  return 'none'
}

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

function RoleBadge({ role, isAdmin }: { role: UserRole; isAdmin: boolean }) {
  if (isAdmin) return (
    <span className="text-[10px] border border-[var(--accent)]/40 text-[var(--accent)] rounded-full px-2 py-0.5">Admin</span>
  )
  if (role === 'delegate') return (
    <span className="text-[10px] border border-indigo-400/40 text-indigo-400 rounded-full px-2 py-0.5">Delegate</span>
  )
  if (role === 'sponsor') return (
    <span className="text-[10px] border border-sky-400/40 text-sky-400 rounded-full px-2 py-0.5">Sponsor</span>
  )
  return null
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

  // User role buttons — track which userId is actively updating
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [updatingDisabledId, setUpdatingDisabledId] = useState<string | null>(null)
  const [roleError, setRoleError] = useState('')

  // Grant admin — separate section
  const [adminSearch, setAdminSearch] = useState('')
  const [adminTarget, setAdminTarget] = useState<UserProfile | null>(null)
  const [adminConfirmPending, setAdminConfirmPending] = useState(false)
  const [grantingAdmin, setGrantingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')

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
      .select('id, display_name, is_admin, can_invite, can_delegate, is_disabled, created_at')
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
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
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
        body: { to_email: draft.toEmail, code: draft.code, subject: draft.subject, body: draft.body },
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

  // ── Role management ──────────────────────────────────────────
  async function setRole(userId: string, role: UserRole) {
    setUpdatingRoleId(userId); setRoleError('')
    const patch =
      role === 'delegate' ? { can_invite: true, can_delegate: true } :
      role === 'sponsor'  ? { can_invite: true, can_delegate: false } :
                            { can_invite: false, can_delegate: false }
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    if (error) setRoleError(error.message)
    await loadUsers()
    setUpdatingRoleId(null)
  }

  async function toggleDisabled(userId: string, current: boolean) {
    setUpdatingDisabledId(userId)
    const { error } = await supabase.from('profiles').update({ is_disabled: !current }).eq('id', userId)
    if (error) setRoleError(error.message)
    await loadUsers()
    setUpdatingDisabledId(null)
  }

  // ── Grant admin ──────────────────────────────────────────────
  function handleAdminSearch() {
    const q = adminSearch.trim().toLowerCase()
    if (!q) { setAdminError('Enter a name to search.'); return }
    const match = users.find((u) => u.display_name.toLowerCase().includes(q) && u.id !== user!.id)
    if (!match) { setAdminError('No user found with that name.'); setAdminTarget(null); return }
    setAdminError('')
    setAdminTarget(match)
    setAdminConfirmPending(false)
  }

  async function handleGrantAdmin() {
    if (!adminTarget) return
    setGrantingAdmin(true); setAdminError(''); setAdminSuccess('')
    const { error } = await supabase.from('profiles').update({ is_admin: true, can_invite: true, can_delegate: true }).eq('id', adminTarget.id)
    if (error) { setAdminError(error.message); setGrantingAdmin(false); return }
    await loadUsers()
    setAdminSuccess(`${adminTarget.display_name} is now an admin.`)
    setAdminTarget(null)
    setAdminSearch('')
    setAdminConfirmPending(false)
    setGrantingAdmin(false)
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
                      placeholder="Sent from (your name)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      onClick={handleGenerateAndPreview}
                      disabled={generating || !inviteEmail.trim()}
                      className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-opacity cursor-pointer"
                    >
                      {generating ? '…' : '✉ Preview'}
                    </button>
                  </div>
                </div>
                {codesError && <p className="text-sm text-red-400">{codesError}</p>}

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

            {inviteStep === 'preview' && draft && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Preview — looks good?</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">To</label>
                    <input type="text" value={draft.toEmail} readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] cursor-default" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Subject</label>
                    <input type="text" value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Body</label>
                    <textarea rows={10} value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)] resize-none" />
                  </div>
                </div>
                {sendError && <p className="text-sm text-red-400">{sendError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={resetInviteFlow} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">Cancel</button>
                  <button onClick={handleSendEmail} disabled={sending}
                    className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-opacity cursor-pointer">
                    {sending ? '…' : '↗ Send invite'}
                  </button>
                </div>
              </div>
            )}

            {inviteStep === 'sent' && draft && (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-400">✓ Invite sent to {draft.toEmail}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Code <span className="font-mono text-white tracking-widest">{draft.code}</span> has been generated and the email is on its way.
                  </p>
                </div>
                <button onClick={resetInviteFlow} className="text-sm text-[var(--accent)] hover:opacity-80 transition-opacity cursor-pointer">
                  + Send another invite
                </button>
              </div>
            )}

            {/* Active codes */}
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
                        <button onClick={() => handleCopy(c.id + 'code', c.code)}
                          className="text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 rounded px-2 py-1 transition-colors cursor-pointer">
                          {copiedId === c.id + 'code' ? '✓ Copied' : 'Copy code'}
                        </button>
                        <button onClick={() => handleCopy(c.id + 'link', link)}
                          className="text-xs text-[var(--accent)] hover:opacity-80 border border-[var(--accent)]/30 rounded px-2 py-1 transition-opacity cursor-pointer">
                          {copiedId === c.id + 'link' ? '✓ Copied' : 'Copy link'}
                        </button>
                        <button onClick={() => handleRevoke(c.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer">
                          Revoke
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Used codes */}
            {usedCodes.length > 0 && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Used</p>
                <div className="space-y-1.5">
                  {usedCodes.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-white/3 opacity-60">
                      <span className="font-mono text-sm tracking-widest text-white line-through">{c.code}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Used by <span className="text-white no-underline">{c.used_by_name ?? 'unknown'}</span>
                      </span>
                      <div className="flex-1" />
                      <span className="text-xs text-[var(--text-secondary)] border border-white/10 rounded px-2 py-0.5">used</span>
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
          {roleError && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{roleError}</p>
          )}
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
            {users.map((u) => {
              const role = getRole(u)
              const isUpdatingRole = updatingRoleId === u.id
              const isUpdatingDisabled = updatingDisabledId === u.id
              const isSelf = u.id === user!.id

              return (
                <div key={u.id} className={`px-4 py-3 space-y-2 ${u.is_disabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{u.display_name}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                        {u.is_disabled && <span className="ml-2 text-red-400">· Disabled</span>}
                      </p>
                    </div>
                    <RoleBadge role={role} isAdmin={u.is_admin} />
                    {isSelf && <span className="text-[10px] text-[var(--text-secondary)]">you</span>}
                  </div>

                  {/* Role + disable controls — only for other non-admin users */}
                  {!isSelf && !u.is_admin && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs text-[var(--text-secondary)] mr-1">Role:</span>

                      {/* None */}
                      <button
                        onClick={() => setRole(u.id, 'none')}
                        disabled={isUpdatingRole || role === 'none'}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer disabled:cursor-default ${
                          role === 'none'
                            ? 'border-white/20 text-white bg-white/10'
                            : 'border-white/10 text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                        } disabled:opacity-60`}
                      >
                        {isUpdatingRole && role !== 'none' ? '…' : 'None'}
                      </button>

                      {/* Sponsor */}
                      <button
                        onClick={() => setRole(u.id, 'sponsor')}
                        disabled={isUpdatingRole || role === 'sponsor'}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer disabled:cursor-default ${
                          role === 'sponsor'
                            ? 'border-sky-400/50 text-sky-400 bg-sky-400/10'
                            : 'border-white/10 text-[var(--text-secondary)] hover:text-sky-400 hover:border-sky-400/30'
                        } disabled:opacity-60`}
                      >
                        {isUpdatingRole && role !== 'sponsor' ? '…' : 'Sponsor'}
                      </button>

                      {/* Delegate */}
                      <button
                        onClick={() => setRole(u.id, 'delegate')}
                        disabled={isUpdatingRole || role === 'delegate'}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer disabled:cursor-default ${
                          role === 'delegate'
                            ? 'border-indigo-400/50 text-indigo-400 bg-indigo-400/10'
                            : 'border-white/10 text-[var(--text-secondary)] hover:text-indigo-400 hover:border-indigo-400/30'
                        } disabled:opacity-60`}
                      >
                        {isUpdatingRole && role !== 'delegate' ? '…' : 'Delegate'}
                      </button>

                      <div className="flex-1" />

                      {/* Disable / Enable */}
                      <button
                        onClick={() => toggleDisabled(u.id, u.is_disabled)}
                        disabled={isUpdatingDisabled}
                        className={`text-xs border rounded px-2.5 py-1 transition-colors cursor-pointer disabled:opacity-50 ${
                          u.is_disabled
                            ? 'text-green-400 border-green-500/30 hover:text-green-300'
                            : 'text-red-400 border-red-500/20 hover:text-red-300'
                        }`}
                      >
                        {isUpdatingDisabled ? '…' : u.is_disabled ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {users.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-6">No users yet.</p>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] px-1">
            <strong className="text-white">Sponsor</strong> — can send invites. &nbsp;
            <strong className="text-white">Delegate</strong> — can invite and enable others to invite.
          </p>
        </Section>

        {/* ── Grant admin — intentional, separate action ── */}
        <Section title="Grant admin access">
          <div className="bg-[var(--bg-card)] border border-amber-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Admin access gives full control over users and invite codes. This action should be rare and deliberate.
            </p>

            {adminSuccess && (
              <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{adminSuccess}</p>
            )}

            {!adminConfirmPending ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => { setAdminSearch(e.target.value); setAdminTarget(null); setAdminError(''); setAdminSuccess('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdminSearch() }}
                  placeholder="Search user by name…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={handleAdminSearch}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Find user
                </button>
              </div>
            ) : null}

            {adminError && <p className="text-xs text-red-400">{adminError}</p>}

            {adminTarget && !adminConfirmPending && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{adminTarget.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Joined {new Date(adminTarget.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setAdminConfirmPending(true)}
                  className="px-3 py-1.5 text-xs text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  Grant admin →
                </button>
              </div>
            )}

            {adminTarget && adminConfirmPending && (
              <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/30">
                <p className="text-sm text-white">
                  Are you sure you want to make <strong>{adminTarget.display_name}</strong> an admin?
                  This grants full access to all admin controls.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAdminConfirmPending(false); setAdminTarget(null); setAdminSearch('') }}
                    className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantAdmin}
                    disabled={grantingAdmin}
                    className="px-4 py-1.5 text-sm text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 disabled:opacity-50 transition-colors cursor-pointer font-semibold"
                  >
                    {grantingAdmin ? 'Granting…' : 'Yes, make admin'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

      </main>
    </div>
  )
}
