'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useTasks, useUpdateTask, useDeleteTask, useAdminUsers, useRealtimeTasks } from '@/lib/hooks'
import { Task, TaskStatus, TaskPriority, TaskWithAssignee } from '@/types/database'
import { Plus, GripVertical, Trash2, Calendar, LayoutGrid, List, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { TaskDialog } from '@/components/dialogs/task-dialog'
import { KanbanBoard } from './kanban/kanban-board'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TasksTabProps {
  projectId: string
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done'
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

export function TasksTab({ projectId }: TasksTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [initialStatus, setInitialStatus] = useState<TaskStatus | undefined>()

  const { data: tasks, isLoading } = useTasks(projectId)
  const { data: users } = useAdminUsers()

  // Subscribe to realtime task updates for this project
  useRealtimeTasks(projectId)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  // Apply filters
  let filteredTasks = tasks
  
  if (statusFilter !== 'all') {
    filteredTasks = filteredTasks?.filter(t => t.status === statusFilter)
  }
  
  if (assigneeFilter !== 'all') {
    if (assigneeFilter === 'unassigned') {
      filteredTasks = filteredTasks?.filter(t => !t.assigned_to)
    } else {
      filteredTasks = filteredTasks?.filter(t => t.assigned_to === assigneeFilter)
    }
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ id: task.id, status: newStatus })
      toast.success(`Task ${newStatus === 'done' ? 'completed' : 'updated'}`)
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async (task: Task) => {
    try {
      await deleteTask.mutateAsync(task)
      toast.success('Task deleted')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleNewTask = () => {
    setEditingTask(undefined)
    setInitialStatus(undefined)
    setDialogOpen(true)
  }

  const handleAddTaskFromKanban = (status: TaskStatus) => {
    setEditingTask(undefined)
    setInitialStatus(status)
    setDialogOpen(true)
  }

  const handleTaskClick = (task: Task) => {
    setEditingTask(task)
    setInitialStatus(undefined)
    setDialogOpen(true)
  }

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-8 w-8 p-0 rounded-md',
                    viewMode === 'list'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'h-8 w-8 p-0 rounded-md',
                    viewMode === 'kanban'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              {/* Assignee Filter (only show in list view) */}
              {viewMode === 'list' && (
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[140px] sm:w-[180px] bg-zinc-800 border-zinc-700">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-zinc-500 shrink-0" />
                      <SelectValue placeholder="All Users" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {viewMode === 'list' && (
              <Button
                onClick={handleNewTask}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>

          {/* Status Filters (only show in list view) - horizontally scrollable on mobile */}
          {viewMode === 'list' && (
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex gap-1.5 sm:gap-2 min-w-max pb-1">
                {(['all', 'todo', 'in_progress', 'review', 'done'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'text-xs sm:text-sm whitespace-nowrap',
                      statusFilter === status
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                    )}
                  >
                    {status === 'all' ? 'All' : statusLabels[status]}
                    {status !== 'all' && (
                      <span className="ml-1 text-xs">
                        ({tasks?.filter(t => t.status === status).length || 0})
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'kanban' ? (
          <KanbanBoard
            projectId={projectId}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTaskFromKanban}
          />
        ) : (
          <>
            {/* Tasks List */}
            {isLoading ? (
              <div className="text-zinc-400 py-8 text-center">Loading tasks...</div>
            ) : filteredTasks?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400">No tasks yet</p>
                <Button
                  onClick={handleNewTask}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-zinc-900 hover:bg-zinc-850 group"
                  >
                    <GripVertical className="hidden sm:block h-4 w-4 text-zinc-600 cursor-grab opacity-0 group-hover:opacity-100 mt-0.5 sm:mt-0 shrink-0" />

                    <Checkbox
                      checked={task.status === 'done'}
                      onCheckedChange={(checked) =>
                        handleStatusChange(task, checked ? 'done' : 'todo')
                      }
                      className="border-zinc-600 mt-1 sm:mt-0 shrink-0"
                    />

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEdit(task)}
                    >
                      <div className="flex items-start sm:items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-white text-sm sm:text-base break-words',
                          task.status === 'done' && 'line-through text-zinc-500'
                        )}>
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs border-0 text-white shrink-0',
                            priorityColors[task.priority]
                          )}
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      {/* Mobile metadata row */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:hidden">
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'MMM d')}
                          </div>
                        )}
                        {task.estimated_hours && (
                          <span className="text-xs text-zinc-500">
                            {task.estimated_hours}h
                          </span>
                        )}
                        {'users' in task && task.users && (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <User className="h-3 w-3" />
                            <span className="font-medium truncate max-w-[120px]">
                              {task.users.name || task.users.email}
                            </span>
                          </div>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] border-zinc-600 text-zinc-400"
                        >
                          {statusLabels[task.status]}
                        </Badge>
                      </div>
                    </div>

                    {/* Desktop metadata */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </div>
                      )}
                      {task.estimated_hours && (
                        <span className="text-sm text-zinc-500">
                          {task.estimated_hours}h
                        </span>
                      )}
                      {'users' in task && task.users && (
                        <div className="flex items-center gap-1 text-sm text-emerald-400">
                          <User className="h-3 w-3" />
                          <span className="font-medium">
                            {task.users.name || task.users.email}
                          </span>
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="text-xs border-zinc-600 text-zinc-400"
                      >
                        {statusLabels[task.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(task)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Mobile delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(task)
                      }}
                      className="sm:hidden text-zinc-500 hover:text-red-500 hover:bg-transparent p-1 h-auto shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        task={editingTask}
        initialStatus={initialStatus}
      />
    </Card>
  )
}
