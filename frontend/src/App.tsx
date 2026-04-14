import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { AuthContext } from './hooks/useAuth'
import type { Profile } from './types'
import { CURRENT_POLICY_VERSION } from './types'
import ConsentScreen from './components/ui/ConsentScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Admin from './pages/Admin'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Password reset page (handles Supabase recovery redirect) ──
function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setSaving(false); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-semibold text-[#f5f5f5] mb-8">QueShare</h1>
      <div className="w-full max-w-sm bg-[#141414] border border-white/8 rounded-2xl p-6">
        {done ? (
          <div className="text-center">
            <p className="text-green-400 font-semibold text-sm">Password updated!</p>
            <p className="text-xs text-[#a0a0a0] mt-1">You can now sign in with your new password.</p>
            <a href="/login" className="mt-4 inline-block text-xs text-indigo-400 hover:text-indigo-300">
              Go to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-semibold text-[#f5f5f5] text-sm">Set a new password</h2>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">New password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                minLength={6} required autoFocus
                className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Confirm password</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                minLength={6} required
                className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Auth guard for protected routes ──────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <Spinner />
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Root app — manages auth session + profile state ──────────
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null)

  const SESSION_CONSENT_KEY = `consent_accepted_${CURRENT_POLICY_VERSION}`

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data as Profile)
      const accepted = !!data.consent_accepted_at
      if (accepted) sessionStorage.setItem(SESSION_CONSENT_KEY, '1')
      setConsentAccepted(accepted)
    } else {
      setConsentAccepted(false)
    }
    setProfileReady(true)
  }, [SESSION_CONSENT_KEY])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [user, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setProfileReady(false)
    setConsentAccepted(null)
    sessionStorage.removeItem(SESSION_CONSENT_KEY)
  }, [SESSION_CONSENT_KEY])

  useEffect(() => {
    const cachedConsent = sessionStorage.getItem(SESSION_CONSENT_KEY) === '1'

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      setAuthReady(true)
      if (u) {
        if (cachedConsent) setConsentAccepted(true)
        loadProfile(u.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setIsRecovery(true); return }
      if (event === 'USER_UPDATED') { setIsRecovery(false); return }

      const u = session?.user ?? null
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setProfileReady(false)
        setConsentAccepted(null)
        sessionStorage.removeItem(SESSION_CONSENT_KEY)
      } else if (u) {
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && !profileReady) loadProfile(user.id)
  }, [user, profileReady, loadProfile])

  if (isRecovery) return <PasswordResetPage />
  if (!authReady) return <Spinner />

  return (
    <AuthContext.Provider value={{ user, profile, authReady, profileReady, signOut, refreshProfile }}>
      {/* Consent gate — shown as an overlay for users who haven't accepted yet */}
      {user && profileReady && consentAccepted === false && (
        <ConsentScreen
          userId={user.id}
          onAccepted={() => {
            sessionStorage.setItem(SESSION_CONSENT_KEY, '1')
            setConsentAccepted(true)
            refreshProfile()
          }}
        />
      )}

      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />

          {/* Catch-all → home (auth guard will redirect to /login if needed) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
