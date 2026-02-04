'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types/database'
import { KanbanCard } from './kanban-card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  color: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  onTaskClick,
  onAddTask
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-[500px]',
        'rounded-2xl',
        'border border-zinc-800/80',
        'bg-gradient-to-b from-zinc-900/80 to-zinc-900/40',
        'backdrop-blur-md',
        'transition-all duration-300 ease-out',
        // Drop zone highlight
        isOver && [
          'border-emerald-500/40',
          'ring-2 ring-emerald-500/20',
          'bg-gradient-to-b from-emerald-950/20 to-zinc-900/40'
        ]
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2.5">
          {/* Status dot */}
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            'ring-2 ring-offset-1 ring-offset-zinc-900',
            color,
            color.replace('bg-', 'ring-').replace('-500', '-500/50')
          )} />
          {/* Title */}
          <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
            {title}
          </h3>
          {/* Count badge */}
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            'bg-zinc-800 text-zinc-400',
            'border border-zinc-700/50'
          )}>
            {tasks.length}
          </span>
        </div>

        {/* Add button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTask}
          className={cn(
            'h-7 w-7 p-0',
            'text-zinc-500 hover:text-zinc-200',
            'hover:bg-zinc-800/80',
            'rounded-lg',
            'transition-colors duration-150'
          )}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* Tasks Container */}
      <ScrollArea className="flex-1 px-2">
        <div
          ref={setNodeRef}
          className="p-2 space-y-2.5 min-h-[200px]"
        >
          <SortableContext
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="kanban-card-animate"
                style={{ '--card-index': index } as React.CSSProperties}
              >
                <KanbanCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              </div>
            ))}
          </SortableContext>

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className={cn(
              'flex flex-col items-center justify-center',
              'py-12 px-4',
              'rounded-xl',
              'border-2 border-dashed',
              'transition-colors duration-200',
              isOver
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-zinc-800/60'
            )}>
              <p className="text-xs text-zinc-600 text-center">
                {isOver ? 'Drop here' : 'No tasks'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
