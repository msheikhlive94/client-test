'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useCreateInvitation, useClientInvitations, useClientUsers, useRemoveClientAccess } from '@/lib/hooks/use-client-portal'
import { Mail, Copy, Check, Trash2, UserPlus, Clock, Users, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface InviteClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
}

export function InviteClientDialog({ open, onOpenChange, clientId, clientName }: InviteClientDialogProps) {
  const [email, setEmail] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  const { data: invitations } = useClientInvitations(clientId)
  const { data: users } = useClientUsers(clientId)
  const createInvitation = useCreateInvitation()
  const removeAccess = useRemoveClientAccess()

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }
    
    try {
      const invitation = await createInvitation.mutateAsync({
        clientId,
        email: email.trim()
      })
      
      const url = `${window.location.origin}/portal/invite/${invitation.token}`
      await navigator.clipboard.writeText(url)
      
      toast.success(`Invitation email sent to ${email.trim()} and link copied!`)
      setEmail('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invitation')
    }
  }

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/portal/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    toast.success('Link copied!')
  }

  const handleRemoveAccess = async (id: string) => {
    try {
      await removeAccess.mutateAsync(id)
      toast.success('Access removed')
    } catch (error) {
      toast.error('Failed to remove access')
    }
  }

  const handleResendEmail = async (invitationId: string, email: string) => {
    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }
      
      toast.success(`Invitation email sent to ${email}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation email')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Portal Access for {clientName}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Invite clients to view their projects in the portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="bg-zinc-800 border-zinc-700"
                />
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={createInvitation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            </div>
          </form>

          {/* Current Users */}
          {users && users.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Users className="h-4 w-4" />
                Users with Access ({users.length})
              </div>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800"
                >
                  <div>
                    <p className="text-sm text-white">{user.invited_by}</p>
                    <p className="text-xs text-zinc-500">
                      Joined {format(new Date(user.accepted_at || user.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                      {user.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAccess(user.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending Invitations */}
          {invitations && invitations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                <Clock className="h-4 w-4" />
                Pending Invitations ({invitations.length})
              </div>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800"
                >
                  <div>
                    <p className="text-sm text-white">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      Expires {format(new Date(inv.expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendEmail(inv.id, inv.email)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      title="Resend invitation email"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(inv.token)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      title="Copy invitation link"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="p-3 rounded-lg bg-zinc-800 text-sm text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter the client&apos;s email and click Invite</li>
              <li>Send them the copied link</li>
              <li>They sign up and get access to their projects</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
