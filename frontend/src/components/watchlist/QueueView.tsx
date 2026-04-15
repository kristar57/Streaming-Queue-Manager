import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { thumbnailUrl } from '../../lib/tmdb'
import { RatingWidget } from '../ui/RatingWidget'
import { getTitleStatusChip, formatRuntime, releaseYear } from '../../lib/titleUtils'
import type { WatchlistEntryWithTitle, EntryStatus } from '../../types'

const CHIP_COLORS = {
  blue:   'bg-blue-500/20 text-blue-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  gray:   'bg-white/10 text-[var(--text-secondary)]',
  red:    'bg-red-500/20 text-red-300',
}

function SortableRow({
  entry,
  currentUserId,
  onStatusChange,
  onEdit,
  onRate,
  onDelete,
  onViewDetail,
}: {
  entry: WatchlistEntryWithTitle
  currentUserId?: string
  onStatusChange: (id: string, status: EntryStatus) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onRate: (entry: WatchlistEntryWithTitle, rating: -1 | 1 | 2 | 3 | null) => void
  onDelete: (id: string) => void
  onViewDetail: (entry: WatchlistEntryWithTitle) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const { title } = entry
  const statusChip = getTitleStatusChip(title)
  const runtime    = formatRuntime(title)
  const year       = releaseYear(title)

  const nextStatus: Partial<Record<EntryStatus, { label: string; status: EntryStatus }>> = {
    want_to_watch: { label: 'Start watching', status: 'watching' },
    watching:      { label: 'Mark watched',   status: 'watched' },
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
    >
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        <button
          className="self-center flex-shrink-0 text-[var(--text-secondary)] hover:text-white cursor-grab active:cursor-grabbing touch-none p-1"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>

        {/* Poster */}
        <button onClick={() => onViewDetail(entry)} className="cursor-pointer flex-shrink-0 mt-0.5">
          {title.poster_path ? (
            <img src={thumbnailUrl(title.poster_path)} alt="" className="w-9 h-[54px] object-cover rounded hover:opacity-80 transition-opacity" />
          ) : (
            <div className="w-9 h-[54px] bg-white/10 rounded flex items-center justify-center text-white/20 text-xs">?</div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <button onClick={() => onViewDetail(entry)} className="text-sm font-medium text-white leading-snug flex-1 min-w-0 text-left hover:text-[var(--accent)] transition-colors cursor-pointer truncate">
              {title.title}
            </button>
            {statusChip && (
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CHIP_COLORS[statusChip.color]}`}>
                {statusChip.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap text-[11px] text-[var(--text-secondary)]">
            {year && <span>{year}</span>}
            {title.genres.slice(0, 2).map((g) => <span key={g}>· {g}</span>)}
            {runtime && <span>· {runtime}</span>}
            {title.tmdb_rating && <span className="text-yellow-400">· ★ {title.tmdb_rating.toFixed(1)}</span>}
            {title.network && <span>· {title.network}</span>}
            {entry.profile && entry.user_id !== currentUserId && <span className="opacity-60">· {entry.profile.display_name}</span>}
          </div>
        </div>

        {/* Rating */}
        <RatingWidget compact rating={entry.user_rating ?? null} onChange={(r) => onRate(entry, r)} />

        {/* Expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-center flex-shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors p-1 cursor-pointer"
        >
          <span className="text-xs">{expanded ? '▲' : '⋯'}</span>
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-1.5 mt-2 pl-[calc(28px+36px+10px+8px)]">
          {entry.title.type === 'show' && (
            <button
              onClick={() => onStatusChange(entry.id, entry.status === 'watching' ? 'watched' : 'watching')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              {entry.status === 'watching' ? 'Mark watched' : 'Start watching'}
            </button>
          )}
          {nextStatus[entry.status] && (
            <button
              onClick={() => onStatusChange(entry.id, nextStatus[entry.status]!.status)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
            >
              {nextStatus[entry.status]!.label}
            </button>
          )}
          <button onClick={() => onEdit(entry)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
            ✏ Edit
          </button>
          {confirmDelete ? (
            <>
              <button onClick={() => onDelete(entry.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors cursor-pointer">
                Confirm remove
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer">
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface QueueViewProps {
  entries: WatchlistEntryWithTitle[]
  currentUserId?: string
  onReorderToPositions: (orderedIds: string[]) => Promise<void>
  onStatusChange: (id: string, status: EntryStatus) => void
  onEdit: (entry: WatchlistEntryWithTitle) => void
  onRate: (entry: WatchlistEntryWithTitle, rating: -1 | 1 | 2 | 3 | null) => void
  onDelete: (id: string) => void
  onViewDetail: (entry: WatchlistEntryWithTitle) => void
}

export function QueueView({
  entries,
  currentUserId,
  onReorderToPositions,
  onStatusChange,
  onEdit,
  onRate,
  onDelete,
  onViewDetail,
}: QueueViewProps) {
  const [localOrder, setLocalOrder] = useState<string[]>(() => entries.map((e) => e.id))

  // Sync local order when entries change from outside (e.g. after DB update)
  const entryIds = entries.map((e) => e.id).join(',')
  if (localOrder.join(',') !== entryIds && !localOrder.some((id) => !entries.find((e) => e.id === id))) {
    setLocalOrder(entries.map((e) => e.id))
  }

  const orderedEntries = localOrder
    .map((id) => entries.find((e) => e.id === id))
    .filter(Boolean) as WatchlistEntryWithTitle[]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id as string)
    const newIndex = localOrder.indexOf(over.id as string)
    const newOrder = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(newOrder)
    await onReorderToPositions(newOrder)
  }

  if (orderedEntries.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)] text-sm">
        Your Up Next queue is empty. Add titles to your watchlist and set them to Up Next.
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <p className="text-xs text-[var(--text-secondary)]">{orderedEntries.length} title{orderedEntries.length !== 1 ? 's' : ''} · drag to reorder</p>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
          {orderedEntries.map((entry) => (
            <SortableRow
              key={entry.id}
              entry={entry}
              currentUserId={currentUserId}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onRate={onRate}
              onDelete={onDelete}
              onViewDetail={onViewDetail}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
