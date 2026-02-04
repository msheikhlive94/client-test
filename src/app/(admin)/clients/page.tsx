'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClients, useProjects, useDeleteClient } from '@/lib/hooks'
import { Client } from '@/types/database'
import { Plus, Search, Users, Mail, Phone, Trash2, Building2, UserPlus } from 'lucide-react'
import { ClientDialog } from '@/components/dialogs/client-dialog'
import { InviteClientDialog } from '@/components/dialogs/invite-client-dialog'
import { toast } from 'sonner'
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

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>()
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [inviteClient, setInviteClient] = useState<Client | null>(null)

  const { data: clients, isLoading } = useClients()
  const { data: projects } = useProjects()
  const deleteClientMutation = useDeleteClient()

  const filteredClients = clients?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  const getClientStats = (clientId: string) => {
    const clientProjects = projects?.filter(p => p.client_id === clientId) || []
    return {
      totalProjects: clientProjects.length,
      activeProjects: clientProjects.filter(p => p.status === 'active').length
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setDialogOpen(true)
  }

  const handleNewClient = () => {
    setEditingClient(undefined)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteClient) return
    try {
      await deleteClientMutation.mutateAsync(deleteClient.id)
      toast.success('Client deleted')
      setDeleteClient(null)
    } catch (error) {
      toast.error('Failed to delete client')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm md:text-base text-zinc-400">Manage your client relationships</p>
        </div>
        <Button 
          onClick={handleNewClient}
          className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="text-zinc-400">Loading clients...</div>
      ) : filteredClients?.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <Users className="h-12 w-12 md:h-16 md:w-16 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-white text-center">No clients found</h3>
            <p className="mt-2 text-zinc-400 text-center text-sm">
              {search ? 'Try adjusting your search' : 'Get started by adding your first client'}
            </p>
            {!search && (
              <Button
                onClick={handleNewClient}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients?.map((client) => {
            const stats = getClientStats(client.id)
            return (
              <Card 
                key={client.id} 
                className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer group"
                onClick={() => handleEdit(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 flex-shrink-0">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{client.name}</h3>
                        {client.contact_name && (
                          <p className="text-sm text-zinc-400 truncate">{client.contact_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInviteClient(client)
                        }}
                        className="sm:opacity-0 sm:group-hover:opacity-100 text-zinc-400 hover:text-emerald-500 hover:bg-transparent h-8 w-8 p-0"
                        title="Invite to Portal"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteClient(client)
                        }}
                        className="sm:opacity-0 sm:group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-transparent h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      {stats.totalProjects} project{stats.totalProjects !== 1 ? 's' : ''}
                    </span>
                    {stats.activeProjects > 0 && (
                      <span className="text-emerald-500">
                        {stats.activeProjects} active
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editingClient}
      />

      <AlertDialog open={!!deleteClient} onOpenChange={(open) => !open && setDeleteClient(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Client?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete &quot;{deleteClient?.name}&quot;. Projects associated 
              with this client will not be deleted but will no longer have a client assigned.
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
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {inviteClient && (
        <InviteClientDialog
          open={!!inviteClient}
          onOpenChange={(open) => !open && setInviteClient(null)}
          clientId={inviteClient.id}
          clientName={inviteClient.name}
        />
      )}
    </div>
  )
}
