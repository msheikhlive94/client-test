'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, ThemeMode } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils'

const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()

  return (
    <div className={cn('inline-flex items-center rounded-lg bg-surface p-1 gap-0.5', className)}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          title={m.label}
          className={cn(
            'flex items-center justify-center rounded-md p-1.5 transition-all duration-200',
            mode === m.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          )}
        >
          <m.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

/** Compact version for the sidebar footer */
export function ThemeToggleCompact({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()

  const nextMode = (): ThemeMode => {
    if (mode === 'dark') return 'light'
    if (mode === 'light') return 'system'
    return 'dark'
  }

  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor

  return (
    <button
      onClick={() => setMode(nextMode())}
      title={`Theme: ${mode}`}
      className={cn(
        'flex items-center justify-center rounded-lg p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors',
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
