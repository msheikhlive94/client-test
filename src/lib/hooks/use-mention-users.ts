'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface MentionableUser {
  id: string
  email: string
  name: string | null
  type: 'admin' | 'client'
}

/**
 * Fetch all users who can be @mentioned in a project's comments.
 * This includes admin users (from the `users` table) and client users
 * (from `client_users` linked to the project's client).
 */
export function useMentionUsers(projectId: string) {
  return useQuery({
    queryKey: ['mention-users', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const mentionableUsers: MentionableUser[] = []

      // 1. Get all admin users
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
          // For each client user, get their auth email
          // We need to fetch from auth - but since we can't access auth.users directly from client,
          // we'll check if they're already in our admin users list, if not add them
          for (const cu of clientUsers) {
            // Skip if already in the list (admin who is also a client user)
            if (mentionableUsers.some(u => u.id === cu.user_id)) continue

            // We don't have direct access to auth.users from the client,
            // so we use the name from client_users and the user_id
            // The email will be fetched from the notify API (server-side)
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
