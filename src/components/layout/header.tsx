'use client'

import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-default bg-surface-raised px-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-9"
          />
        </div>
        
        {action && (
          <Button onClick={action.onClick} className="bg-brand hover:bg-brand-hover text-white">
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )}
      </div>
    </header>
  )
}
