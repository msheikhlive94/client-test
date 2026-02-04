'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Client, ClientInsert, ClientUpdate } from '@/types/database'
import { useWorkspace } from '@/lib/contexts/workspace-context'

export function useClients() {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['clients', workspaceId],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('clients')
        .select('*')
        .order('name')
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Client[]
    },
    enabled: !!workspaceId
  })
}

export function useClient(id: string) {
  const { workspaceId } = useWorkspace()

  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('clients')
        .select('*')
        .eq('id', id)
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      }
      
      const { data, error } = await query.single()
      
      if (error) throw error
      return data as Client
    },
    enabled: !!id
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  
  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, workspace_id: workspaceId! })
        .select()
        .single()
      
      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    }
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Client
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] })
    }
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    }
  })
}
