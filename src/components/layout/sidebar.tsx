'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Clock,
  FileText,
  Settings,
  Menu,
  LogOut,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { appConfig } from '@/lib/config/theme'
import { ThemeToggle } from '@/components/theme-toggle'
import { useWorkspaceBranding } from '@/lib/contexts/workspace-context'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Time', href: '/time', icon: Clock },
  { name: 'Reports', href: '/reports', icon: FileText },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logoUrl } = useWorkspaceBranding()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border-default">
        {logoUrl ? (
          <img src={logoUrl} alt={appConfig.name} className="h-8 w-8 object-contain rounded" />
        ) : (
          <Image src={appConfig.logo} alt={appConfig.name} width={32} height={32} className="h-8 w-8" />
        )}
        <span className="text-xl font-bold text-text-primary">{appConfig.name}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-muted text-brand'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: theme toggle + settings + logout */}
      <div className="border-t border-border-default p-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-text-muted">Theme</span>
          <ThemeToggle />
        </div>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-brand-muted text-brand'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </>
  )
}

// Desktop Sidebar
export function Sidebar() {
  return (
    <div className="hidden lg:flex h-full w-64 flex-col bg-sidebar-bg">
      <NavContent />
    </div>
  )
}

// Mobile Header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const { logoUrl } = useWorkspaceBranding()

  return (
    <div className="lg:hidden flex items-center justify-between h-14 px-4 bg-sidebar-bg border-b border-border-default">
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt={appConfig.name} className="h-6 w-6 object-contain rounded" />
        ) : (
          <Image src={appConfig.logo} alt={appConfig.name} width={24} height={24} className="h-6 w-6" />
        )}
        <span className="text-lg font-bold text-text-primary">{appConfig.name}</span>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-text-primary hover:bg-surface-hover">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar-bg border-border-default">
          <div className="flex h-full flex-col">
            <NavContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
