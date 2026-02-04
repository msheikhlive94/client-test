'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('email')
      
      if (error) throw error
      return data as User[]
    }
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
