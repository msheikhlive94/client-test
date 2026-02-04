'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Note, NoteInsert, NoteUpdate } from '@/types/database'

export function useNotes(projectId: string) {
  return useQuery({
    queryKey: ['notes', { projectId }],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Note[]
    },
    enabled: !!projectId
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['notes', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .select('*, projects(id, name)')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (note: NoteInsert) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .insert(note)
        .select()
        .single()
      
      if (error) throw error
      return data as Note
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes', { projectId: data.project_id }] })
    }
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: NoteUpdate & { id: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Note
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes', { projectId: data.project_id }] })
      queryClient.invalidateQueries({ queryKey: ['notes', data.id] })
    }
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (note: Note) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
      
      if (error) throw error
      return note
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ['notes', { projectId: note.project_id }] })
    }
  })
}
