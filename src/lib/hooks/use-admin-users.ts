'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/contexts/workspace-context'

export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

export function useAdminUsers() {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['users', workspaceId],
    queryFn: async () => {
      const supabase = createClient()

      if (workspaceId) {
        // Fetch users who are members of this workspace
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)

        if (membersError) throw membersError

        const userIds = members?.map(m => m.user_id) || []
        if (userIds.length === 0) return [] as User[]

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
          .order('email')

        if (error) throw error
        return data as User[]
      }

      // Fallback: fetch all users (pre-migration or no workspace context)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('email')

      if (error) throw error
      return data as User[]
    },
    enabled: !!workspaceId
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as User
    },
    enabled: !!id
  })
}
