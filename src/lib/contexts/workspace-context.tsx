'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member'

export interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string | null
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WorkspaceMembership {
  workspace_id: string
  role: WorkspaceMemberRole
  workspace: Workspace
}

interface WorkspaceContextValue {
  workspace: Workspace | null
  workspaceId: string | null
  role: WorkspaceMemberRole | null
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [role, setRole] = useState<WorkspaceMemberRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIsLoading(false)
          return
        }

        // Try to fetch workspace membership
        // Gracefully handle the case where the table might not exist yet
        const { data: members, error } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces(*)')
          .eq('user_id', user.id)
          .limit(1)

        if (error) {
          // Table might not exist yet (migration not applied)
          console.warn('Could not fetch workspace membership:', error.message)
          setIsLoading(false)
          return
        }

        if (members && members.length > 0) {
          const member = members[0] as unknown as { workspace_id: string; role: WorkspaceMemberRole; workspaces: Workspace }
          setWorkspace(member.workspaces)
          setRole(member.role)
        }
      } catch (err) {
        console.warn('Workspace context error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspace()
  }, [])

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      workspaceId: workspace?.id ?? null,
      role,
      isLoading,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

/**
 * Access the current workspace context.
 * Safe to call outside of WorkspaceProvider — returns null/false defaults.
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    // Not inside WorkspaceProvider (e.g. portal pages) — return safe defaults
    return { workspace: null, workspaceId: null, role: null, isLoading: false }
  }
  return ctx
}
