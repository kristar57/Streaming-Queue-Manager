import { useEffect, useState, useCallback } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I confusion
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}`
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
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
  created_at: string
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

// ---------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------
export default function Admin() {
  const { user, profile, profileReady } = useAuth()

  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingCodes, setLoadingCodes] = useState(true)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [expiryDays, setExpiryDays] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const appUrl = window.location.origin

  // ── Load data ────────────────────────────────────────────────
  const loadCodes = useCallback(async () => {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!data) return

    // Fetch display names for used codes
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
      .select('id, display_name, is_admin, created_at')
      .order('created_at', { ascending: true })
    setUsers((data ?? []) as UserProfile[])
  }, [])

  useEffect(() => {
    loadCodes()
    loadUsers()
  }, [loadCodes, loadUsers])

  // ── Guard ────────────────────────────────────────────────────
  if (!profileReady) return null
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />

  // ── Actions ──────────────────────────────────────────────────
  async function handleGenerate() {
    setGeneratingCode(true)
    setErr(null)
    const code = generateCode()
    const expiresAt = expiryDays
      ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
      : null

    const { error } = await supabase.from('invite_codes').insert({
      code,
      created_by: user!.id,
      expires_at: expiresAt,
    })

    if (error) {
      setErr(error.message)
    } else {
      await loadCodes()
    }
    setGeneratingCode(false)
  }

  async function handleRevoke(id: string) {
    await supabase.from('invite_codes').delete().eq('id', id)
    await loadCodes()
  }

  async function toggleAdmin(userId: string, current: boolean) {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId)
    await loadUsers()
  }

  function handleCopy(id: string, text: string) {
    copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const unusedCodes = codes.filter((c) => !c.used_by)
  const usedCodes   = codes.filter((c) => c.used_by)

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

        {/* ── Generate invite code ── */}
        <Section title="Invite codes">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Expires after (days)</label>
                <input
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="Never"
                  className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generatingCode}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {generatingCode ? 'Generating…' : 'Generate code'}
              </button>
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}

            {/* Unused codes */}
            {!loadingCodes && unusedCodes.length > 0 && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Active — share these</p>
                <div className="space-y-2">
                  {unusedCodes.map((c) => {
                    const link = `${appUrl}/register?code=${c.code}`
                    const expired = c.expires_at && new Date(c.expires_at) < new Date()
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border ${expired ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                        <span className="font-mono text-sm font-semibold text-white tracking-widest flex-shrink-0">
                          {c.code}
                        </span>
                        {c.expires_at && (
                          <span className={`text-xs flex-shrink-0 ${expired ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                            {expired ? 'Expired' : `Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => handleCopy(c.id, c.code)}
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
                        {!expired && (
                          <button
                            onClick={() => handleRevoke(c.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                        {expired && (
                          <button
                            onClick={() => handleRevoke(c.id)}
                            className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
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
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 opacity-60">
                      <span className="font-mono text-sm tracking-widest text-white">{c.code}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Used by <span className="text-white">{c.used_by_name ?? 'unknown'}</span>
                      </span>
                      <div className="flex-1" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingCodes && codes.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">
                No invite codes yet. Generate one above.
              </p>
            )}
          </div>
        </Section>

        {/* ── Users ── */}
        <Section title="Users">
          <div className="bg-[var(--bg-card)] border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{u.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                {u.is_admin && (
                  <span className="text-[10px] border border-[var(--accent)]/40 text-[var(--accent)] rounded-full px-2 py-0.5">
                    Admin
                  </span>
                )}
                {u.id !== user!.id && (
                  <button
                    onClick={() => toggleAdmin(u.id, u.is_admin)}
                    className="text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 rounded px-2.5 py-1 transition-colors cursor-pointer"
                  >
                    {u.is_admin ? 'Remove admin' : 'Make admin'}
                  </button>
                )}
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
