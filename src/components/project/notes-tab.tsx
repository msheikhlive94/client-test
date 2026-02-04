'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotes, useDeleteNote } from '@/lib/hooks'
import { Note, NoteType } from '@/types/database'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { NoteDialog } from '@/components/dialogs/note-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NotesTabProps {
  projectId: string
}

const noteTypeColors: Record<NoteType, string> = {
  general: 'bg-zinc-500',
  meeting: 'bg-blue-500',
  technical: 'bg-purple-500',
  decision: 'bg-brand'
}

const noteTypeLabels: Record<NoteType, string> = {
  general: 'General',
  meeting: 'Meeting',
  technical: 'Technical',
  decision: 'Decision'
}

export function NotesTab({ projectId }: NotesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | undefined>()
  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all')

  const { data: notes, isLoading } = useNotes(projectId)
  const deleteNote = useDeleteNote()

  const filteredNotes = typeFilter === 'all'
    ? notes
    : notes?.filter(n => n.note_type === typeFilter)

  const handleDelete = async (note: Note) => {
    try {
      await deleteNote.mutateAsync(note)
      toast.success('Note deleted')
    } catch (error) {
      toast.error('Failed to delete note')
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    setDialogOpen(true)
  }

  const handleNewNote = () => {
    setEditingNote(undefined)
    setDialogOpen(true)
  }

  return (
    <Card className="bg-surface-raised border-border-default">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['all', 'general', 'meeting', 'technical', 'decision'] as const).map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(type)}
                className={cn(
                  typeFilter === type
                    ? 'bg-brand hover:bg-brand-hover text-white'
                    : 'border-border-default text-text-secondary hover:bg-surface-hover'
                )}
              >
                {type === 'all' ? 'All' : noteTypeLabels[type]}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleNewNote}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>

        {/* Notes List */}
        {isLoading ? (
          <div className="text-text-secondary py-8 text-center">Loading notes...</div>
        ) : filteredNotes?.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-2 text-text-secondary">No notes yet</p>
            <Button
              onClick={handleNewNote}
              className="mt-4 bg-brand hover:bg-brand-hover text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Note
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredNotes?.map((note) => (
              <div
                key={note.id}
                onClick={() => handleEdit(note)}
                className="p-4 rounded-lg bg-input-bg hover:bg-surface-hover cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={cn(
                          'text-xs text-text-primary border-0',
                          noteTypeColors[note.note_type]
                        )}
                      >
                        {noteTypeLabels[note.note_type]}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {format(new Date(note.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <h3 className="font-medium text-text-primary mb-1">{note.title}</h3>
                    {note.content && (
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {note.content}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(note)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 hover:bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        note={editingNote}
      />
    </Card>
  )
}
