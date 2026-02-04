'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Palette, Upload, Loader2, Check, RotateCcw, Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { appConfig } from '@/lib/config/theme'
import { useWorkspace, useWorkspaceBranding, defaultThemeConfig, ThemeConfig } from '@/lib/contexts/workspace-context'
import { useTheme } from '@/lib/contexts/theme-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Color picker for a single color
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded-md border border-border-default cursor-pointer flex-shrink-0 relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-text-secondary">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-input-bg border-border-default font-mono"
          maxLength={7}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, refreshSettings } = useWorkspace()
  const { logoUrl } = useWorkspaceBranding()
  const { resolvedTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  // Branding state
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultThemeConfig)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  // Initialize from settings
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '')
      if (settings.theme_config) {
        setThemeConfig(settings.theme_config)
      }
    }
  }, [settings])

  // Live preview: apply theme config as CSS variables whenever it changes
  useEffect(() => {
    const config = themeConfig[resolvedTheme as 'dark' | 'light']
    if (!config) return
    const root = document.documentElement
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
  }, [themeConfig, resolvedTheme])

  const updateThemeColor = useCallback((
    mode: 'dark' | 'light',
    key: string,
    value: string
  ) => {
    setThemeConfig((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: value,
      },
    }))
  }, [])

  // Save general settings
  const handleSaveGeneral = async () => {
    setIsSavingGeneral(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('workspace_settings')
        .update({ company_name: companyName })
        .eq('id', settings?.id)

      if (error) throw error
      toast.success('Settings saved')
      await refreshSettings()
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSavingGeneral(false)
    }
  }

  // Save branding (theme config)
  const handleSaveBranding = async () => {
    setIsSavingBranding(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('workspace_settings')
        .update({ theme_config: themeConfig as any })
        .eq('id', settings?.id)

      if (error) throw error
      toast.success('Branding saved')
      await refreshSettings()
    } catch (err) {
      toast.error('Failed to save branding')
    } finally {
      setIsSavingBranding(false)
    }
  }

  // Reset branding to defaults
  const handleResetBranding = () => {
    setThemeConfig(defaultThemeConfig)
    toast.info('Reset to default branding — save to apply permanently')
  }

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB')
      return
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPG, SVG, and WebP are supported')
      return
    }

    setIsUploadingLogo(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `logos/${Date.now()}.${ext}`

      // Remove old logo if exists
      if (settings?.logo_url) {
        await supabase.storage.from('brand-assets').remove([settings.logo_url])
      }

      // Upload new
      const { error: uploadError } = await supabase.storage
        .from('brand-assets')
        .upload(path, file, { contentType: file.type, cacheControl: '3600' })

      if (uploadError) throw uploadError

      // Update DB
      const { error: dbError } = await supabase
        .from('workspace_settings')
        .update({ logo_url: path })
        .eq('id', settings?.id)

      if (dbError) throw dbError

      toast.success('Logo uploaded')
      await refreshSettings()
    } catch (err: any) {
      toast.error(`Failed to upload logo: ${err.message || 'Unknown error'}`)
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove logo
  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return
    try {
      const supabase = createClient()
      await supabase.storage.from('brand-assets').remove([settings.logo_url])
      await supabase
        .from('workspace_settings')
        .update({ logo_url: null })
        .eq('id', settings.id)
      toast.success('Logo removed')
      await refreshSettings()
    } catch (err) {
      toast.error('Failed to remove logo')
    }
  }

  const editingMode = resolvedTheme as 'dark' | 'light'
  const currentColors = themeConfig[editingMode]

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Manage your workspace preferences</p>
      </div>

      {/* Theme Mode */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-text-secondary" />
            <CardTitle className="text-text-primary">Appearance</CardTitle>
          </div>
          <CardDescription className="text-text-secondary">
            Choose between dark, light, or system theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-text-secondary">Theme Mode</Label>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-text-secondary" />
            <CardTitle className="text-text-primary">General</CardTitle>
          </div>
          <CardDescription className="text-text-secondary">
            Basic workspace configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Hourly Rate (€)</Label>
              <Input
                type="number"
                defaultValue="85"
                className="bg-input-bg border-border-default"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                defaultValue="EUR"
                className="bg-input-bg border-border-default"
                disabled
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-input-bg border-border-default"
            />
          </div>
          <Button
            onClick={handleSaveGeneral}
            disabled={isSavingGeneral}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            {isSavingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Branding — Logo */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-text-secondary" />
            <CardTitle className="text-text-primary">Brand Logo</CardTitle>
          </div>
          <CardDescription className="text-text-secondary">
            Upload a custom logo for your workspace. Shown in sidebar and login page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            {/* Current logo preview */}
            <div className="h-16 w-16 rounded-lg border border-border-default bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Brand logo" className="h-full w-full object-contain" />
              ) : (
                <Image src={appConfig.logo} alt={appConfig.name} width={48} height={48} className="h-12 w-12" />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  variant="outline"
                  className="border-border-default text-text-secondary hover:bg-surface-hover"
                >
                  {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Logo
                </Button>
                {logoUrl && (
                  <Button
                    onClick={handleRemoveLogo}
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-text-muted">PNG, JPG, SVG or WebP. Max 2MB.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </CardContent>
      </Card>

      {/* Branding — Colors */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-text-secondary" />
              <CardTitle className="text-text-primary">Brand Colors</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetBranding}
              className="border-border-default text-text-secondary hover:bg-surface-hover"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Reset
            </Button>
          </div>
          <CardDescription className="text-text-secondary">
            Customize colors for the current theme mode ({editingMode}). Changes preview live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorInput
              label="Primary"
              value={currentColors.primary}
              onChange={(v) => updateThemeColor(editingMode, 'primary', v)}
            />
            <ColorInput
              label="Primary Hover"
              value={currentColors.primaryHover}
              onChange={(v) => updateThemeColor(editingMode, 'primaryHover', v)}
            />
            <ColorInput
              label="Secondary"
              value={currentColors.secondary}
              onChange={(v) => updateThemeColor(editingMode, 'secondary', v)}
            />
            <ColorInput
              label="Background"
              value={currentColors.background}
              onChange={(v) => updateThemeColor(editingMode, 'background', v)}
            />
            <ColorInput
              label="Surface"
              value={currentColors.surface}
              onChange={(v) => updateThemeColor(editingMode, 'surface', v)}
            />
            <ColorInput
              label="Surface Hover"
              value={currentColors.surfaceHover}
              onChange={(v) => updateThemeColor(editingMode, 'surfaceHover', v)}
            />
            <ColorInput
              label="Border"
              value={currentColors.border}
              onChange={(v) => updateThemeColor(editingMode, 'border', v)}
            />
            <ColorInput
              label="Text"
              value={currentColors.text}
              onChange={(v) => updateThemeColor(editingMode, 'text', v)}
            />
            <ColorInput
              label="Text Secondary"
              value={currentColors.textSecondary}
              onChange={(v) => updateThemeColor(editingMode, 'textSecondary', v)}
            />
          </div>

          {/* Preview swatch */}
          <div className="rounded-lg border border-border-default overflow-hidden">
            <div className="p-4 text-sm" style={{ backgroundColor: currentColors.background, color: currentColors.text }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: currentColors.primary }} />
                <span className="font-semibold">Live Preview</span>
              </div>
              <div className="rounded-md p-3" style={{ backgroundColor: currentColors.surface }}>
                <p style={{ color: currentColors.text }}>Primary text on surface</p>
                <p style={{ color: currentColors.textSecondary }}>Secondary text description</p>
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: currentColors.primary }}>
                    Primary Button
                  </span>
                  <span className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium" style={{ backgroundColor: currentColors.surfaceHover, color: currentColors.text, border: `1px solid ${currentColors.border}` }}>
                    Secondary Button
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveBranding}
            disabled={isSavingBranding}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            {isSavingBranding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Save Branding
          </Button>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-text-secondary" />
            <CardTitle className="text-text-primary">Database</CardTitle>
          </div>
          <CardDescription className="text-text-secondary">
            Supabase connection information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-text-secondary">Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand" />
                <span className="text-text-primary">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary">Project ID</Label>
              <code className="text-sm text-text-primary bg-surface px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] ?? 'unknown'}
              </code>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary">URL</Label>
            <code className="text-sm text-text-primary bg-surface px-2 py-1 rounded block">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'Not configured'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-surface-raised border-border-default">
        <CardHeader>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={appConfig.name} className="h-5 w-5 object-contain rounded" />
            ) : (
              <Image src={appConfig.logo} alt={appConfig.name} width={20} height={20} className="h-5 w-5" />
            )}
            <CardTitle className="text-text-primary">{appConfig.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">
            {appConfig.tagline}. Track projects, clients, time, and tasks in one place.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="border-border-default text-text-secondary">
              Next.js 15
            </Badge>
            <Badge variant="outline" className="border-border-default text-text-secondary">
              Supabase
            </Badge>
            <Badge variant="outline" className="border-border-default text-text-secondary">
              React Query
            </Badge>
            <Badge variant="outline" className="border-border-default text-text-secondary">
              Tailwind CSS
            </Badge>
          </div>
          <p className="text-xs text-text-muted">
            Built with ❤️ by Mike (Clawdbot)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
