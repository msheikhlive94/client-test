'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthUser, useClientAccess, useClientProjects, useSignOut } from '@/lib/hooks/use-client-portal'
import { ProjectStatus } from '@/types/database'
import { Zap, FolderKanban, LogOut, Loader2, Clock, CheckCircle2, Menu } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-zinc-500',
  active: 'bg-emerald-500',
  on_hold: 'bg-yellow-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500'
}

const statusLabels: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

export default function PortalDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()
  const { data: clientAccess, isLoading: accessLoading } = useClientAccess(user?.id)
  const signOut = useSignOut()
  
  // Get the first client (for MVP - later can support multiple)
  const clientId = clientAccess?.[0]?.client_id
  const clientName = clientAccess?.[0]?.clients?.name
  
  const { data: projects, isLoading: projectsLoading } = useClientProjects(clientId)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/portal/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!accessLoading && clientAccess && clientAccess.length === 0 && user) {
      // User is logged in but has no client access
      router.push('/portal/no-access')
    }
  }, [clientAccess, accessLoading, user, router])

  const handleSignOut = async () => {
    await signOut.mutateAsync()
    router.push('/portal/login')
  }

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (!user || !clientAccess?.length) {
    return null
  }

  const activeProjects = projects?.filter(p => p.status === 'active').length || 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Zap className="h-6 w-6 md:h-7 md:w-7 text-emerald-500" />
            <div>
              <span className="text-base md:text-lg font-bold text-white">z-flow</span>
              <span className="text-zinc-500 text-xs md:text-sm ml-1 md:ml-2 hidden sm:inline">Client Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-zinc-400 hidden sm:block truncate max-w-[150px]">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs md:text-sm h-8"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {/* Welcome */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Welcome, {clientName}
          </h1>
          <p className="text-sm md:text-base text-zinc-400">Track your projects and see progress in real-time.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 md:gap-4 grid-cols-3 mb-6 md:mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Total</CardTitle>
              <FolderKanban className="h-4 w-4 text-emerald-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-white">{projects?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Active</CardTitle>
              <Clock className="h-4 w-4 text-blue-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-white">{activeProjects}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Done</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold text-white">{completedProjects}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Your Projects</h2>
        {projectsLoading ? (
          <div className="text-zinc-400 text-sm">Loading projects...</div>
        ) : !projects?.length ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
              <FolderKanban className="h-12 w-12 md:h-16 md:w-16 text-zinc-700" />
              <h3 className="mt-4 text-base md:text-lg font-medium text-white text-center">No projects yet</h3>
              <p className="mt-2 text-zinc-400 text-center text-sm">
                Once we start working together, your projects will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/portal/projects/${project.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between mb-2 md:mb-3 gap-2">
                      <Badge className={cn('text-white border-0 text-xs', statusColors[project.status])}>
                        {statusLabels[project.status]}
                      </Badge>
                      {project.start_date && (
                        <span className="text-xs text-zinc-500 flex-shrink-0">
                          {format(new Date(project.start_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1 line-clamp-1">{project.name}</h3>
                    {project.description && (
                      <p className="text-xs md:text-sm text-zinc-400 line-clamp-2">{project.description}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
