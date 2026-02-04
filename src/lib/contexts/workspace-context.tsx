'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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

export interface ThemeConfig {
  dark: {
    primary: string
    primaryHover: string
    secondary: string
    background: string
    surface: string
    surfaceHover: string
    border: string
    text: string
    textSecondary: string
  }
  light: {
    primary: string
    primaryHover: string
    secondary: string
    background: string
    surface: string
    surfaceHover: string
    border: string
    text: string
    textSecondary: string
  }
  defaultMode: 'dark' | 'light'
}

export const defaultThemeConfig: ThemeConfig = {
  dark: {
    primary: '#10b981',
    primaryHover: '#059669',
    secondary: '#6366f1',
    background: '#0a0a0a',
    surface: '#171717',
    surfaceHover: '#262626',
    border: '#262626',
    text: '#fafafa',
    textSecondary: '#a3a3a3',
  },
  light: {
    primary: '#059669',
    primaryHover: '#047857',
    secondary: '#4f46e5',
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceHover: '#e5e5e5',
    border: '#e5e5e5',
    text: '#171717',
    textSecondary: '#525252',
  },
  defaultMode: 'dark',
}

export interface WorkspaceSettings {
  id: string
  company_name: string
  logo_url: string | null
  theme_config: ThemeConfig | null
  setup_completed_at: string | null
}

interface WorkspaceContextValue {
  workspace: Workspace | null
  workspaceId: string | null
  role: WorkspaceMemberRole | null
  isLoading: boolean
  settings: WorkspaceSettings | null
  refreshSettings: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

function applyBrandingCSS(themeConfig: ThemeConfig, resolvedTheme: 'dark' | 'light') {
  const config = themeConfig[resolvedTheme]
  const root = document.documentElement

  // Hex to rgba helper for muted variant
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  root.style.setProperty('--tf-brand', config.primary)
  root.style.setProperty('--tf-brand-hover', config.primaryHover)
  root.style.setProperty('--tf-brand-secondary', config.secondary)
  root.style.setProperty('--tf-brand-muted', hexToRgba(config.primary, 0.1))
  root.style.setProperty('--tf-surface', config.surface)
  root.style.setProperty('--tf-surface-hover', config.surfaceHover)
  root.style.setProperty('--tf-border', config.border)
  root.style.setProperty('--tf-text-primary', config.text)
  root.style.setProperty('--tf-text-secondary', config.textSecondary)
  root.style.setProperty('--tf-page-bg', config.background)
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [role, setRole] = useState<WorkspaceMemberRole | null>(null)
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .limit(1)
        .single()

      if (!error && data) {
        setSettings(data as WorkspaceSettings)

        // Apply branding if theme_config exists
        if (data.theme_config) {
          const resolvedTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
          applyBrandingCSS(data.theme_config as ThemeConfig, resolvedTheme)
        }
      }
    } catch (err) {
      console.warn('Could not load workspace settings:', err)
    }
  }, [])

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
        const { data: members, error } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces(*)')
          .eq('user_id', user.id)
          .limit(1)

        if (error) {
          console.warn('Could not fetch workspace membership:', error.message)
          setIsLoading(false)
          return
        }

        if (members && members.length > 0) {
          const member = members[0] as unknown as { workspace_id: string; role: WorkspaceMemberRole; workspaces: Workspace }
          setWorkspace(member.workspaces)
          setRole(member.role)
        }

        // Load workspace settings
        await loadSettings()
      } catch (err) {
        console.warn('Workspace context error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspace()
  }, [loadSettings])

  // Re-apply branding when theme changes
  useEffect(() => {
    if (!settings?.theme_config) return

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const resolvedTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
          applyBrandingCSS(settings.theme_config as ThemeConfig, resolvedTheme)
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [settings?.theme_config])

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      workspaceId: workspace?.id ?? null,
      role,
      isLoading,
      settings,
      refreshSettings: loadSettings,
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
    return { workspace: null, workspaceId: null, role: null, isLoading: false, settings: null, refreshSettings: async () => {} }
  }
  return ctx
}

/**
 * Get branding info (logo URL, theme config).
 * Safe to call outside WorkspaceProvider.
 */
export function useWorkspaceBranding() {
  const { settings } = useWorkspace()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const logoUrl = settings?.logo_url
    ? `${supabaseUrl}/storage/v1/object/public/brand-assets/${settings.logo_url}`
    : null

  return {
    logoUrl,
    themeConfig: settings?.theme_config ?? defaultThemeConfig,
    companyName: settings?.company_name ?? null,
  }
}
