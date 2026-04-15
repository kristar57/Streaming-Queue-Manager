import { Link } from 'react-router-dom'

export type NavPage = 'list' | 'queue' | 'browse' | 'activity' | 'settings'

interface Props {
  activePage: NavPage
  onNavigate: (page: NavPage) => void
  activityCount: number
  profile: { display_name: string; is_admin?: boolean; can_invite?: boolean } | null
  onSignOut: () => void
  onInvite?: () => void
  /** Rendered in the desktop topbar only (e.g. queue chip) */
  headerExtra?: React.ReactNode
  children: React.ReactNode
}

const NAV: { id: NavPage; icon: string; label: string }[] = [
  { id: 'list',     icon: '☰',  label: 'My List'  },
  { id: 'queue',    icon: '▤',  label: 'Queues'   },
  { id: 'browse',   icon: '⊞',  label: 'For You'  },
  { id: 'activity', icon: '🔔', label: 'Activity' },
  { id: 'settings', icon: '⚙',  label: 'Settings' },
]

const PAGE_LABELS: Record<NavPage, string> = {
  list:     'My List',
  queue:    'Shared Queues',
  browse:   'For You',
  activity: 'Activity',
  settings: 'Settings',
}

function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // Mobile: icon-only mark
    return <img src="/logo-icon.png" alt="QueShare" className="h-8 w-8 object-contain" />
  }
  // Desktop sidebar: text wordmark
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
  headerExtra,
  children,
}: Props) {
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
          {NAV.map((item) => (
            <button
              key={item.id}
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
          ))}
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
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{profile?.display_name}</div>
              <button
                onClick={onSignOut}
                className="text-[10px] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
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
          <div className="flex items-center gap-2 px-4 h-12">
            <Logo />
            <div className="flex-1" />
            {(profile?.is_admin || profile?.can_invite) && onInvite && (
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
              onClick={onSignOut}
              className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer text-sm"
              title="Sign out"
            >
              ↪
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
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative rounded-lg mx-0.5 my-1.5 transition-colors cursor-pointer ${
                  activePage === item.id
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {activePage === item.id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[var(--accent)]" />
                )}
                <span className="text-base leading-none">{item.icon}</span>
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                {item.id === 'activity' && activityCount > 0 && (
                  <span className="absolute top-1 right-2 min-w-[13px] h-[13px] rounded-full bg-[var(--accent)] text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {activityCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}
