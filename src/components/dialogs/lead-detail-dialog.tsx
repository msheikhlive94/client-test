'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateLead, useConvertLead } from '@/lib/hooks'
import { Lead, LeadStatus, BudgetRange, ProjectTimeline, ProjectType } from '@/types/database'
import { Mail, Phone, Globe, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface LeadDetailDialogProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

const timelineLabels: Record<ProjectTimeline, string> = {
  asap: 'ASAP',
  '1_month': '1 Month',
  '2_3_months': '2-3 Months',
  '3_6_months': '3-6 Months',
  flexible: 'Flexible'
}

const projectTypeLabels: Record<ProjectType, string> = {
  automation: 'Automation',
  internal_system: 'Internal System',
  mvp: 'MVP',
  ai_agent: 'AI Agent',
  consulting: 'Consulting',
  other: 'Other'
}

const budgetToAmount: Record<BudgetRange, number | null> = {
  under_5k: 5000,
  '5k_10k': 10000,
  '10k_25k': 25000,
  '25k_50k': 50000,
  '50k_plus': 75000,
  not_sure: null
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const router = useRouter()
  const [notes, setNotes] = useState(lead?.notes || '')
  const [showConvert, setShowConvert] = useState(false)
  const [projectName, setProjectName] = useState('')
  
  const updateLead = useUpdateLead()
  const convertLead = useConvertLead()

  if (!lead) return null

  const handleSaveNotes = async () => {
    try {
      await updateLead.mutateAsync({ id: lead.id, notes })
      toast.success('Notes saved')
    } catch (error) {
      toast.error('Failed to save notes')
    }
  }

  const handleConvert = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    try {
      const result = await convertLead.mutateAsync({
        leadId: lead.id,
        clientData: {
          name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone || undefined,
          website: lead.website || undefined
        },
        projectData: {
          name: projectName,
          description: lead.project_description || undefined,
          project_type: lead.project_type,
          budget_type: lead.budget_range && lead.budget_range !== 'not_sure' ? 'fixed' : 'hourly',
          budget_amount: lead.budget_range ? budgetToAmount[lead.budget_range] || undefined : undefined
        }
      })
      
      toast.success('Lead converted to client!')
      onOpenChange(false)
      router.push(`/projects/${result.project.id}`)
    } catch (error) {
      toast.error('Failed to convert lead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{lead.company_name}</DialogTitle>
            <Badge className={cn('text-white border-0', statusColors[lead.status])}>
              {statusLabels[lead.status]}
            </Badge>
          </div>
        </DialogHeader>

        {!showConvert ? (
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-medium text-zinc-300">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-white font-medium">{lead.contact_name}</p>
                  <p className="flex items-center gap-2 text-zinc-400">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${lead.email}`} className="hover:text-white">
                      {lead.email}
                    </a>
                  </p>
                  {lead.phone && (
                    <p className="flex items-center gap-2 text-zinc-400">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${lead.phone}`} className="hover:text-white">
                        {lead.phone}
                      </a>
                    </p>
                  )}
                  {lead.website && (
                    <p className="flex items-center gap-2 text-zinc-400">
                      <Globe className="h-4 w-4" />
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        {lead.website}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-zinc-300">Project Details</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-400">
                    Type: <span className="text-white">{projectTypeLabels[lead.project_type]}</span>
                  </p>
                  {lead.budget_range && (
                    <p className="text-zinc-400">
                      Budget: <span className="text-emerald-400">{budgetLabels[lead.budget_range]}</span>
                    </p>
                  )}
                  {lead.timeline && (
                    <p className="text-zinc-400">
                      Timeline: <span className="text-white">{timelineLabels[lead.timeline]}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    Submitted {format(new Date(lead.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Project Description */}
            {lead.project_description && (
              <div className="space-y-2">
                <h3 className="font-medium text-zinc-300">Project Description</h3>
                <div className="p-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm whitespace-pre-wrap">
                  {lead.project_description}
                </div>
              </div>
            )}

            {/* Source */}
            {(lead.source || lead.referral) && (
              <div className="space-y-2">
                <h3 className="font-medium text-zinc-300">Source</h3>
                <p className="text-sm text-zinc-400">
                  {lead.source && <span>Source: {lead.source}</span>}
                  {lead.referral && <span>{lead.source ? ' • ' : ''}Referral: {lead.referral}</span>}
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Internal Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                className="bg-zinc-800 border-zinc-700 min-h-[100px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={updateLead.isPending}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Save Notes
              </Button>
            </div>

            {/* Actions */}
            {lead.status !== 'converted' && lead.status !== 'lost' && (
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Close
                </Button>
                <Button
                  onClick={() => setShowConvert(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Convert to Client
                </Button>
              </div>
            )}

            {lead.status === 'converted' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <span className="text-emerald-400">This lead has been converted to a client</span>
                {lead.converted_project_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/projects/${lead.converted_project_id}`)}
                    className="ml-auto border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    View Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Convert Form */
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <h3 className="font-medium text-emerald-400 mb-2">Converting Lead to Client</h3>
              <p className="text-sm text-zinc-400">
                This will create a new client record and project for {lead.company_name}.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={lead.company_name}
                  disabled
                  className="bg-zinc-800 border-zinc-700 opacity-70"
                />
              </div>

              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={`${lead.company_name} - ${projectTypeLabels[lead.project_type]}`}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Input
                    value={projectTypeLabels[lead.project_type]}
                    disabled
                    className="bg-zinc-800 border-zinc-700 opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input
                    value={lead.budget_range ? budgetLabels[lead.budget_range] : 'Not specified'}
                    disabled
                    className="bg-zinc-800 border-zinc-700 opacity-70"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setShowConvert(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Back
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertLead.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {convertLead.isPending ? 'Converting...' : 'Create Client & Project'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
