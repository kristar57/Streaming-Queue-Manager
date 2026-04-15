import { useState } from 'react'
import type { FilterState, EntryStatus, TitleType, EntryPriority } from '../../types'

interface FilterBarProps {
  filter: FilterState
  availableGenres: string[]
  availableViewers: { id: string; display_name: string }[]
  onChange: (f: FilterState) => void
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

const STATUS_OPTS: { value: EntryStatus; label: string }[] = [
  { value: 'watching',      label: 'Watching' },
  { value: 'want_to_watch', label: 'Up next' },
  { value: 'upcoming',      label: 'Upcoming' },
  { value: 'watched',       label: 'Watched' },
]

const TYPE_OPTS: { value: TitleType; label: string }[] = [
  { value: 'movie', label: 'Movies' },
  { value: 'show',  label: 'Shows' },
]

const PRIORITY_OPTS: { value: EntryPriority; label: string }[] = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
          : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] opacity-50 mb-1.5">{children}</p>
}

export function FilterBar({ filter, availableGenres, availableViewers, onChange }: FilterBarProps) {
  const [genresOpen, setGenresOpen] = useState(false)

  const hasAnyFilter =
    filter.search || filter.statuses.length || filter.types.length ||
    filter.priorities.length || filter.viewerIds.length || filter.genres.length

  function clearAll() {
    onChange({ ...filter, search: '', statuses: [], types: [], priorities: [], viewerIds: [], genres: [] })
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Search */}
      <div>
        <SectionLabel>Search</SectionLabel>
        <input
          type="search"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Filter by title…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Status */}
      <div>
        <SectionLabel>Status</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={filter.statuses.includes(o.value)}
              label={o.label}
              onClick={() => onChange({ ...filter, statuses: toggle(filter.statuses, o.value) })}
            />
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <SectionLabel>Type</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={filter.types.includes(o.value)}
              label={o.label}
              onClick={() => onChange({ ...filter, types: toggle(filter.types, o.value) })}
            />
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <SectionLabel>Priority</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTS.map((o) => (
            <Chip
              key={o.value}
              active={filter.priorities.includes(o.value)}
              label={o.label}
              onClick={() => onChange({ ...filter, priorities: toggle(filter.priorities, o.value) })}
            />
          ))}
        </div>
      </div>

      {/* Viewer */}
      {availableViewers.length > 0 && (
        <div>
          <SectionLabel>Added by</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {availableViewers.map((v) => (
              <Chip
                key={v.id}
                active={filter.viewerIds.includes(v.id)}
                label={v.display_name}
                onClick={() => onChange({ ...filter, viewerIds: toggle(filter.viewerIds, v.id) })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Genres — collapsible */}
      {availableGenres.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setGenresOpen((v) => !v)}
            className="flex items-center gap-1 cursor-pointer mb-1.5"
          >
            <SectionLabel>Genre</SectionLabel>
            <span className="text-[10px] text-[var(--text-secondary)] opacity-50 -mt-1.5">{genresOpen ? '▲' : '▼'}</span>
            {filter.genres.length > 0 && (
              <span className="text-[10px] text-[var(--accent)] -mt-1.5">({filter.genres.length})</span>
            )}
          </button>
          {genresOpen && (
            <div className="flex flex-wrap gap-1.5">
              {availableGenres.map((g) => (
                <Chip
                  key={g}
                  active={filter.genres.includes(g)}
                  label={g}
                  onClick={() => onChange({ ...filter, genres: toggle(filter.genres, g) })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear all */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors underline underline-offset-2 cursor-pointer"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
