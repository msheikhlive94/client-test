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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateNote, useUpdateNote } from '@/lib/hooks'
import { Note, NoteType } from '@/types/database'
import { toast } from 'sonner'

interface NoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  note?: Note
}

const defaultValues = {
  title: '',
  content: '',
  note_type: 'general' as NoteType
}

export function NoteDialog({ open, onOpenChange, projectId, note }: NoteDialogProps) {
  const [formData, setFormData] = useState(defaultValues)
  
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content || '',
        note_type: note.note_type
      })
    } else {
      setFormData(defaultValues)
    }
  }, [note, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const data = {
        ...formData,
        project_id: projectId,
        content: formData.content || null
      }

      if (note) {
        await updateNote.mutateAsync({ id: note.id, ...data })
        toast.success('Note updated')
      } else {
        await createNote.mutateAsync(data)
        toast.success('Note created')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Something went wrong')
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'New Note'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Meeting notes - Jan 30"
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.note_type}
                onValueChange={(v) => setFormData({ ...formData, note_type: v as NoteType })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your notes here... (Markdown supported)"
              className="bg-zinc-800 border-zinc-700 min-h-[200px] font-mono text-sm"
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
              disabled={createNote.isPending || updateNote.isPending}
            >
              {note ? 'Update' : 'Create'} Note
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
