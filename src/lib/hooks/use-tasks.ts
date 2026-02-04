'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskInsert, TaskUpdate, TaskStatus, TaskWithAssignee } from '@/types/database'
import { useWorkspace } from '@/lib/contexts/workspace-context'

export function useTasks(projectId: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['tasks', { projectId }],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select('*, users(id, email, name)')
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('position')
        .order('created_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as TaskWithAssignee[]
    },
    enabled: !!projectId
  })
}

export function useTasksByStatus(projectId: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['tasks', { projectId, grouped: true }],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select('*, users(id, email, name)')
        .eq('project_id', projectId)
        .is('parent_task_id', null)
        .order('position')
        .order('created_at', { ascending: false })
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const tasks = data as TaskWithAssignee[]
      return {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        review: tasks.filter(t => t.status === 'review'),
        done: tasks.filter(t => t.status === 'done')
      }
    },
    enabled: !!projectId
  })
}

export function useSubtasks(parentTaskId: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['tasks', 'subtasks', parentTaskId],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTaskId)
        .order('position')
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Task[]
    },
    enabled: !!parentTaskId
  })
}

export function useTask(id: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('tasks')
        .select('*, projects(*)')
        .eq('id', id)
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query.single()
      
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useUpcomingTasks(days: number = 7) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['tasks', 'upcoming', days, workspaceId],
    queryFn: async () => {
      const supabase = createClient()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)
      
      let query = supabase
        .from('tasks')
        .select('*, projects(id, name, client_id, clients(name))')
        .not('status', 'eq', 'done')
        .not('due_date', 'is', null)
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date')
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data
    },
    enabled: !!workspaceId
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const supabase = createClient()
      const insertData = workspaceId ? { ...task, workspace_id: workspaceId } : task
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single()
      
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: data.project_id }] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.project_id, 'stats'] })
    }
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.project_id, 'stats'] })
    }
  })
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; status?: TaskStatus; position?: number }>) => {
      const supabase = createClient()
      const promises = updates.map(({ id, ...data }) =>
        supabase.from('tasks').update(data).eq('id', id)
      )
      await Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (task: Task) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
      
      if (error) throw error
      return task
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: task.project_id }] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['projects', task.project_id, 'stats'] })
    }
  })
}
