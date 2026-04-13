import { useState, useEffect } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Loader2, Mail, Lock, Eye, EyeOff, User, Ticket, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Step = 'invite' | 'details' | 'done'

async function validateInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, used_by, expires_at')
    .eq('code', code)
    .single()
  if (error || !data) return false
  if (data.used_by) return false
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false
  return true
}

async function markInviteUsed(code: string, userId: string): Promise<void> {
  await supabase
    .from('invite_codes')
    .update({ used_by: userId })
    .eq('code', code)
}

export default function Register() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('code')?.toUpperCase() ?? ''

  const [step, setStep] = useState<Step>(codeFromUrl ? 'invite' : 'invite')
  const [inviteCode, setInviteCode] = useState(codeFromUrl)
  const [inviteChecking, setInviteChecking] = useState(false)
  const [inviteValid, setInviteValid] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-validate code from URL on mount
  useEffect(() => {
    if (!codeFromUrl) return
    setInviteChecking(true)
    validateInviteCode(codeFromUrl)
      .then((valid) => {
        if (valid) {
          setInviteValid(true)
          setStep('details')
        } else {
          setError('This invite link is invalid or has already been used.')
        }
      })
      .catch(() => setError('Could not check the invite code. Please try again.'))
      .finally(() => setInviteChecking(false))
  }, [codeFromUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (user) return <Navigate to="/" replace />

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inviteCode.trim().toUpperCase()
    if (!trimmed) return
    setInviteChecking(true)
    setError('')
    try {
      const valid = await validateInviteCode(trimmed)
      if (valid) {
        setInviteCode(trimmed)
        setInviteValid(true)
        setStep('details')
      } else {
        setError('That invite code is invalid, expired, or has already been used.')
      }
    } catch {
      setError('Could not check the invite code. Please try again.')
    } finally {
      setInviteChecking(false)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Display name is required.'); return }
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })
      if (error) throw error
      if (data.user) {
        await markInviteUsed(inviteCode, data.user.id).catch(() => {})
      }
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-[#f5f5f5] tracking-tight">QueShare</h1>
        <p className="text-sm text-[#555555] mt-1">Your household streaming watchlist</p>
      </div>

      <div className="w-full max-w-sm">
        {step === 'done' ? (
          <div className="text-center bg-[#141414] border border-white/8 rounded-2xl p-8">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-indigo-400" size={22} />
            </div>
            <h2 className="font-semibold text-[#f5f5f5] mb-2">Check your email</h2>
            <p className="text-sm text-[#a0a0a0]">
              We sent a confirmation link to <span className="text-[#f5f5f5]">{email}</span>. Click it to activate your account.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-xs text-indigo-400 hover:text-indigo-300"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
            {/* Invite code step */}
            {!inviteValid ? (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Ticket className="text-indigo-400" size={18} />
                  </div>
                  <p className="text-sm font-medium text-[#f5f5f5]">Invite required</p>
                  <p className="text-xs text-[#555555] mt-1">
                    QueShare is invite-only. Enter your code to create an account.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Invite Code</label>
                  <input
                    autoFocus
                    type="text"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError('') }}
                    placeholder="XXXX-XXXX"
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 tracking-widest text-center font-mono"
                  />
                </div>
                {inviteChecking && (
                  <p className="text-xs text-[#a0a0a0] text-center flex items-center justify-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" /> Checking…
                  </p>
                )}
                {error && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={inviteChecking || !inviteCode.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {inviteChecking && <Loader2 size={15} className="animate-spin" />}
                  Continue
                </button>
                <p className="text-center text-xs text-[#555555]">
                  Already have an account?{' '}
                  <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
                </p>
              </form>
            ) : (
              /* Account details step */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <h2 className="font-semibold text-[#f5f5f5] text-sm mb-1">Create your account</h2>

                {/* Invite accepted banner */}
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <Check size={13} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-green-400">
                    Invite accepted — <span className="font-mono">{inviteCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setInviteValid(false); setInviteCode(''); setStep('invite') }}
                    className="ml-auto text-[#555555] hover:text-[#a0a0a0]"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Display name */}
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">
                    Display name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Kris"
                      className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                  <p className="text-[10px] text-[#555555] mt-1 pl-1">Shown to other household members</p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-9 pr-10 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#a0a0a0]"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Create account
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
