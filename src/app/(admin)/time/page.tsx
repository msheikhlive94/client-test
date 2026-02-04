'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWeekTimeEntries, useTimeStats, useProjects, useDeleteTimeEntry, TimeEntryWithRelations } from '@/lib/hooks'
import { TimeEntry } from '@/types/database'
import { Plus, ChevronLeft, ChevronRight, Clock, DollarSign, Trash2 } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns'
import { TimeEntryDialog } from '@/components/dialogs/time-entry-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function TimePage() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [editingEntry, setEditingEntry] = useState<TimeEntry | undefined>()

  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: currentWeek, end: weekEnd })

  const { data: entries, isLoading } = useWeekTimeEntries(currentWeek)
  const { data: weekStats } = useTimeStats(
    format(currentWeek, 'yyyy-MM-dd'),
    format(weekEnd, 'yyyy-MM-dd')
  )
  const { data: projects } = useProjects()
  const deleteEntry = useDeleteTimeEntry()

  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const getEntriesForDay = (day: Date): TimeEntryWithRelations[] => {
    return entries?.filter(e => isSameDay(new Date(e.date), day)) || []
  }

  const getDayTotal = (day: Date): number => {
    return getEntriesForDay(day).reduce((sum, e) => sum + e.duration_minutes, 0)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const handleNewEntry = () => {
    setEditingEntry(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (entry: TimeEntryWithRelations) => {
    setEditingEntry(entry as TimeEntry)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteEntry.mutateAsync(id)
      toast.success('Time entry deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'on_hold')

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Time Tracking</h1>
          <p className="text-sm md:text-base text-zinc-400">Track your work hours</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-full sm:w-48 bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {activeProjects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleNewEntry}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            disabled={!selectedProjectId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-3">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">This Week</CardTitle>
            <Clock className="h-4 w-4 text-blue-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-white">
              {weekStats?.totalHours.toFixed(1) || '0'}h
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              {weekStats?.entriesCount || 0} entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Billable</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-white">
              {weekStats?.billableHours.toFixed(1) || '0'}h
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              {weekStats?.totalHours ? ((weekStats.billableHours / weekStats.totalHours) * 100).toFixed(0) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-white">
              €{weekStats?.billableAmount.toFixed(0) || '0'}
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevWeek}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextWeek}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs h-8"
              >
                Today
              </Button>
            </div>
            <h2 className="text-sm md:text-lg font-semibold text-white text-center order-first sm:order-none">
              {format(currentWeek, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </h2>
            <div className="text-zinc-400 text-sm text-center sm:text-right">
              Total: <span className="font-bold text-white">{formatDuration(weekStats?.totalHours ? weekStats.totalHours * 60 : 0)}</span>
            </div>
          </div>

          {/* Week Grid - Desktop */}
          {isLoading ? (
            <div className="text-zinc-400 py-8 text-center">Loading...</div>
          ) : (
            <>
              {/* Desktop Grid */}
              <div className="hidden lg:grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const dayEntries = getEntriesForDay(day)
                  const dayTotal = getDayTotal(day)
                  const isToday = isSameDay(day, new Date())
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'rounded-lg p-3 min-h-[150px]',
                        isToday ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-zinc-900'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className={cn(
                            'text-xs',
                            isToday ? 'text-emerald-400' : 'text-zinc-500'
                          )}>
                            {format(day, 'EEE')}
                          </p>
                          <p className={cn(
                            'text-lg font-semibold',
                            isToday ? 'text-emerald-400' : 'text-white'
                          )}>
                            {format(day, 'd')}
                          </p>
                        </div>
                        {dayTotal > 0 && (
                          <span className="text-sm font-medium text-zinc-400">
                            {formatDuration(dayTotal)}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEntries.map((entry: any) => (
                          <div
                            key={entry.id}
                            onClick={() => handleEdit(entry)}
                            className="p-2 rounded bg-zinc-800 hover:bg-zinc-750 cursor-pointer text-xs group relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                'font-medium truncate',
                                entry.billable ? 'text-emerald-400' : 'text-zinc-400'
                              )}>
                                {entry.projects?.name}
                              </span>
                              <span className="text-zinc-500 ml-1">
                                {formatDuration(entry.duration_minutes)}
                              </span>
                            </div>
                            {entry.description && (
                              <p className="text-zinc-500 truncate mt-1">
                                {entry.description}
                              </p>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(entry.id, e)}
                              className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-transparent"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mobile List */}
              <div className="lg:hidden space-y-2">
                {days.map((day) => {
                  const dayEntries = getEntriesForDay(day)
                  const dayTotal = getDayTotal(day)
                  const isToday = isSameDay(day, new Date())
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'rounded-lg p-3',
                        isToday ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-zinc-900'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'text-lg font-semibold',
                            isToday ? 'text-emerald-400' : 'text-white'
                          )}>
                            {format(day, 'd')}
                          </p>
                          <p className={cn(
                            'text-sm',
                            isToday ? 'text-emerald-400' : 'text-zinc-500'
                          )}>
                            {format(day, 'EEEE')}
                          </p>
                        </div>
                        {dayTotal > 0 && (
                          <span className="text-sm font-medium text-zinc-400">
                            {formatDuration(dayTotal)}
                          </span>
                        )}
                      </div>
                      
                      {dayEntries.length > 0 ? (
                        <div className="space-y-2">
                          {dayEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              onClick={() => handleEdit(entry)}
                              className="p-2 rounded bg-zinc-800 hover:bg-zinc-750 cursor-pointer text-sm flex items-center justify-between"
                            >
                              <div className="flex-1 min-w-0">
                                <span className={cn(
                                  'font-medium',
                                  entry.billable ? 'text-emerald-400' : 'text-zinc-400'
                                )}>
                                  {entry.projects?.name}
                                </span>
                                {entry.description && (
                                  <p className="text-zinc-500 truncate text-xs mt-1">
                                    {entry.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-zinc-400 text-sm">
                                  {formatDuration(entry.duration_minutes)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleDelete(entry.id, e)}
                                  className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500 hover:bg-transparent"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-sm">No entries</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedProjectId && (
        <TimeEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={selectedProjectId}
          entry={editingEntry}
        />
      )}
    </div>
  )
}
