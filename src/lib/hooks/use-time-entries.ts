'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryInsert, TimeEntryUpdate } from '@/types/database'
import { useWorkspace } from '@/lib/contexts/workspace-context'
import { startOfWeek, endOfWeek, format } from 'date-fns'

// Extended type for time entries with relations
export type TimeEntryWithRelations = TimeEntry & {
  projects: { id: string; name: string; hourly_rate: number | null; clients: { name: string } | null } | null
  tasks: { id: string; title: string } | null
}

export function useTimeEntries(projectId?: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['time_entries', { projectId, workspaceId }],
    queryFn: async (): Promise<TimeEntryWithRelations[]> => {
      const supabase = createClient()
      let query = supabase
        .from('time_entries')
        .select('*, projects(id, name, hourly_rate, clients(name)), tasks(id, title)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as TimeEntryWithRelations[]
    },
    enabled: !!workspaceId
  })
}

export function useWeekTimeEntries(weekStart?: Date) {
  const { workspaceId } = useWorkspace()
  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(start, { weekStartsOn: 1 })
  
  return useQuery({
    queryKey: ['time_entries', 'week', format(start, 'yyyy-MM-dd'), workspaceId],
    queryFn: async (): Promise<TimeEntryWithRelations[]> => {
      const supabase = createClient()
      let query = supabase
        .from('time_entries')
        .select('*, projects(id, name, hourly_rate, clients(name)), tasks(id, title)')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date')
        .order('created_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as TimeEntryWithRelations[]
    },
    enabled: !!workspaceId
  })
}

export function useTimeStats(startDate?: string, endDate?: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['time_entries', 'stats', startDate, endDate, workspaceId],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('time_entries')
        .select('duration_minutes, billable, project_id, projects(hourly_rate)')
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const entries = data || []
      const totalMinutes = entries.reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0)
      const billableMinutes = entries.filter((e: any) => e.billable).reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0)
      
      // Calculate billable amount with project rates
      let billableAmount = 0
      entries.filter((e: any) => e.billable).forEach((e: any) => {
        const rate = e.projects?.hourly_rate || 85
        billableAmount += ((e.duration_minutes || 0) / 60) * rate
      })
      
      return {
        totalHours: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        billableAmount,
        entriesCount: entries.length
      }
    },
    enabled: !!workspaceId
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  
  return useMutation({
    mutationFn: async (entry: TimeEntryInsert) => {
      const supabase = createClient()
      const insertData = workspaceId ? { ...entry, workspace_id: workspaceId } : entry
      const { data, error } = await supabase
        .from('time_entries')
        .insert(insertData)
        .select('*, projects(id, name, hourly_rate, clients(name)), tasks(id, title)')
        .single()
      
      if (error) throw error
      return data as TimeEntryWithRelations
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.project_id, 'stats'] })
    }
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TimeEntryUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', id)
        .select('*, projects(id, name, hourly_rate, clients(name)), tasks(id, title)')
        .single()
      
      if (error) throw error
      return data as TimeEntryWithRelations
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as TimeEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
