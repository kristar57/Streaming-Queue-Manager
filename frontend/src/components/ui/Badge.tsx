import type { ReactNode } from 'react'
import type { EntryStatus, EntryPriority } from '../../types'

type Color = 'indigo' | 'green' | 'yellow' | 'red' | 'gray' | 'blue'

interface BadgeProps {
  color?: Color
  children: ReactNode
  className?: string
}

const colorClass: Record<Color, string> = {
  indigo: 'bg-indigo-500/20 text-indigo-300',
  green:  'bg-green-500/20 text-green-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  red:    'bg-red-500/20 text-red-300',
  gray:   'bg-white/10 text-[var(--text-secondary)]',
  blue:   'bg-blue-500/20 text-blue-300',
}

export function Badge({ color = 'gray', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass[color]} ${className}`}>
      {children}
    </span>
  )
}

// Convenience wrappers
export function StatusBadge({ status, isCaughtUp }: { status: EntryStatus; isCaughtUp?: boolean }) {
  if (status === 'watching' && isCaughtUp) {
    return <Badge color="blue">Caught up</Badge>
  }
  const map: Record<EntryStatus, { label: string; color: Color }> = {
    want_to_watch: { label: 'Up next',     color: 'gray' },
    watching:      { label: 'Watching',    color: 'indigo' },
    watched:       { label: 'Watched',     color: 'green' },
    anticipated:   { label: 'Anticipated', color: 'yellow' },
  }
  const { label, color } = map[status]
  return <Badge color={color}>{label}</Badge>
}

export function PriorityDot({ priority }: { priority: EntryPriority }) {
  const colorMap: Record<EntryPriority, string> = {
    high:   'bg-red-400',
    medium: 'bg-yellow-400',
    low:    'bg-gray-500',
  }
  return (
    <span
      title={`Priority: ${priority}`}
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorMap[priority]}`}
    />
  )
}
