'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useLeads, useDeleteLead, useUpdateLead, useIntakeLinks, useCreateIntakeLink, useDeactivateIntakeLink } from '@/lib/hooks'
import { Lead, LeadStatus, BudgetRange, ProjectTimeline } from '@/types/database'
import { Plus, Search, UserPlus, Trash2, Mail, Phone, Globe, Link2, Copy, ExternalLink, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LeadDetailDialog } from '@/components/dialogs/lead-detail-dialog'
import { IntakeLinkDialog } from '@/components/dialogs/intake-link-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-emerald-500',
  converted: 'bg-purple-500',
  lost: 'bg-zinc-500'
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost'
}

const budgetLabels: Record<BudgetRange, string> = {
  under_5k: 'Under €5K',
  '5k_10k': '€5K - €10K',
  '10k_25k': '€10K - €25K',
  '25k_50k': '€25K - €50K',
  '50k_plus': '€50K+',
  not_sure: 'Not Sure'
}

export default function LeadsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const { data: leads, isLoading } = useLeads(statusFilter === 'all' ? undefined : statusFilter)
  const deleteLeadMutation = useDeleteLead()
  const updateLead = useUpdateLead()
  const createIntakeLink = useCreateIntakeLink()

  const filteredLeads = leads?.filter(l =>
    l.company_name.toLowerCase().includes(search.toLowerCase()) ||
    l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  )

  const activeLeads = leads?.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).length || 0
  const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0

  const handleDelete = async () => {
    if (!deleteLead) return
    try {
      await deleteLeadMutation.mutateAsync(deleteLead.id)
      toast.success('Lead deleted')
      setDeleteLead(null)
    } catch (error) {
      toast.error('Failed to delete lead')
    }
  }

  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, status: newStatus })
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleCreateLink = async () => {
    try {
      const link = await createIntakeLink.mutateAsync({})
      const url = `${window.location.origin}/onboard/${link.token}`
      await navigator.clipboard.writeText(url)
      toast.success('Intake link created and copied!')
    } catch (error) {
      toast.error('Failed to create link')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm md:text-base text-zinc-400">Manage incoming client inquiries</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setLinkDialogOpen(true)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full sm:w-auto"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Intake Links
          </Button>
          <Button
            onClick={handleCreateLink}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-3">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Active</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">{activeLeads}</div>
            <p className="text-xs text-zinc-500 hidden sm:block">Waiting for action</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Converted</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-emerald-500">{convertedLeads}</div>
            <p className="text-xs text-zinc-500 hidden sm:block">Became clients</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">
              {leads?.length ? ((convertedLeads / leads.length) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">Conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as LeadStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="text-zinc-400">Loading leads...</div>
      ) : filteredLeads?.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <UserPlus className="h-12 w-12 md:h-16 md:w-16 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white text-center">No leads found</h3>
            <p className="mt-2 text-zinc-400 text-center text-sm max-w-md">
              Create an intake link and share it with potential clients.
            </p>
            <Button
              onClick={handleCreateLink}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Intake Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLeads?.map((lead) => (
            <Card
              key={lead.id}
              className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer group"
              onClick={() => setSelectedLead(lead)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm md:text-base">{lead.company_name}</h3>
                      <Badge className={cn('text-white border-0 text-xs', statusColors[lead.status])}>
                        {statusLabels[lead.status]}
                      </Badge>
                      {lead.budget_range && (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs hidden sm:inline-flex">
                          {budgetLabels[lead.budget_range]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-zinc-400">
                      <span>{lead.contact_name}</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px] sm:max-w-none">{lead.email}</span>
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1 hidden md:flex">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                    {lead.project_description && (
                      <p className="mt-2 text-xs md:text-sm text-zinc-500 line-clamp-2">
                        {lead.project_description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-xs text-zinc-500">
                      {format(new Date(lead.created_at), 'MMM d')}
                    </span>
                    <div className="flex items-center gap-1">
                      <Select
                        value={lead.status}
                        onValueChange={(v) => {
                          handleStatusChange(lead, v as LeadStatus)
                        }}
                      >
                        <SelectTrigger 
                          className="w-28 sm:w-32 h-7 sm:h-8 bg-zinc-900 border-zinc-700 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteLead(lead)
                        }}
                        className="sm:opacity-0 sm:group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-transparent h-7 w-7 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />

      {/* Intake Links Dialog */}
      <IntakeLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLead} onOpenChange={(open) => !open && setDeleteLead(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete the lead from {deleteLead?.company_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
