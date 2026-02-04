'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadInsert, LeadUpdate, LeadStatus } from '@/types/database'

export function useLeads(status?: LeadStatus) {
  return useQuery({
    queryKey: ['leads', { status }],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as Lead[]
    }
  })
}

export function useNewLeads() {
  return useQuery({
    queryKey: ['leads', 'new'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('status', ['new', 'contacted', 'qualified'])
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Lead[]
    }
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as Lead
    },
    enabled: !!id
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single()
      
      if (error) throw error
      return data as Lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Lead
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['leads', data.id] })
    }
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }
  })
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ leadId, clientData, projectData }: {
      leadId: string
      clientData: { name: string; contact_name: string; email: string; phone?: string; website?: string }
      projectData: { name: string; description?: string; project_type?: string; budget_type?: string; budget_amount?: number }
    }) => {
      const supabase = createClient()
      
      // Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: clientData.name,
          contact_name: clientData.contact_name,
          email: clientData.email,
          phone: clientData.phone,
          notes: `Website: ${clientData.website || 'N/A'}`
        })
        .select()
        .single()
      
      if (clientError) throw clientError
      
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: client.id,
          name: projectData.name,
          description: projectData.description,
          project_type: projectData.project_type || 'other',
          budget_type: projectData.budget_type || 'hourly',
          budget_amount: projectData.budget_amount,
          status: 'draft'
        })
        .select()
        .single()
      
      if (projectError) throw projectError
      
      // Update lead as converted
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_client_id: client.id,
          converted_project_id: project.id
        })
        .eq('id', leadId)
        .select()
        .single()
      
      if (leadError) throw leadError
      
      return { lead, client, project }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
