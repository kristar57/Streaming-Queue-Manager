import type { FilterState, EntryStatus, TitleType, EntryPriority, SortField } from '../../types'

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
  { value: 'anticipated',   label: 'Anticipated' },
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

const SORT_OPTS: { value: SortField; label: string }[] = [
  { value: 'updated_at',  label: 'Recently updated' },
  { value: 'created_at',  label: 'Date added' },
  { value: 'title',       label: 'Title A–Z' },
  { value: 'tmdb_rating', label: 'Rating' },
  { value: 'priority',    label: 'Priority' },
]

export function FilterBar({ filter, availableGenres, availableViewers, onChange }: FilterBarProps) {
  const chip = (
    active: boolean,
    label: string,
    onClick: () => void
  ) => (
    <button
      key={label}
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

  return (
    <div className="space-y-3 pb-4">
      {/* Free-text search */}
      <input
        type="search"
        value={filter.search}
        onChange={(e) => onChange({ ...filter, search: e.target.value })}
        placeholder="Filter by title…"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
      />

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTS.map((o) =>
          chip(
            filter.statuses.includes(o.value),
            o.label,
            () => onChange({ ...filter, statuses: toggle(filter.statuses, o.value) })
          )
        )}
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_OPTS.map((o) =>
          chip(
            filter.types.includes(o.value),
            o.label,
            () => onChange({ ...filter, types: toggle(filter.types, o.value) })
          )
        )}

        {/* Priority chips */}
        {PRIORITY_OPTS.map((o) =>
          chip(
            filter.priorities.includes(o.value),
            o.label + ' priority',
            () => onChange({ ...filter, priorities: toggle(filter.priorities, o.value) })
          )
        )}
      </div>

      {/* Viewer chips */}
      {availableViewers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableViewers.map((v) =>
            chip(
              filter.viewerIds.includes(v.id),
              v.display_name,
              () => onChange({ ...filter, viewerIds: toggle(filter.viewerIds, v.id) })
            )
          )}
        </div>
      )}

      {/* Genre chips */}
      {availableGenres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableGenres.map((g) =>
            chip(
              filter.genres.includes(g),
              g,
              () => onChange({ ...filter, genres: toggle(filter.genres, g) })
            )
          )}
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">Sort:</span>
        <select
          value={filter.sortField}
          onChange={(e) => onChange({ ...filter, sortField: e.target.value as SortField })}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent)] cursor-pointer"
        >
          {SORT_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#1a1a2e]">
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onChange({ ...filter, sortDir: filter.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-2 py-1 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
          title="Toggle sort direction"
        >
          {filter.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  )
}
