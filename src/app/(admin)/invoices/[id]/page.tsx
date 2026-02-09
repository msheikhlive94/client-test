'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  useInvoice, 
  useUpdateInvoice,
  useInvoiceSettings
} from '@/lib/hooks'
import { useWorkspace as useWorkspaceContext } from '@/lib/contexts/workspace-context'
import { 
  ArrowLeft, 
  Download, 
  Send, 
  CheckCircle, 
  Mail,
  Loader2,
  FileText,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { InvoiceStatus } from '@/types/database'

const statusConfig: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
  sent: { label: 'Sent', color: 'bg-blue-500/20 text-blue-400' },
  paid: { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400' },
  overdue: { label: 'Overdue', color: 'bg-red-500/20 text-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-500' },
}

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string
  
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: settings } = useInvoiceSettings()
  const { settings: workspaceSettings } = useWorkspaceContext()
  const updateInvoice = useUpdateInvoice()

  const formatCurrency = (cents: number) => {
    const symbol = invoice?.currency_symbol || settings?.currency_symbol || '$'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return
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

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setIsDownloading(true)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('PDF downloaded')
    } catch (error) {
      console.error(error)
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!invoice?.clients?.email) {
      toast.error('No client email address')
      return
    }
    
    setIsSendingEmail(true)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }
      
      // Update status to sent if it was draft
      if (invoice.status === 'draft') {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          status: 'sent'
        })
      }
      
      toast.success('Invoice sent to client')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-text-primary">Invoice not found</h2>
        <Button
          onClick={() => router.push('/invoices')}
          className="mt-4"
          variant="outline"
        >
          Back to Invoices
        </Button>
      </div>
    )
  }

  const status = statusConfig[invoice.status]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/invoices')}
            className="text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-text-primary">
                {invoice.invoice_number}
              </h1>
              <Badge className={cn('text-xs', status.color)}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="border-border-default text-text-primary hover:bg-surface-hover"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          
          {invoice.clients?.email && (
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="border-border-default text-text-primary hover:bg-surface-hover"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          )}
          
          {invoice.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('sent')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              onClick={() => handleStatusChange('paid')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <Card className="bg-white border-border-default text-gray-900 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
              <p className="text-lg text-gray-600">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{workspaceSettings?.company_name || 'Your Company'}</p>
              {settings?.bank_details && (
                <p className="text-sm text-gray-600 whitespace-pre-line mt-1">
                  {settings.bank_details}
                </p>
              )}
            </div>
          </div>

          {/* Client & Dates */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Bill To</p>
              {invoice.clients ? (
                <div>
                  <p className="font-bold text-gray-900">{invoice.clients.name}</p>
                  {invoice.clients.company && (
                    <p className="text-gray-600">{invoice.clients.company}</p>
                  )}
                  {invoice.clients.email && (
                    <p className="text-gray-600">{invoice.clients.email}</p>
                  )}
                  {invoice.clients.address && (
                    <p className="text-gray-600 whitespace-pre-line">{invoice.clients.address}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No client</p>
              )}
            </div>
            <div className="md:text-right">
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-gray-500">Issue Date:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
                  </span>
                </p>
                {invoice.due_date && (
                  <p className="text-sm">
                    <span className="text-gray-500">Due Date:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
                    </span>
                  </p>
                )}
                {invoice.paid_date && (
                  <p className="text-sm">
                    <span className="text-gray-500">Paid Date:</span>{' '}
                    <span className="font-medium text-emerald-600">
                      {format(new Date(invoice.paid_date), 'MMMM d, yyyy')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 w-20">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 w-28">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.invoice_items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {settings?.tax_label || 'Tax'} ({invoice.tax_rate}%)
                  </span>
                  <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              <Separator className="bg-gray-200" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Terms */}
          {invoice.payment_terms && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Payment Terms: {invoice.payment_terms}</p>
            </div>
          )}

          {/* Footer */}
          {settings?.invoice_footer && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">{settings.invoice_footer}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
