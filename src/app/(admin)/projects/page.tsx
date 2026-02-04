'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/lib/hooks'
import { ProjectStatus } from '@/types/database'
import { Plus, Search, FolderKanban } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ProjectDialog } from '@/components/dialogs/project-dialog'

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

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: projects, isLoading } = useProjects(
    statusFilter === 'all' ? undefined : statusFilter
  )

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.clients?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm md:text-base text-zinc-400">Manage your client projects</p>
        </div>
        <Button 
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-zinc-400">Loading projects...</div>
      ) : filteredProjects?.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <FolderKanban className="h-12 w-12 md:h-16 md:w-16 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white text-center">No projects found</h3>
            <p className="mt-2 text-zinc-400 text-center text-sm">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first project'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', statusColors[project.status])} />
                      <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-xs">
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-xs whitespace-nowrap">
                      {project.project_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <h3 className="mt-3 text-base md:text-lg font-semibold text-white line-clamp-1">{project.name}</h3>
                  <p className="text-sm text-zinc-400">{project.clients?.name || 'No client'}</p>
                  
                  {project.description && (
                    <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between text-xs md:text-sm">
                    <div className="text-zinc-400">
                      {project.budget_type === 'hourly' && project.hourly_rate && (
                        <span>€{project.hourly_rate}/hr</span>
                      )}
                      {project.budget_type === 'fixed' && project.budget_amount && (
                        <span>€{project.budget_amount} fixed</span>
                      )}
                      {project.budget_type === 'retainer' && project.budget_amount && (
                        <span>€{project.budget_amount}/mo</span>
                      )}
                    </div>
                    <div className="text-zinc-500">
                      {project.start_date && format(new Date(project.start_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
