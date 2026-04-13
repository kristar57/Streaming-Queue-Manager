import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'reset'

export default function Login() {
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
        setResetSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Navigation handled by auth listener in App.tsx
      }
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
        {resetSent ? (
          <div className="text-center bg-[#141414] border border-white/8 rounded-2xl p-8">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-indigo-400" size={22} />
            </div>
            <h2 className="font-semibold text-[#f5f5f5] mb-2">Check your email</h2>
            <p className="text-sm text-[#a0a0a0]">
              We sent a reset link to <span className="text-[#f5f5f5]">{email}</span>. Click it to set a new password.
            </p>
            <button
              onClick={() => { setResetSent(false); setMode('login') }}
              className="mt-6 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-[#f5f5f5] text-sm">
                {mode === 'reset' ? 'Reset your password' : 'Sign in'}
              </h2>
              {mode === 'reset' && (
                <p className="text-xs text-[#a0a0a0] mt-1">
                  Enter your email and we'll send a reset link.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#555555] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Password — hidden in reset mode */}
              {mode !== 'reset' && (
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      minLength={6}
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
              )}

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
                {mode === 'reset' ? 'Send reset link' : 'Sign in'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-white/8 flex flex-col items-center gap-2.5">
              {mode === 'login' ? (
                <button
                  onClick={() => { setMode('reset'); setError('') }}
                  className="text-xs text-[#555555] hover:text-[#a0a0a0] transition-colors"
                >
                  Forgot password?
                </button>
              ) : (
                <button
                  onClick={() => { setMode('login'); setError('') }}
                  className="text-xs text-[#555555] hover:text-[#a0a0a0] transition-colors"
                >
                  Back to sign in
                </button>
              )}
              <span className="text-xs text-[#555555]">
                Have an invite code?{' '}
                <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
                  Create account
                </Link>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
