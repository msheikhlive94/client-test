'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  useInvoices, 
  useDeleteInvoice, 
  useUpdateInvoice,
  useInvoiceSettings 
} from '@/lib/hooks'
import { InvoiceDialog } from '@/components/dialogs/invoice-dialog'
import { 
  Plus, 
  FileText, 
  Trash2, 
  MoreHorizontal,
  Send,
  CheckCircle,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { InvoiceStatus, InvoiceWithRelations } from '@/types/database'

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-500/20 text-blue-400', icon: Send },
  paid: { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-500', icon: AlertCircle },
}

export default function InvoicesPage() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null)

  const { data: invoices, isLoading } = useInvoices()
  const { data: settings } = useInvoiceSettings()
  const deleteInvoice = useDeleteInvoice()
  const updateInvoice = useUpdateInvoice()

  const formatCurrency = (cents: number) => {
    const symbol = settings?.currency_symbol || '$'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  const handleStatusChange = async (invoice: InvoiceWithRelations, newStatus: InvoiceStatus) => {
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        status: newStatus,
        paid_date: newStatus === 'paid' ? format(new Date(), 'yyyy-MM-dd') : null
      })
      toast.success(`Invoice marked as ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!selectedInvoice) return
    try {
      await deleteInvoice.mutateAsync(selectedInvoice.id)
      toast.success('Invoice deleted')
      setDeleteDialogOpen(false)
      setSelectedInvoice(null)
    } catch (error) {
      toast.error('Failed to delete invoice')
    }
  }

  // Calculate stats
  const stats = {
    total: invoices?.length || 0,
    draft: invoices?.filter(i => i.status === 'draft').length || 0,
    pending: invoices?.filter(i => i.status === 'sent').length || 0,
    paid: invoices?.filter(i => i.status === 'paid').length || 0,
    overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
    totalPaid: invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0) || 0,
    totalPending: invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + i.total, 0) || 0,
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Invoices</h1>
          <p className="text-sm md:text-base text-text-secondary">Manage and track your invoices</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-emerald-400">
              {formatCurrency(stats.totalPaid)}
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              {stats.paid} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-blue-400">
              {formatCurrency(stats.totalPending)}
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              {stats.pending + stats.overdue} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-gray-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-text-primary">
              {stats.draft}
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Ready to send
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface-raised border-border-default">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-text-secondary">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold text-red-400">
              {stats.overdue}
            </div>
            <p className="text-xs text-text-muted hidden sm:block">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card className="bg-surface-raised border-border-default">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-text-secondary py-8 text-center">Loading...</div>
          ) : !invoices?.length ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-1">No invoices yet</h3>
              <p className="text-sm text-text-muted mb-4">Create your first invoice to get started</p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-brand hover:bg-brand-hover text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {invoices.map((invoice) => {
                const status = statusConfig[invoice.status]
                const StatusIcon = status.icon

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="hidden sm:flex h-10 w-10 rounded-lg bg-surface items-center justify-center">
                        <FileText className="h-5 w-5 text-brand" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-primary">
                            {invoice.invoice_number}
                          </span>
                          <Badge className={cn('text-xs', status.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-muted truncate">
                          {invoice.clients?.name || 'No client'} 
                          {invoice.projects?.name && ` • ${invoice.projects.name}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          Issued {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                          {invoice.due_date && ` • Due ${format(new Date(invoice.due_date), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-text-primary">
                          {formatCurrency(invoice.total)}
                        </p>
                        {invoice.tax_amount > 0 && (
                          <p className="text-xs text-text-muted">
                            incl. {formatCurrency(invoice.tax_amount)} tax
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-text-muted hover:text-text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface-raised border-border-default">
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice, 'sent')}>
                              <Send className="h-4 w-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice, 'paid')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {invoice.status === 'sent' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(invoice, 'overdue')}>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Mark as Overdue
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-surface-raised border-border-default">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription className="text-text-muted">
              Are you sure you want to delete invoice {selectedInvoice?.invoice_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-default text-text-primary hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
