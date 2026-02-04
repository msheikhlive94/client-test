'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useActiveProjects, useUpcomingTasks, useTimeStats, useNewLeads } from '@/lib/hooks'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { FolderKanban, Clock, DollarSign, AlertCircle, CheckCircle2, ArrowRight, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TaskPriority, TaskStatus } from '@/types/database'

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500',
  on_hold: 'bg-yellow-500',
  draft: 'bg-zinc-500',
  completed: 'bg-blue-500'
}

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useActiveProjects()
  const { data: upcomingTasks, isLoading: tasksLoading } = useUpcomingTasks(7)
  const { data: newLeads } = useNewLeads()
  
  // This week stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const { data: weekStats } = useTimeStats(
    format(weekStart, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  )
  
  // This month stats
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())
  const { data: monthStats } = useTimeStats(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd')
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm md:text-base text-text-secondary">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-text-primary">
              {projectsLoading ? '...' : projects?.length || 0}
            </div>
            <p className="text-xs text-text-muted">
              {projects?.filter(p => p.status === 'on_hold').length || 0} on hold
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-text-primary">
              {weekStats?.totalHours.toFixed(1) || '0'}h
            </div>
            <p className="text-xs text-text-muted">
              {weekStats?.billableHours.toFixed(1) || '0'}h billable
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-text-primary">
              €{monthStats?.billableAmount.toFixed(0) || '0'}
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              {monthStats?.billableHours.toFixed(1) || '0'}h × rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Upcoming Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-text-primary">
              {tasksLoading ? '...' : upcomingTasks?.length || 0}
            </div>
            <p className="text-xs text-text-muted">Due within 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* New Leads Alert */}
      {newLeads && newLeads.length > 0 && (
        <Link href="/leads">
          <Card className="bg-brand-muted border-brand/30 hover:bg-brand/20 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm md:text-base">
                  {newLeads.length} new lead{newLeads.length > 1 ? 's' : ''} waiting
                </p>
                <p className="text-xs md:text-sm text-brand">Click to review and convert</p>
              </div>
              <ArrowRight className="h-5 w-5 text-brand flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Active Projects */}
        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4">
            <CardTitle className="text-text-primary text-base md:text-lg">Active Projects</CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary text-xs md:text-sm h-8">
                View all
                <ArrowRight className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {projectsLoading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : projects?.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <FolderKanban className="mx-auto h-10 w-10 md:h-12 md:w-12 text-text-muted" />
                <p className="mt-2 text-text-secondary text-sm">No active projects</p>
                <Link href="/projects">
                  <Button className="mt-4 bg-brand hover:bg-brand-hover text-white text-sm">
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {projects?.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        statusColors[project.status]
                      )} />
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary text-sm md:text-base truncate">{project.name}</p>
                        <p className="text-xs md:text-sm text-text-secondary truncate">
                          {project.clients?.name || 'No client'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-text-secondary border-border-default text-xs hidden sm:inline-flex">
                      {project.project_type.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4">
            <CardTitle className="text-text-primary text-base md:text-lg">Upcoming Deadlines</CardTitle>
            <Link href="/time">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary text-xs md:text-sm h-8">
                View all
                <ArrowRight className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {tasksLoading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : upcomingTasks?.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <CheckCircle2 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-brand" />
                <p className="mt-2 text-text-secondary text-sm">No upcoming deadlines!</p>
                <p className="text-xs text-text-muted">You&apos;re all caught up</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {upcomingTasks?.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-surface"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className={cn(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        priorityColors[task.priority as TaskPriority]
                      )} />
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary text-sm md:text-base truncate">{task.title}</p>
                        <p className="text-xs md:text-sm text-text-secondary truncate">
                          {task.projects?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs md:text-sm font-medium text-text-primary">
                        {task.due_date && format(new Date(task.due_date), 'MMM d')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {task.due_date && isToday(new Date(task.due_date)) ? 'Today' : 
                         task.due_date && isTomorrow(new Date(task.due_date)) ? 'Tomorrow' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function isToday(date: Date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isTomorrow(date: Date) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date.toDateString() === tomorrow.toDateString()
}
