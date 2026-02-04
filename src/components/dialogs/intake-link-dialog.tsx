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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useIntakeLinks, useCreateIntakeLink, useDeactivateIntakeLink } from '@/lib/hooks'
import { IntakeLink } from '@/types/database'
import { Copy, ExternalLink, Trash2, Plus, Check, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface IntakeLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntakeLinkDialog({ open, onOpenChange }: IntakeLinkDialogProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('')

  const { data: links, isLoading } = useIntakeLinks()
  const createLink = useCreateIntakeLink()
  const deactivateLink = useDeactivateIntakeLink()

  const activeLinks = links?.filter(l => l.is_active) || []
  const inactiveLinks = links?.filter(l => !l.is_active) || []

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/onboard/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    toast.success('Link copied!')
  }

  const handleCreate = async () => {
    try {
      const link = await createLink.mutateAsync({
        label: newLabel || undefined,
        max_uses: newMaxUses ? parseInt(newMaxUses) : undefined
      })
      const url = `${window.location.origin}/onboard/${link.token}`
      await navigator.clipboard.writeText(url)
      toast.success('Link created and copied!')
      setShowCreate(false)
      setNewLabel('')
      setNewMaxUses('')
    } catch (error) {
      toast.error('Failed to create link')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateLink.mutateAsync(id)
      toast.success('Link deactivated')
    } catch (error) {
      toast.error('Failed to deactivate link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Intake Links
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Link */}
          {!showCreate ? (
            <Button
              onClick={() => setShowCreate(true)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Link
            </Button>
          ) : (
            <div className="p-4 rounded-lg bg-zinc-800 space-y-4">
              <h3 className="font-medium">New Intake Link</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g., LinkedIn Campaign"
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses (optional)</Label>
                  <Input
                    type="number"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="border-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createLink.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Create & Copy
                </Button>
              </div>
            </div>
          )}

          {/* Active Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400">Active Links ({activeLinks.length})</h3>
            {activeLinks.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No active links</p>
            ) : (
              activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-emerald-400">/onboard/{link.token}</code>
                      {link.label && (
                        <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                          {link.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>Created {format(new Date(link.created_at), 'MMM d')}</span>
                      <span>•</span>
                      <span>{link.use_count} uses</span>
                      {link.max_uses && (
                        <>
                          <span>•</span>
                          <span>Max {link.max_uses}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(link.token)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedToken === link.token ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/onboard/${link.token}`, '_blank')}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(link.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Inactive Links */}
          {inactiveLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Inactive Links ({inactiveLinks.length})</h3>
              {inactiveLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 opacity-60"
                >
                  <div>
                    <code className="text-sm text-zinc-500">/onboard/{link.token}</code>
                    <p className="text-xs text-zinc-600 mt-1">
                      {link.use_count} uses • Deactivated
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
