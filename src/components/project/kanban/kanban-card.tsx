'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TaskPriority, TaskWithAssignee } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'

interface KanbanCardProps {
  task: TaskWithAssignee | Task
  onClick: () => void
  isDragOverlay?: boolean
}

const priorityConfig: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'bg-zinc-600 text-zinc-300', label: 'Low' },
  medium: { color: 'bg-blue-600 text-blue-100', label: 'Med' },
  high: { color: 'bg-orange-600 text-orange-100', label: 'High' },
  urgent: { color: 'bg-red-600 text-red-100', label: 'Urgent' }
}

export function KanbanCard({ task, onClick, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDragging) onClick()
      }}
      className={cn(
        // Base styles
        'group relative p-3.5 rounded-xl cursor-grab active:cursor-grabbing',
        'border border-zinc-700/60 bg-zinc-800/90',
        'backdrop-blur-sm',
        // Transitions
        'transition-all duration-200 ease-out',
        // Hover effects
        'hover:bg-zinc-750 hover:border-zinc-600/80',
        'hover:shadow-lg hover:shadow-black/20',
        'hover:-translate-y-0.5',
        // Dragging state
        isDragging && 'opacity-40 scale-[0.98] shadow-none',
        // Overlay state (the ghost that follows cursor)
        isDragOverlay && [
          'rotate-[3deg] scale-105',
          'shadow-2xl shadow-emerald-500/25',
          'border-emerald-500/50',
          'ring-2 ring-emerald-500/30'
        ]
      )}
    >
      {/* Priority indicator line */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-full',
          priorityConfig[task.priority].color.split(' ')[0]
        )}
      />

      {/* Content */}
      <div className="pl-2.5 space-y-2.5">
        {/* Header: Priority badge */}
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 h-4',
              'border-0 rounded-md',
              priorityConfig[task.priority].color
            )}
          >
            {priorityConfig[task.priority].label}
          </Badge>
        </div>

        {/* Title */}
        <h4 className={cn(
          'text-sm font-medium text-zinc-100 leading-snug',
          'line-clamp-2',
          task.status === 'done' && 'line-through text-zinc-500'
        )}>
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-zinc-500 line-clamp-1">
            {task.description}
          </p>
        )}

        {/* Footer: Due date, hours, & assigned user */}
        {(task.due_date || task.estimated_hours || ('users' in task && task.users)) && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue && 'text-red-400',
                isDueToday && 'text-amber-400',
                !isOverdue && !isDueToday && 'text-zinc-500'
              )}>
                <Calendar className="h-3 w-3" />
                <span className="font-medium">
                  {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(new Date(task.due_date), 'MMM d')}
                </span>
              </div>
            )}
            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
            {'users' in task && task.users && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <User className="h-3 w-3" />
                <span className="font-medium truncate max-w-[100px]">
                  {task.users.name || task.users.email}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Non-draggable version for DragOverlay
export function KanbanCardOverlay({ task }: { task: TaskWithAssignee | Task }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl',
        'border border-emerald-500/50 bg-zinc-800',
        'shadow-2xl shadow-emerald-500/25',
        'ring-2 ring-emerald-500/30',
        'rotate-[3deg] scale-105'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-full',
          priorityConfig[task.priority].color.split(' ')[0]
        )}
      />

      <div className="pl-2.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 h-4',
              'border-0 rounded-md',
              priorityConfig[task.priority].color
            )}
          >
            {priorityConfig[task.priority].label}
          </Badge>
        </div>

        <h4 className={cn(
          'text-sm font-medium text-zinc-100 leading-snug',
          'line-clamp-2',
          task.status === 'done' && 'line-through text-zinc-500'
        )}>
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-zinc-500 line-clamp-1">
            {task.description}
          </p>
        )}

        {(task.due_date || task.estimated_hours || ('users' in task && task.users)) && (
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue && 'text-red-400',
                isDueToday && 'text-amber-400',
                !isOverdue && !isDueToday && 'text-zinc-500'
              )}>
                <Calendar className="h-3 w-3" />
                <span className="font-medium">
                  {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(new Date(task.due_date), 'MMM d')}
                </span>
              </div>
            )}
            {task.estimated_hours && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
            {'users' in task && task.users && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <User className="h-3 w-3" />
                <span className="font-medium truncate max-w-[100px]">
                  {task.users.name || task.users.email}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
