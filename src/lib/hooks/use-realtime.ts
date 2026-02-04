'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to Supabase Realtime postgres_changes for a table.
 * On any INSERT, UPDATE, or DELETE, invalidates the specified React Query keys.
 *
 * @param table - The Postgres table name to subscribe to
 * @param filter - Optional filter string (e.g. "project_id=eq.abc-123")
 * @param queryKeys - Array of React Query keys to invalidate on changes
 * @param enabled - Whether the subscription should be active (default: true)
 */
export function useRealtimeSubscription(
  table: string,
  filter: string | undefined,
  queryKeys: unknown[][],
  enabled: boolean = true
) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = filter
      ? `realtime-${table}-${filter}`
      : `realtime-${table}`

    // Build the subscription config
    const subscriptionConfig: {
      event: '*'
      schema: 'public'
      table: string
      filter?: string
    } = {
      event: '*',
      schema: 'public',
      table,
    }

    if (filter) {
      subscriptionConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', subscriptionConfig, () => {
        // Invalidate all specified query keys to trigger refetch
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // Serialize queryKeys for dependency comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled, queryClient, JSON.stringify(queryKeys)])
}

/**
 * Subscribe to realtime changes on the tasks table for a specific project.
 * Invalidates all task-related queries for that project.
 */
export function useRealtimeTasks(projectId: string) {
  useRealtimeSubscription(
    'tasks',
    `project_id=eq.${projectId}`,
    [
      ['tasks', { projectId }],
      ['tasks', { projectId, grouped: true }],
      ['tasks', 'upcoming'],
      ['projects', projectId, 'stats'],
    ],
    !!projectId
  )
}

/**
 * Subscribe to realtime changes on the task_comments table for a specific task.
 * Invalidates comment queries for that task.
 */
export function useRealtimeTaskComments(taskId: string) {
  useRealtimeSubscription(
    'task_comments',
    `task_id=eq.${taskId}`,
    [
      ['task-comments', taskId],
      ['task-comments', taskId, 'count'],
    ],
    !!taskId
  )
}
