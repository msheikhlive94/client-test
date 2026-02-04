'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ClientUser, ClientInvitation, ClientInvitationInsert, Project, Client } from '@/types/database'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

function generateToken(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Hook to get current auth user
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      // Handle stale JWT tokens (user_not_found)
      if (error && error.message.includes('User from sub claim in JWT does not exist')) {
        console.warn('Stale JWT detected, clearing session...')
        supabase.auth.signOut().then(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/portal/login?error=session_expired'
          }
        })
        return
      }
      
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}

// Get client access for a user
export function useClientAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['client_access', userId],
    queryFn: async () => {
      if (!userId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('client_users')
        .select('*, clients(*)')
        .eq('user_id', userId)
      
      if (error) throw error
      return data as (ClientUser & { clients: Client })[]
    },
    enabled: !!userId
  })
}

// Get projects for a client user
export function useClientProjects(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_projects', clientId],
    queryFn: async () => {
      if (!clientId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data as Project[]
    },
    enabled: !!clientId
  })
}

// Get invitations for a client
export function useClientInvitations(clientId: string) {
  return useQuery({
    queryKey: ['client_invitations', clientId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('client_id', clientId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as ClientInvitation[]
    },
    enabled: !!clientId
  })
}

// Create invitation
export function useCreateInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ clientId, email, role = 'viewer' }: { clientId: string; email: string; role?: 'viewer' | 'admin' }) => {
      const supabase = createClient()
      const token = generateToken()
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      
      const { data, error } = await supabase
        .from('client_invitations')
        .insert({
          client_id: clientId,
          email,
          token,
          role,
          expires_at
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Send invitation email
      try {
        const response = await fetch('/api/invitations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitationId: data.id })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to send invitation email')
        }
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the whole operation if email fails
        // The invitation is still created, admin can resend manually
      }
      
      return data as ClientInvitation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_invitations', data.client_id] })
    }
  })
}

// Validate invitation token
export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null
      const supabase = createClient()
      
      // Find invitation by token (accepted or not)
      const { data, error } = await supabase
        .from('client_invitations')
        .select('*, clients(name)')
        .eq('token', token)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Invitation not found')
        }
        throw error
      }
      
      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Invitation expired')
      }
      
      // If already accepted, check if current user has access
      if (data.accepted_at) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check if this user already has access to this client
          const { data: existingAccess } = await supabase
            .from('client_users')
            .select('id')
            .eq('user_id', user.id)
            .eq('client_id', data.client_id)
            .single()
          
          if (existingAccess) {
            // User already has access, allow them to continue
            return data as ClientInvitation & { clients: { name: string } }
          }
        }
        
        // Invitation was accepted by someone else
        throw new Error('Invitation already used')
      }
      
      return data as ClientInvitation & { clients: { name: string } }
    },
    enabled: !!token,
    retry: false
  })
}

// Accept invitation (after signup/login)
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ token, userId, name }: { token: string; userId: string; name?: string }) => {
      const supabase = createClient()
      
      // Get invitation
      const { data: invitation, error: invError } = await supabase
        .from('client_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .single()
      
      if (invError || !invitation) throw new Error('Invalid invitation')
      
      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation expired')
      }
      
      // Create client_user link with name
      const { error: linkError } = await supabase
        .from('client_users')
        .insert({
          user_id: userId,
          client_id: invitation.client_id,
          role: invitation.role,
          invited_by: invitation.email,
          accepted_at: new Date().toISOString(),
          name: name || null
        })
      
      if (linkError) throw linkError
      
      // Mark invitation as accepted
      await supabase
        .from('client_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
      
      return invitation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_access'] })
      queryClient.invalidateQueries({ queryKey: ['client_invitations'] })
    }
  })
}

// Sign up client
export function useClientSignUp() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`
        }
      })
      
      if (error) throw error
      return data
    }
  })
}

// Sign in client
export function useClientSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return data
    }
  })
}

// Sign out
export function useSignOut() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear()
    }
  })
}

// Get client users (who has access to a client)
export function useClientUsers(clientId: string) {
  return useQuery({
    queryKey: ['client_users', clientId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('client_id', clientId)
      
      if (error) throw error
      return data as ClientUser[]
    },
    enabled: !!clientId
  })
}

// Remove client user access
export function useRemoveClientAccess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_users'] })
    }
  })
}
