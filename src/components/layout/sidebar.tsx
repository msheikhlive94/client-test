'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Clock,
  FileText,
  Settings,
  Zap,
  UserPlus,
  Menu,
  X
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Time', href: '/time', icon: Clock },
  { name: 'Reports', href: '/reports', icon: FileText },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-zinc-800">
        <Zap className="h-8 w-8 text-emerald-500" />
        <span className="text-xl font-bold">z-flow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </>
  )
}

// Desktop Sidebar
export function Sidebar() {
  return (
    <div className="hidden lg:flex h-full w-64 flex-col bg-zinc-950 text-white">
      <NavContent />
    </div>
  )
}

// Mobile Header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden flex items-center justify-between h-14 px-4 bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-emerald-500" />
        <span className="text-lg font-bold text-white">z-flow</span>
      </div>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-zinc-950 border-zinc-800">
          <div className="flex h-full flex-col text-white">
            <NavContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
