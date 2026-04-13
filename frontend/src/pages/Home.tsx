import { useAuth } from '../hooks/useAuth'

// Phase 1 placeholder — full watchlist UI built in Phase 2
export default function Home() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-[#f5f5f5] mb-2">QueShare</h1>
      <p className="text-[#a0a0a0] text-sm mb-1">
        Welcome, <span className="text-[#f5f5f5]">{profile?.display_name ?? '…'}</span>
      </p>
      <p className="text-[#555555] text-xs mb-8">Phase 2 watchlist coming soon.</p>
      <button
        onClick={signOut}
        className="text-xs text-[#555555] hover:text-[#a0a0a0] transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
