'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTask, useUpdateTask } from '@/lib/hooks'
import { Task, TaskStatus, TaskPriority } from '@/types/database'
import { TaskComments } from '@/components/task/task-comments'
import { UserSelector } from '@/components/ui/user-selector'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  task?: Task
  initialStatus?: TaskStatus
}

const defaultValues = {
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  estimated_hours: null as number | null,
  due_date: '',
  assigned_to: null as string | null
}

export function TaskDialog({ open, onOpenChange, projectId, task, initialStatus }: TaskDialogProps) {
  const [formData, setFormData] = useState(defaultValues)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  // Get current user for comments
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || 'Admin' })
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        due_date: task.due_date || '',
        assigned_to: task.assigned_to
      })
    } else {
      setFormData({
        ...defaultValues,
        status: initialStatus || defaultValues.status
      })
    }
  }, [task, open, initialStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const data = {
        ...formData,
        project_id: projectId,
        estimated_hours: formData.estimated_hours || null,
        due_date: formData.due_date || null
      }

      if (task) {
        await updateTask.mutateAsync({ id: task.id, ...data })
        toast.success('Task updated')
      } else {
        await createTask.mutateAsync(data)
        toast.success('Task created')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Something went wrong')
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Build user authentication"
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details about this task..."
              className="bg-zinc-800 border-zinc-700 min-h-[80px]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as TaskStatus })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.estimated_hours || ''}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || null })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <UserSelector
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={createTask.isPending || updateTask.isPending}
            >
              {task ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </form>

        {/* Comments Section - only show when editing existing task */}
        {task && currentUser && (
          <>
            <Separator className="bg-zinc-800" />
            <TaskComments
              taskId={task.id}
              projectId={projectId}
              currentUserId={currentUser.id}
              currentUserName={currentUser.email}
              authorType="admin"
              maxHeight="250px"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
