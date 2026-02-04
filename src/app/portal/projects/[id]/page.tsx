'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthUser, useClientAccess } from '@/lib/hooks/use-client-portal'
import { useProject, useProjectStats, useTasks, useRealtimeTasks } from '@/lib/hooks'
import { ProjectStatus, TaskStatus, TaskPriority, TaskWithAssignee } from '@/types/database'
import { 
  ArrowLeft, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  ListTodo, 
  Calendar,
  LayoutList,
  LayoutGrid,
  X,
  Filter,
  User
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { PortalTaskComments } from '@/components/portal/portal-task-comments'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-zinc-500',
  active: 'bg-emerald-500',
  on_hold: 'bg-yellow-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500'
}

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done'
}

const taskStatusColors: Record<TaskStatus, string> = {
  todo: 'border-zinc-500 text-zinc-400',
  in_progress: 'border-blue-500 text-blue-400',
  review: 'border-purple-500 text-purple-400',
  done: 'border-emerald-500 text-emerald-400'
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

type ViewMode = 'list' | 'kanban'
type AssigneeFilter = 'all' | 'mine'

const kanbanColumns: Array<{ id: TaskStatus; title: string; color: string }> = [
  { id: 'todo', title: 'To Do', color: 'border-zinc-500' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-500' },
  { id: 'review', title: 'Review', color: 'border-purple-500' },
  { id: 'done', title: 'Done', color: 'border-emerald-500' }
]

export default function PortalProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { user, loading: authLoading } = useAuthUser()
  const { data: clientAccess, isLoading: accessLoading } = useClientAccess(user?.id)
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: stats } = useProjectStats(projectId)
  const { data: tasks } = useTasks(projectId)

  // Subscribe to realtime task updates for this project
  useRealtimeTasks(projectId)

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all')
  const [statusFilters, setStatusFilters] = useState<Set<TaskStatus>>(new Set())
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/portal/login')
    }
  }, [user, authLoading, router])

  // Check if user has access to this project's client
  const hasAccess = clientAccess?.some(ca => ca.client_id === project?.client_id)

  useEffect(() => {
    if (!accessLoading && !projectLoading && project && !hasAccess) {
      router.push('/portal')
    }
  }, [accessLoading, projectLoading, project, hasAccess, router])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    
    let filtered = tasks

    // Filter by assignee
    if (assigneeFilter === 'mine') {
      filtered = filtered.filter(t => t.assigned_to === user?.id)
    }

    // Filter by status
    if (statusFilters.size > 0) {
      filtered = filtered.filter(t => statusFilters.has(t.status))
    }

    return filtered
  }, [tasks, assigneeFilter, statusFilters, user?.id])

  // Group tasks by status for kanban view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithAssignee[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    }

    filteredTasks.forEach(task => {
      grouped[task.status].push(task)
    })

    return grouped
  }, [filteredTasks])

  // Toggle status filter
  const toggleStatusFilter = (status: TaskStatus) => {
    const newFilters = new Set(statusFilters)
    if (newFilters.has(status)) {
      newFilters.delete(status)
    } else {
      newFilters.add(status)
    }
    setStatusFilters(newFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setAssigneeFilter('all')
    setStatusFilters(new Set())
  }

  const hasActiveFilters = assigneeFilter !== 'all' || statusFilters.size > 0

  if (authLoading || accessLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (!user || !project || !hasAccess) {
    return null
  }

  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0
  const totalTasks = tasks?.length || 0
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/portal" 
            className="inline-flex items-center text-sm text-zinc-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{project.name}</h1>
              <Badge className={cn('text-white border-0', statusColors[project.status])}>
                {statusLabels[project.status]}
              </Badge>
            </div>

            {/* View Toggle & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assignee Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs sm:text-sm",
                      assigneeFilter === 'mine' && "border-emerald-500 text-emerald-400"
                    )}
                  >
                    <User className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{assigneeFilter === 'mine' ? 'My Tasks' : 'All Tasks'}</span>
                    <span className="sm:hidden">{assigneeFilter === 'mine' ? 'Mine' : 'All'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                  <DropdownMenuCheckboxItem
                    checked={assigneeFilter === 'all'}
                    onCheckedChange={() => setAssigneeFilter('all')}
                    className="text-zinc-300"
                  >
                    All Tasks
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={assigneeFilter === 'mine'}
                    onCheckedChange={() => setAssigneeFilter('mine')}
                    className="text-zinc-300"
                  >
                    My Tasks Only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs sm:text-sm",
                      statusFilters.size > 0 && "border-emerald-500 text-emerald-400"
                    )}
                  >
                    <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                    Status
                    {statusFilters.size > 0 && (
                      <span className="ml-1 text-xs">({statusFilters.size})</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                  <DropdownMenuLabel className="text-zinc-400">Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  {kanbanColumns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={statusFilters.has(col.id)}
                      onCheckedChange={() => toggleStatusFilter(col.id)}
                      className="text-zinc-300"
                    >
                      {col.title}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="text-zinc-400 hover:text-white text-xs sm:text-sm"
                >
                  <X className="h-3 w-3 mr-1 sm:hidden" />
                  Clear
                </Button>
              )}

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-700">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "h-8 px-3",
                    viewMode === 'list' 
                      ? "bg-zinc-800 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "h-8 px-3",
                    viewMode === 'kanban' 
                      ? "bg-zinc-800 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Progress */}
        <Card className="bg-zinc-900/50 border-zinc-800 mb-6 shadow-lg hover:shadow-emerald-500/5 transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white">Project Progress</h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-500">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-lg hover:shadow-blue-500/5 transition-all hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Hours Logged</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.totalHours.toFixed(1) || '0'}h
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-lg hover:shadow-orange-500/5 transition-all hover:border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Open Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.openTasks || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-lg hover:shadow-emerald-500/5 transition-all hover:border-zinc-700 sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.completedTasks || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {project.description && (
          <Card className="bg-zinc-900/50 border-zinc-800 mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tasks - List View */}
        {viewMode === 'list' && (
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Tasks</CardTitle>
                <span className="text-sm text-zinc-400">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {!filteredTasks?.length ? (
                <p className="text-zinc-500 text-center py-12">
                  {hasActiveFilters ? 'No tasks match your filters' : 'No tasks yet'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="group p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                          ) : (
                            <div className={cn('h-3 w-3 rounded-full mt-1.5 shrink-0', priorityColors[task.priority])} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'font-medium text-white group-hover:text-emerald-400 transition-colors',
                                task.status === 'done' && 'line-through text-zinc-500 group-hover:text-zinc-400'
                              )}>
                                {task.title}
                              </span>
                              {task.priority === 'urgent' && (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                              {task.users && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.users.name || task.users.email}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimated_hours}h estimated
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {task.due_date && (
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", taskStatusColors[task.status])}
                          >
                            {taskStatusLabels[task.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tasks - Kanban View */}
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto -mx-4 px-4 pb-4">
            <div className="grid grid-cols-4 gap-4 min-w-[800px]">
              {kanbanColumns.map((column) => {
                const columnTasks = tasksByStatus[column.id]
                return (
                  <div key={column.id} className="flex flex-col">
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-t-lg bg-zinc-900/50 border-t-2",
                      column.color
                    )}>
                      <h3 className="font-semibold text-white text-sm">{column.title}</h3>
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        {columnTasks.length}
                      </Badge>
                    </div>
                    <div className="flex-1 bg-zinc-900/30 border border-t-0 border-zinc-800 rounded-b-lg p-3 space-y-3 min-h-[400px]">
                      {columnTasks.length === 0 ? (
                        <p className="text-zinc-600 text-xs text-center py-8">
                          {hasActiveFilters ? 'No matches' : 'No tasks'}
                        </p>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="group p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer shadow-sm hover:shadow-md"
                          >
                            <div className="mb-2">
                              <div className="flex items-start gap-2 mb-1">
                                <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', priorityColors[task.priority])} />
                                <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-2">
                                  {task.title}
                                </span>
                              </div>
                              {task.description && (
                                <p className="text-xs text-zinc-500 line-clamp-2 ml-4">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-xs text-zinc-500 ml-4">
                              {task.users ? (
                                <span className="flex items-center gap-1 truncate">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{task.users.name || task.users.email}</span>
                                </span>
                              ) : (
                                <span></span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1 shrink-0">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Task Detail Drawer */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="bg-zinc-900 border-zinc-800 w-full sm:max-w-xl overflow-y-auto p-6 sm:p-8">
          {selectedTask && (
            <>
              <SheetHeader className="mb-6 pr-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SheetTitle className="text-xl text-white mb-2">
                      {selectedTask.title}
                    </SheetTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", taskStatusColors[selectedTask.status])}
                      >
                        {taskStatusLabels[selectedTask.status]}
                      </Badge>
                      <Badge 
                        className={cn("text-xs text-white border-0", priorityColors[selectedTask.priority])}
                      >
                        {priorityLabels[selectedTask.priority]} Priority
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Description</h4>
                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Assigned To
                    </h4>
                    <p className="text-sm text-white">
                      {selectedTask.users ? (selectedTask.users.name || selectedTask.users.email) : 'Unassigned'}
                    </p>
                  </div>

                  {/* Due Date */}
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due Date
                    </h4>
                    <p className="text-sm text-white">
                      {selectedTask.due_date 
                        ? format(new Date(selectedTask.due_date), 'PPP')
                        : 'No due date'}
                    </p>
                  </div>

                  {/* Estimated Hours */}
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Estimated Hours
                    </h4>
                    <p className="text-sm text-white">
                      {selectedTask.estimated_hours ? `${selectedTask.estimated_hours}h` : 'Not set'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Status
                    </h4>
                    <p className="text-sm text-white">
                      {taskStatusLabels[selectedTask.status]}
                    </p>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="border-t border-zinc-800 pt-6">
                  <h4 className="text-sm font-medium text-white mb-4">Comments & Updates</h4>
                  {user && clientAccess?.[0] && (
                    <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-800">
                      <PortalTaskComments
                        taskId={selectedTask.id}
                        taskTitle={selectedTask.title}
                        projectId={projectId}
                        currentUserId={user.id}
                        currentUserName={clientAccess[0].name || user.email || 'Client'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
