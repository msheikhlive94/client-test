export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectType = 'automation' | 'internal_system' | 'mvp' | 'ai_agent' | 'consulting' | 'other'
export type BudgetType = 'fixed' | 'hourly' | 'retainer'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NoteType = 'general' | 'meeting' | 'technical' | 'decision'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
export type BudgetRange = 'under_5k' | '5k_10k' | '10k_25k' | '25k_50k' | '50k_plus' | 'not_sure'
export type ProjectTimeline = 'asap' | '1_month' | '2_3_months' | '3_6_months' | 'flexible'
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string | null
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string | null
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceMemberRole
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: WorkspaceMemberRole
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: WorkspaceMemberRole
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          company: string | null
          address: string | null
          notes: string | null
          workspace_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          notes?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          notes?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          client_id: string | null
          name: string
          description: string | null
          status: ProjectStatus
          project_type: ProjectType
          budget_type: BudgetType
          budget_amount: number | null
          hourly_rate: number | null
          estimated_hours: number | null
          start_date: string | null
          end_date: string | null
          workspace_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          name: string
          description?: string | null
          status?: ProjectStatus
          project_type?: ProjectType
          budget_type?: BudgetType
          budget_amount?: number | null
          hourly_rate?: number | null
          estimated_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          name?: string
          description?: string | null
          status?: ProjectStatus
          project_type?: ProjectType
          budget_type?: BudgetType
          budget_amount?: number | null
          hourly_rate?: number | null
          estimated_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          parent_task_id: string | null
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          estimated_hours: number | null
          due_date: string | null
          position: number
          assigned_to: string | null
          workspace_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_task_id?: string | null
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          estimated_hours?: number | null
          due_date?: string | null
          position?: number
          assigned_to?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_task_id?: string | null
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          estimated_hours?: number | null
          due_date?: string | null
          position?: number
          assigned_to?: string | null
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          description: string | null
          duration_minutes: number
          date: string
          billable: boolean
          workspace_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          description?: string | null
          duration_minutes: number
          date?: string
          billable?: boolean
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          description?: string | null
          duration_minutes?: number
          date?: string
          billable?: boolean
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string | null
          note_type: NoteType
          workspace_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          content?: string | null
          note_type?: NoteType
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string | null
          note_type?: NoteType
          workspace_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      project_stats: {
        Row: {
          id: string
          name: string
          status: ProjectStatus
          budget_amount: number | null
          hourly_rate: number | null
          estimated_hours: number | null
          total_minutes: number
          total_hours: number
          billable_amount: number
          open_tasks: number
          completed_tasks: number
        }
      }
    }
    Functions: {}
    Enums: {
      project_status: ProjectStatus
      project_type: ProjectType
      budget_type: BudgetType
      task_status: TaskStatus
      task_priority: TaskPriority
      note_type: NoteType
      workspace_member_role: WorkspaceMemberRole
    }
  }
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert']
export type WorkspaceMemberUpdate = Database['public']['Tables']['workspace_members']['Update']

export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type TimeEntryInsert = Database['public']['Tables']['time_entries']['Insert']
export type TimeEntryUpdate = Database['public']['Tables']['time_entries']['Update']

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']

export type ProjectStats = Database['public']['Views']['project_stats']['Row']

// Lead types (with workspace_id)
export interface Lead {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  website: string | null
  project_description: string | null
  project_type: ProjectType
  budget_range: BudgetRange | null
  timeline: ProjectTimeline | null
  source: string | null
  referral: string | null
  status: LeadStatus
  notes: string | null
  converted_client_id: string | null
  converted_project_id: string | null
  intake_token: string | null
  token_used_at: string | null
  workspace_id: string
  created_at: string
  updated_at: string
}

export interface LeadInsert {
  company_name: string
  contact_name: string
  email: string
  phone?: string | null
  website?: string | null
  project_description?: string | null
  project_type?: ProjectType
  budget_range?: BudgetRange | null
  timeline?: ProjectTimeline | null
  source?: string | null
  referral?: string | null
  status?: LeadStatus
  notes?: string | null
  intake_token?: string | null
  workspace_id?: string
}

export interface LeadUpdate {
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string | null
  website?: string | null
  project_description?: string | null
  project_type?: ProjectType
  budget_range?: BudgetRange | null
  timeline?: ProjectTimeline | null
  source?: string | null
  referral?: string | null
  status?: LeadStatus
  notes?: string | null
  converted_client_id?: string | null
  converted_project_id?: string | null
  workspace_id?: string
}

export interface IntakeLink {
  id: string
  token: string
  label: string | null
  expires_at: string | null
  max_uses: number | null
  use_count: number
  is_active: boolean
  workspace_id: string
  created_at: string
}

export interface IntakeLinkInsert {
  token: string
  label?: string | null
  expires_at?: string | null
  max_uses?: number | null
  is_active?: boolean
  workspace_id?: string
}

// Client Portal types
export interface ClientUser {
  id: string
  user_id: string
  client_id: string
  role: 'viewer' | 'admin'
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  created_at: string
  name: string | null
}

export interface ClientInvitation {
  id: string
  client_id: string
  email: string
  token: string
  role: 'viewer' | 'admin'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface ClientInvitationInsert {
  client_id: string
  email: string
  token: string
  role?: 'viewer' | 'admin'
  expires_at: string
}

// Extended types with relations
export type ProjectWithClient = Project & {
  clients: Client | null
}

export type ProjectWithStats = Project & {
  clients: Client | null
  total_hours?: number
  billable_amount?: number
  open_tasks?: number
  completed_tasks?: number
}

export type TaskWithProject = Task & {
  projects: Project
}

export type TaskWithAssignee = Task & {
  users: User | null
}

// Task Comments types
export type CommentAuthorType = 'admin' | 'client'

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  author_type: CommentAuthorType
  author_name: string | null
  created_at: string
  updated_at: string
}

export interface TaskCommentInsert {
  task_id: string
  user_id: string
  content: string
  author_type: CommentAuthorType
  author_name?: string | null
}

export interface TaskCommentUpdate {
  content?: string
}
