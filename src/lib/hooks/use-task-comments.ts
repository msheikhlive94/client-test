'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TaskComment, TaskCommentInsert, TaskCommentUpdate } from '@/types/database'

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as TaskComment[]
    },
    enabled: !!taskId
  })
}

export function useTaskCommentCount(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId, 'count'],
    queryFn: async () => {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)

      if (error) throw error
      return count || 0
    },
    enabled: !!taskId
  })
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comment: TaskCommentInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_comments')
        .insert(comment)
        .select()
        .single()

      if (error) throw error
      return data as TaskComment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] })
    }
  })
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId, ...updates }: TaskCommentUpdate & { id: string; taskId: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_comments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, taskId } as TaskComment & { taskId: string }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] })
    }
  })
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, taskId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] })
    }
  })
}
