'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProject, useProjectStats, useDeleteProject } from '@/lib/hooks'
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  AlertCircle,
  ListTodo
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ProjectDialog } from '@/components/dialogs/project-dialog'
import { TasksTab } from '@/components/project/tasks-tab'
import { TimeTab } from '@/components/project/time-tab'
import { NotesTab } from '@/components/project/notes-tab'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProjectStatus } from '@/types/database'

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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  const { data: project, isLoading } = useProject(projectId)
  const { data: stats } = useProjectStats(projectId)
  const deleteProject = useDeleteProject()

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('Project deleted')
      router.push('/projects')
    } catch (error) {
      toast.error('Failed to delete project')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Project not found</div>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <Link 
            href="/projects" 
            className="inline-flex items-center text-sm text-zinc-400 hover:text-white mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{project.name}</h1>
            <Badge className={cn('text-white shrink-0', statusColors[project.status])}>
              {statusLabels[project.status]}
            </Badge>
          </div>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            {project.clients?.name || 'No client'} • {project.project_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-900 text-red-500 hover:bg-red-900/20"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalHours.toFixed(1) || '0'}h
            </div>
            {project.estimated_hours && (
              <p className="text-xs text-zinc-500">
                of {project.estimated_hours}h estimated
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Billable Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              €{stats?.billableAmount.toFixed(0) || '0'}
            </div>
            {project.budget_type === 'fixed' && project.budget_amount && (
              <p className="text-xs text-zinc-500">
                of €{project.budget_amount} budget
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Open Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.openTasks || 0}
            </div>
            <p className="text-xs text-zinc-500">
              {stats?.completedTasks || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Timeline</CardTitle>
            <AlertCircle className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium text-white">
              {project.start_date ? format(new Date(project.start_date), 'MMM d') : 'Not set'}
              {project.end_date && ` - ${format(new Date(project.end_date), 'MMM d')}`}
            </div>
            <p className="text-xs text-zinc-500">
              {project.start_date && project.end_date ? 
                `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days` : 
                'No end date'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <p className="text-zinc-300">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-zinc-700">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="time" className="data-[state=active]:bg-zinc-700">
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-zinc-700">
            Notes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <TasksTab projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="time">
          <TimeTab projectId={projectId} hourlyRate={project.hourly_rate || 85} />
        </TabsContent>
        
        <TabsContent value="notes">
          <NotesTab projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete &quot;{project.name}&quot; and all associated tasks, 
              time entries, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
