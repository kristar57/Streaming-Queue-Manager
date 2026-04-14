import { useEffect, useState } from 'react'
import { getAvailableProviders, type TMDBProvider } from '../../lib/tmdb'
import type { UserSubscription } from '../../types'

interface StreamingServicesModalProps {
  subscriptions: UserSubscription[]
  subscribedIds: Set<number>
  onToggle: (provider: { provider_id: number; provider_name: string; provider_logo_path: string | null }) => Promise<void>
  onClose: () => void
}

export function StreamingServicesModal({
  subscriptions,
  subscribedIds,
  onToggle,
  onClose,
}: StreamingServicesModalProps) {
  const [providers, setProviders] = useState<TMDBProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAvailableProviders('US')
      .then(setProviders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(p: TMDBProvider) {
    setToggling(p.provider_id)
    try {
      await onToggle({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        provider_logo_path: p.logo_path ?? null,
      })
    } finally {
      setToggling(null)
    }
  }

  const filtered = providers.filter((p) =>
    !subscribedIds.has(p.provider_id) &&
    p.provider_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-[var(--bg-card)] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">My Streaming Services</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {subscriptions.length > 0
              ? `${subscriptions.length} service${subscriptions.length !== 1 ? 's' : ''} selected — titles on these will show in green`
              : 'Select the services you subscribe to'}
          </p>
        </div>

        {/* Subscribed first */}
        {subscriptions.length > 0 && (
          <div className="px-5 pt-4 pb-2 flex-shrink-0">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Subscribed</p>
            <div className="flex flex-wrap gap-2">
              {subscriptions.map((s) => (
                <button
                  key={s.provider_id}
                  onClick={() => handleToggle({ provider_id: s.provider_id, provider_name: s.provider_name, logo_path: s.provider_logo_path ?? '' } as TMDBProvider)}
                  disabled={toggling === s.provider_id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {s.provider_logo_path && (
                    <img src={`https://image.tmdb.org/t/p/w45${s.provider_logo_path}`} alt="" className="w-4 h-4 rounded-sm object-cover" />
                  )}
                  {s.provider_name}
                  <span className="opacity-60 text-[10px]">✕</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 pt-3 pb-2 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* All providers */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--text-secondary)] text-sm">Loading services…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
              {search ? `No results for "${search}"` : 'All services already selected'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map((p) => (
                <button
                  key={p.provider_id}
                  onClick={() => handleToggle(p)}
                  disabled={toggling === p.provider_id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] text-xs hover:bg-white/10 hover:text-white hover:border-white/20 transition-colors cursor-pointer disabled:opacity-50 text-left"
                >
                  {p.logo_path && (
                    <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="truncate">{p.provider_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--text-secondary)]">
            Powered by TMDB · US providers
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--accent)] hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
