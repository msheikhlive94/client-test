'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTimeEntries, useDeleteTimeEntry } from '@/lib/hooks'
import { TimeEntry } from '@/types/database'
import { Plus, Clock, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { TimeEntryDialog } from '@/components/dialogs/time-entry-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TimeTabProps {
  projectId: string
  hourlyRate: number
}

export function TimeTab({ projectId, hourlyRate }: TimeTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()

  const { data: entries, isLoading } = useTimeEntries(projectId)
  const deleteEntry = useDeleteTimeEntry()

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id)
      toast.success('Time entry deleted')
    } catch (error) {
      toast.error('Failed to delete time entry')
    }
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  const handleNewEntry = () => {
    setEditingEntry(undefined)
    setDialogOpen(true)
  }

  const totalMinutes = entries?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0
  const billableMinutes = entries?.filter(e => e.billable).reduce((sum, e) => sum + e.duration_minutes, 0) || 0

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Group entries by date
  const entriesByDate = entries?.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {} as Record<string, typeof entries>)

  return (
    <Card className="bg-surface-raised border-border-default">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-text-secondary">Total Time</p>
              <p className="text-xl font-bold text-text-primary">{formatDuration(totalMinutes)}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Billable</p>
              <p className="text-xl font-bold text-brand">
                €{((billableMinutes / 60) * hourlyRate).toFixed(0)}
              </p>
            </div>
          </div>
          <Button
            onClick={handleNewEntry}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        </div>

        {/* Time Entries */}
        {isLoading ? (
          <div className="text-text-secondary py-8 text-center">Loading time entries...</div>
        ) : !entries?.length ? (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-2 text-text-secondary">No time logged yet</p>
            <Button
              onClick={handleNewEntry}
              className="mt-4 bg-brand hover:bg-brand-hover text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Log First Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(entriesByDate || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateEntries]) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-text-secondary">
                      {format(new Date(date), 'EEEE, MMMM d')}
                    </h3>
                    <span className="text-sm text-text-muted">
                      {formatDuration(dateEntries?.reduce((s, e) => s + e.duration_minutes, 0) || 0)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dateEntries?.map((entry: any) => (
                      <div
                        key={entry.id}
                        onClick={() => handleEdit(entry)}
                        className="flex items-center justify-between p-3 rounded-lg bg-input-bg hover:bg-surface-hover cursor-pointer group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary">
                              {entry.description || 'No description'}
                            </span>
                            {entry.tasks && (
                              <span className="text-sm text-text-muted">
                                • {entry.tasks.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            'text-sm',
                            entry.billable ? 'text-brand' : 'text-text-muted'
                          )}>
                            {entry.billable ? 'Billable' : 'Non-billable'}
                          </span>
                          <span className="font-mono text-text-primary">
                            {formatDuration(entry.duration_minutes)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(entry.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 hover:bg-transparent"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>

      <TimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        entry={editingEntry}
      />
    </Card>
  )
}
