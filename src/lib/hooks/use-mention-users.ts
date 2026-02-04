'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/lib/contexts/workspace-context'

export interface MentionableUser {
  id: string
  email: string
  name: string | null
  type: 'admin' | 'client'
}

/**
 * Fetch all users who can be @mentioned in a project's comments.
 * This includes admin users (from the `users` table, filtered by workspace membership
 * when available) and client users (from `client_users` linked to the project's client).
 */
export function useMentionUsers(projectId: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['mention-users', projectId, workspaceId],
    queryFn: async () => {
      const supabase = createClient()
      const mentionableUsers: MentionableUser[] = []

      // 1. Get admin users — filtered by workspace membership when available
      if (workspaceId) {
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)

        if (!membersError && members && members.length > 0) {
          const userIds = members.map(m => m.user_id)
          const { data: adminUsers, error: adminError } = await supabase
            .from('users')
            .select('id, email, name')
            .in('id', userIds)
            .order('email')

          if (!adminError && adminUsers) {
            for (const u of adminUsers) {
              mentionableUsers.push({
                id: u.id,
                email: u.email,
                name: u.name,
                type: 'admin'
              })
            }
          }
        }
      } else {
        // Fallback: fetch all admin users (pre-migration or portal context)
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('id, email, name')
          .order('email')

        if (adminError) throw adminError

        if (adminUsers) {
          for (const u of adminUsers) {
            mentionableUsers.push({
              id: u.id,
              email: u.email,
              name: u.name,
              type: 'admin'
            })
          }
        }
      }

      // 2. Get project to find client_id
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // 3. Get client users if project has a client
      if (project?.client_id) {
        const { data: clientUsers, error: clientError } = await supabase
          .from('client_users')
          .select('user_id, name')
          .eq('client_id', project.client_id)

        if (clientError) throw clientError

        if (clientUsers) {
          for (const cu of clientUsers) {
            // Skip if already in the list (admin who is also a client user)
            if (mentionableUsers.some(u => u.id === cu.user_id)) continue

            mentionableUsers.push({
              id: cu.user_id,
              email: '', // Will be resolved server-side if needed
              name: cu.name || 'Client User',
              type: 'client'
            })
          }
        }
      }

      return mentionableUsers
    },
    enabled: !!projectId
  })
}
