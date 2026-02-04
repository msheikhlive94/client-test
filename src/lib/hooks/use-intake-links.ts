'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { IntakeLink, IntakeLinkInsert } from '@/types/database'

function generateToken(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function useIntakeLinks() {
  return useQuery({
    queryKey: ['intake_links'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('intake_links')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as IntakeLink[]
    }
  })
}

export function useIntakeLink(token: string) {
  return useQuery({
    queryKey: ['intake_links', token],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('intake_links')
        .select('*')
        .eq('token', token)
        .single()
      
      if (error) throw error
      return data as IntakeLink
    },
    enabled: !!token
  })
}

export function useValidateIntakeToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('intake_links')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single()
      
      if (error) throw new Error('Invalid or expired link')
      
      const link = data as IntakeLink
      
      // Check expiry
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        throw new Error('This link has expired')
      }
      
      // Check max uses
      if (link.max_uses && link.use_count >= link.max_uses) {
        throw new Error('This link has reached its maximum uses')
      }
      
      return link
    }
  })
}

export function useCreateIntakeLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (options?: { label?: string; expires_at?: string; max_uses?: number }) => {
      const supabase = createClient()
      const token = generateToken()
      
      const { data, error } = await supabase
        .from('intake_links')
        .insert({
          token,
          label: options?.label,
          expires_at: options?.expires_at,
          max_uses: options?.max_uses,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      return data as IntakeLink
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake_links'] })
    }
  })
}

export function useIncrementLinkUse() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (token: string) => {
      const supabase = createClient()
      
      // Get current count
      const { data: link, error: getError } = await supabase
        .from('intake_links')
        .select('use_count')
        .eq('token', token)
        .single()
      
      if (getError) throw getError
      
      // Increment
      const { data, error } = await supabase
        .from('intake_links')
        .update({ use_count: (link.use_count || 0) + 1 })
        .eq('token', token)
        .select()
        .single()
      
      if (error) throw error
      return data as IntakeLink
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake_links'] })
    }
  })
}

export function useDeactivateIntakeLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('intake_links')
        .update({ is_active: false })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake_links'] })
    }
  })
}
