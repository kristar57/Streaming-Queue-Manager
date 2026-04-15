import { Link } from 'react-router-dom'

export type NavPage = 'list' | 'queue' | 'browse' | 'activity' | 'profile'

interface Props {
  activePage: NavPage
  onNavigate: (page: NavPage) => void
  activityCount: number
  profile: { display_name: string; is_admin?: boolean; can_invite?: boolean } | null
  onSignOut: () => void
  onInvite?: () => void
  onStreamingServices: () => void
  subscriptionCount?: number
  /** Rendered in the desktop topbar only (e.g. queue chip) */
  headerExtra?: React.ReactNode
  children: React.ReactNode
}

// Core pages — shown in both desktop sidebar and mobile bottom nav
const NAV_CORE: { id: NavPage; icon: string; label: string; desc: string }[] = [
  { id: 'list',     icon: '☰',  label: 'My List',  desc: 'Your personal watchlist — movies and shows you\'re tracking' },
  { id: 'queue',    icon: '▤',  label: 'Queues',   desc: 'Shared queues — propose titles and decide what to watch with others' },
  { id: 'browse',   icon: '⊞',  label: 'For You',  desc: 'Personalised recommendations based on your ratings and watch history' },
  { id: 'activity', icon: '📥', label: 'Inbox',    desc: 'Friend recommendations and shared queue activity' },
]

const PAGE_LABELS: Record<NavPage, string> = {
  list:     'My List',
  queue:    'Shared Queues',
  browse:   'For You',
  activity: 'Inbox',
  profile:  'Profile',
}

function Logo() {
  return (
    <span className="font-bold tracking-tight">
      Que<span className="text-[var(--accent)]">Share</span>
    </span>
  )
}

export function AppShell({
  activePage,
  onNavigate,
  activityCount,
  profile,
  onSignOut,
  onInvite,
  onStreamingServices,
  subscriptionCount,
  headerExtra,
  children,
}: Props) {
  const initial = profile?.display_name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white flex">

      {/* ── Sidebar (lg+) ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[180px] bg-[var(--bg-card)] border-r border-white/10 z-40">

        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-[13px] border-b border-white/10">
          <span className="text-[15px]"><Logo /></span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-3 overflow-y-auto">
          {NAV_CORE.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer relative ${
                  activePage === item.id
                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base w-5 text-center leading-none">{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'activity' && activityCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[var(--accent)] text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {activityCount}
                  </span>
                )}
              </button>
              {/* Hover tooltip */}
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-52 px-3 py-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <p className="text-xs font-medium text-white mb-0.5">{item.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}

          {/* Streaming Services */}
          <div className="relative group">
            <button
              onClick={onStreamingServices}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            >
              <span className="text-base w-5 text-center leading-none">📺</span>
              <span>Streaming</span>
              {subscriptionCount !== undefined && subscriptionCount > 0 && (
                <span className="ml-auto text-[9px] text-[var(--text-secondary)] opacity-60">{subscriptionCount}</span>
              )}
            </button>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-52 px-3 py-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <p className="text-xs font-medium text-white mb-0.5">Streaming Services</p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">Manage your subscriptions so we can highlight what's available to you</p>
            </div>
          </div>

          {/* Invite (conditional) */}
          {onInvite && (
            <div className="relative group">
              <button
                onClick={onInvite}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              >
                <span className="text-base w-5 text-center leading-none">✉</span>
                <span>Invite</span>
              </button>
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 w-52 px-3 py-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <p className="text-xs font-medium text-white mb-0.5">Invite Someone</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">Send an invite link for someone to join QueShare</p>
              </div>
            </div>
          )}
        </nav>

        {/* Bottom: admin link + user block */}
        <div className="border-t border-white/10 p-2 space-y-0.5">
          {profile?.is_admin && (
            <Link
              to="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="text-base w-5 text-center leading-none">🛡</span>
              <span>Admin</span>
            </Link>
          )}
          <button
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
              activePage === 'profile'
                ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)]'
                : 'bg-white/10 border-white/15 text-white'
            }`}>
              {initial}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-medium text-white truncate">{profile?.display_name}</div>
              <button
                onClick={(e) => { e.stopPropagation(); onSignOut() }}
                className="text-[10px] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Right of sidebar ───────────────────────────── */}
      <div className="flex-1 lg:ml-[180px] flex flex-col min-h-screen">

        {/* Desktop topbar (lg+) */}
        <header className="hidden lg:flex items-center h-12 px-6 border-b border-white/10 bg-[var(--bg-card)]/60 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
          <span className="text-sm font-semibold text-white">{PAGE_LABELS[activePage]}</span>
          <div className="flex-1" />
          {headerExtra}
        </header>

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-white/10 flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-1 px-4 h-12">
            <Logo />
            <div className="flex-1" />
            <button
              onClick={onStreamingServices}
              className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              title="Streaming Services"
            >
              📺
            </button>
            {onInvite && (
              <button
                onClick={onInvite}
                className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                title="Invite someone"
              >
                ✉
              </button>
            )}
            {profile?.is_admin && (
              <Link
                to="/admin"
                className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                title="Admin"
              >
                🛡
              </Link>
            )}
            <button
              onClick={() => onNavigate('activity')}
              className={`relative p-2 transition-colors cursor-pointer ${activePage === 'activity' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
              title="Inbox"
            >
              🔔
              {activityCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-[var(--accent)] text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                  {activityCount}
                </span>
              )}
            </button>
            <button
              onClick={onSignOut}
              className="px-2 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-[72px] lg:pb-6">
          {children}
        </main>

        {/* Mobile / tablet bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-md border-t border-white/10 h-[60px]">
          <div className="flex items-stretch h-full px-1">
            {NAV_CORE.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative rounded-lg mx-0.5 my-1.5 transition-colors cursor-pointer ${
                  activePage === item.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {activePage === item.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[var(--accent)]" />
                )}
                {item.id === 'activity' && activityCount > 0 ? (
                  <span className="relative">
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full bg-[var(--accent)] text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                      {activityCount}
                    </span>
                  </span>
                ) : (
                  <span className="text-base leading-none">{item.icon}</span>
                )}
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              </button>
            ))}

            {/* Profile slot (replaces Settings) */}
            <button
              onClick={() => onNavigate('profile')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative rounded-lg mx-0.5 my-1.5 transition-colors cursor-pointer ${
                activePage === 'profile' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {activePage === 'profile' && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[var(--accent)]" />
              )}
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold leading-none ${
                activePage === 'profile'
                  ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)]'
                  : 'bg-white/10 border-white/20 text-[var(--text-secondary)]'
              }`}>
                {initial}
              </span>
              <span className="text-[9px] font-medium tracking-wide">Profile</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  )
}
