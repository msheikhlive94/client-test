'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients, useCreateProject, useUpdateProject } from '@/lib/hooks'
import { Project, ProjectStatus, ProjectType, BudgetType } from '@/types/database'
import { toast } from 'sonner'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
}

const defaultValues = {
  name: '',
  description: '',
  client_id: '',
  status: 'draft' as ProjectStatus,
  project_type: 'other' as ProjectType,
  budget_type: 'hourly' as BudgetType,
  hourly_rate: 85,
  budget_amount: null as number | null,
  estimated_hours: null as number | null,
  start_date: '',
  end_date: ''
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const [formData, setFormData] = useState(defaultValues)
  
  const { data: clients } = useClients()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        client_id: project.client_id || '',
        status: project.status,
        project_type: project.project_type,
        budget_type: project.budget_type,
        hourly_rate: project.hourly_rate || 85,
        budget_amount: project.budget_amount,
        estimated_hours: project.estimated_hours,
        start_date: project.start_date || '',
        end_date: project.end_date || ''
      })
    } else {
      setFormData(defaultValues)
    }
  }, [project, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const data = {
        ...formData,
        client_id: formData.client_id || null,
        budget_amount: formData.budget_amount || null,
        estimated_hours: formData.estimated_hours || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      }

      if (project) {
        await updateProject.mutateAsync({ id: project.id, ...data })
        toast.success('Project updated')
      } else {
        await createProject.mutateAsync(data)
        toast.success('Project created')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Something went wrong')
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-raised border-border-default text-text-primary max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription className="text-text-secondary">
            {project ? 'Update the project details below.' : 'Fill in the details to create a new project.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Website Redesign"
                className="bg-surface-raised border-border-default"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, client_id: v === "none" ? "" : v })}
              >
                <SelectTrigger className="bg-surface-raised border-border-default">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border-default">
                  <SelectItem value="none">No client</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project..."
              className="bg-surface-raised border-border-default min-h-[80px]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as ProjectStatus })}
              >
                <SelectTrigger className="bg-surface-raised border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border-default">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select
                value={formData.project_type}
                onValueChange={(v) => setFormData({ ...formData, project_type: v as ProjectType })}
              >
                <SelectTrigger className="bg-surface-raised border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border-default">
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="internal_system">Internal System</SelectItem>
                  <SelectItem value="mvp">MVP</SelectItem>
                  <SelectItem value="ai_agent">AI Agent</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select
                value={formData.budget_type}
                onValueChange={(v) => setFormData({ ...formData, budget_type: v as BudgetType })}
              >
                <SelectTrigger className="bg-surface-raised border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-raised border-border-default">
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.budget_type === 'hourly' ? (
              <div className="space-y-2">
                <Label>Hourly Rate (€)</Label>
                <Input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  className="bg-surface-raised border-border-default"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{formData.budget_type === 'fixed' ? 'Fixed Price (€)' : 'Monthly Rate (€)'}</Label>
                <Input
                  type="number"
                  value={formData.budget_amount || ''}
                  onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) || null })}
                  className="bg-surface-raised border-border-default"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                value={formData.estimated_hours || ''}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || null })}
                className="bg-surface-raised border-border-default"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-surface-raised border-border-default"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="bg-surface-raised border-border-default"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border-default text-text-primary hover:bg-surface-raised"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white"
              disabled={createProject.isPending || updateProject.isPending}
            >
              {project ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
