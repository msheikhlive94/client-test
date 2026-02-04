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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTimeEntry, useUpdateTimeEntry, useTasks } from '@/lib/hooks'
import { TimeEntry } from '@/types/database'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface TimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  entry?: TimeEntry
}

const defaultValues = {
  description: '',
  hours: '',
  minutes: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  billable: true,
  task_id: ''
}

export function TimeEntryDialog({ open, onOpenChange, projectId, entry }: TimeEntryDialogProps) {
  const [formData, setFormData] = useState(defaultValues)
  
  const { data: tasks } = useTasks(projectId)
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()

  useEffect(() => {
    if (entry) {
      const hours = Math.floor(entry.duration_minutes / 60)
      const minutes = entry.duration_minutes % 60
      setFormData({
        description: entry.description || '',
        hours: hours.toString(),
        minutes: minutes.toString(),
        date: entry.date,
        billable: entry.billable,
        task_id: entry.task_id || ''
      })
    } else {
      setFormData({
        ...defaultValues,
        date: format(new Date(), 'yyyy-MM-dd')
      })
    }
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const hours = parseInt(formData.hours) || 0
    const minutes = parseInt(formData.minutes) || 0
    const totalMinutes = hours * 60 + minutes

    if (totalMinutes === 0) {
      toast.error('Please enter a duration')
      return
    }
    
    try {
      const data = {
        project_id: projectId,
        description: formData.description || null,
        duration_minutes: totalMinutes,
        date: formData.date,
        billable: formData.billable,
        task_id: formData.task_id || null
      }

      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, ...data })
        toast.success('Time entry updated')
      } else {
        await createEntry.mutateAsync(data)
        toast.success('Time logged')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Something went wrong')
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What did you work on?"
              className="bg-zinc-800 border-zinc-700 min-h-[80px]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                min="0"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Minutes</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>

          {tasks && tasks.length > 0 && (
            <div className="space-y-2">
              <Label>Task (optional)</Label>
              <Select
                value={formData.task_id}
                onValueChange={(v) => setFormData({ ...formData, task_id: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="">No task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800">
            <div>
              <Label className="text-white">Billable</Label>
              <p className="text-sm text-zinc-400">Include this time in invoicing</p>
            </div>
            <Switch
              checked={formData.billable}
              onCheckedChange={(checked) => setFormData({ ...formData, billable: checked })}
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
              disabled={createEntry.isPending || updateEntry.isPending}
            >
              {entry ? 'Update' : 'Log'} Time
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
