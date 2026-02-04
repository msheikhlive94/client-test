'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project, ProjectInsert, ProjectUpdate, ProjectWithClient, ProjectStatus } from '@/types/database'
import { useWorkspace } from '@/lib/contexts/workspace-context'

export function useProjects(status?: ProjectStatus) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['projects', { status, workspaceId }],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('projects')
        .select('*, clients(*)')
        .order('updated_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as ProjectWithClient[]
    },
    enabled: !!workspaceId
  })
}

export function useActiveProjects() {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['projects', 'active', workspaceId],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('projects')
        .select('*, clients(*)')
        .in('status', ['active', 'on_hold'])
        .order('updated_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as ProjectWithClient[]
    },
    enabled: !!workspaceId
  })
}

export function useProject(id: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('projects')
        .select('*, clients(*)')
        .eq('id', id)
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query.single()
      
      if (error) throw error
      return data as ProjectWithClient
    },
    enabled: !!id
  })
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: ['projects', id, 'stats'],
    queryFn: async () => {
      const supabase = createClient()
      
      // Get time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('duration_minutes, billable')
        .eq('project_id', id)
      
      if (timeError) throw timeError

      // Get tasks
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', id)
      
      if (taskError) throw taskError

      // Get project for hourly rate
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('hourly_rate, budget_amount, budget_type')
        .eq('id', id)
        .single()
      
      if (projectError) throw projectError

      const totalMinutes = timeEntries?.reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0) || 0
      const billableMinutes = timeEntries?.filter((e: any) => e.billable).reduce((sum: number, e: any) => sum + (e.duration_minutes || 0), 0) || 0
      const hourlyRate = project?.hourly_rate || 85

      return {
        totalHours: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        billableAmount: (billableMinutes / 60) * hourlyRate,
        openTasks: tasks?.filter((t: any) => t.status !== 'done').length || 0,
        completedTasks: tasks?.filter((t: any) => t.status === 'done').length || 0,
        totalTasks: tasks?.length || 0,
        budgetAmount: project?.budget_amount,
        budgetType: project?.budget_type
      }
    },
    enabled: !!id
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  
  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...project, workspace_id: workspaceId! })
        .select('*, clients(*)')
        .single()
      
      if (error) throw error
      return data as ProjectWithClient
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProjectUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('*, clients(*)')
        .single()
      
      if (error) throw error
      return data as ProjectWithClient
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] })
    }
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
