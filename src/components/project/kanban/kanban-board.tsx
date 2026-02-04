'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types/database'
import { useTasksByStatus, useBulkUpdateTasks, useRealtimeTasks } from '@/lib/hooks'
import { KanbanColumn } from './kanban-column'
import { KanbanCardOverlay } from './kanban-card'
import { toast } from 'sonner'

interface KanbanBoardProps {
  projectId: string
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

const columns: Array<{ id: TaskStatus; title: string; color: string }> = [
  { id: 'todo', title: 'To Do', color: 'bg-zinc-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' }
]

export function KanbanBoard({ projectId, onTaskClick, onAddTask }: KanbanBoardProps) {
  const { data: tasksByStatus, isLoading } = useTasksByStatus(projectId)
  const bulkUpdateTasks = useBulkUpdateTasks()

  // Subscribe to realtime task updates for this project
  useRealtimeTasks(projectId)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<Record<TaskStatus, Task[]> | null>(null)

  // Use local state during drag, otherwise use server state
  const displayTasks = localTasks ?? tasksByStatus ?? {
    todo: [],
    in_progress: [],
    review: [],
    done: []
  }

  // Sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Prevents accidental drags
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Find which column a task belongs to
  const findTaskColumn = (taskId: string): TaskStatus | null => {
    for (const status of Object.keys(displayTasks) as TaskStatus[]) {
      if (displayTasks[status].some(t => t.id === taskId)) {
        return status
      }
    }
    return null
  }

  // Find a task by ID
  const findTask = (taskId: string): Task | null => {
    for (const status of Object.keys(displayTasks) as TaskStatus[]) {
      const task = displayTasks[status].find(t => t.id === taskId)
      if (task) return task
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(event.active.id as string)
    setActiveTask(task)
    // Initialize local state for optimistic updates
    if (tasksByStatus) {
      setLocalTasks({ ...tasksByStatus })
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !localTasks) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findTaskColumn(activeId)
    // Check if over a column or a task
    const overColumn = columns.find(c => c.id === overId)?.id ?? findTaskColumn(overId)

    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    // Move task to new column (optimistic)
    setLocalTasks(prev => {
      if (!prev) return prev

      const activeTask = prev[activeColumn].find(t => t.id === activeId)
      if (!activeTask) return prev

      return {
        ...prev,
        [activeColumn]: prev[activeColumn].filter(t => t.id !== activeId),
        [overColumn]: [...prev[overColumn], { ...activeTask, status: overColumn }]
      }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !localTasks) {
      setLocalTasks(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findTaskColumn(activeId)
    const overColumn = columns.find(c => c.id === overId)?.id ?? findTaskColumn(overId)

    if (!activeColumn || !overColumn) {
      setLocalTasks(null)
      return
    }

    // Calculate final positions
    const columnTasks = localTasks[overColumn]
    const activeIndex = columnTasks.findIndex(t => t.id === activeId)
    let overIndex = columnTasks.findIndex(t => t.id === overId)

    // If dropping on a column (not a task), place at end
    if (overIndex === -1) {
      overIndex = columnTasks.length - 1
    }

    // Reorder within column if needed
    let finalTasks = columnTasks
    if (activeIndex !== overIndex && activeIndex !== -1) {
      finalTasks = arrayMove(columnTasks, activeIndex, overIndex)
      setLocalTasks(prev => prev ? { ...prev, [overColumn]: finalTasks } : null)
    }

    // Prepare updates for the server
    const updates = finalTasks.map((task, index) => ({
      id: task.id,
      status: overColumn,
      position: index * 1000 // Use gaps for future insertions
    }))

    try {
      await bulkUpdateTasks.mutateAsync(updates)
      // Clear local state to use server state
      setLocalTasks(null)
    } catch {
      toast.error('Failed to update tasks')
      setLocalTasks(null)
    }
  }

  const handleDragCancel = () => {
    setActiveTask(null)
    setLocalTasks(null)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => (
          <div
            key={column.id}
            className="h-[500px] rounded-2xl bg-zinc-900/50 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={displayTasks[column.id]}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask(column.id)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
      }}>
        {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
