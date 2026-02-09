'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvoiceSettings, useUpdateInvoiceSettings } from '@/lib/hooks'
import { Receipt, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
]

const paymentTermsOptions = [
  'Due on Receipt',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
]

export function InvoiceSettings() {
  const { data: settings, isLoading } = useInvoiceSettings()
  const updateSettings = useUpdateInvoiceSettings()

  const [formData, setFormData] = useState({
    invoice_prefix: 'INV-',
    tax_rate: 0,
    tax_label: 'Tax',
    currency: 'USD',
    currency_symbol: '$',
    bank_details: '',
    payment_terms: 'Net 30',
    invoice_notes: '',
    invoice_footer: '',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        invoice_prefix: settings.invoice_prefix || 'INV-',
        tax_rate: settings.tax_rate || 0,
        tax_label: settings.tax_label || 'Tax',
        currency: settings.currency || 'USD',
        currency_symbol: settings.currency_symbol || '$',
        bank_details: settings.bank_details || '',
        payment_terms: settings.payment_terms || 'Net 30',
        invoice_notes: settings.invoice_notes || '',
        invoice_footer: settings.invoice_footer || '',
      })
    }
  }, [settings])

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode)
    if (currency) {
      setFormData({
        ...formData,
        currency: currency.code,
        currency_symbol: currency.symbol,
      })
    }
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData)
      toast.success('Invoice settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-surface-raised border-border-default">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-raised border-border-default">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-text-secondary" />
          <CardTitle className="text-text-primary">Invoice Settings</CardTitle>
        </div>
        <CardDescription className="text-text-secondary">
          Configure your invoice defaults, tax settings, and payment information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Invoice Number Prefix</Label>
            <Input
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              placeholder="INV-"
              className="bg-input-bg border-border-default"
            />
            <p className="text-xs text-text-muted">
              Preview: {formData.invoice_prefix}{String(settings?.invoice_next_number || 1).padStart(4, '0')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={handleCurrencyChange}
            >
              <SelectTrigger className="bg-input-bg border-border-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-raised border-border-default">
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              className="bg-input-bg border-border-default"
            />
            <p className="text-xs text-text-muted">
              Set to 0 if you don't charge tax
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tax Label</Label>
            <Input
              value={formData.tax_label}
              onChange={(e) => setFormData({ ...formData, tax_label: e.target.value })}
              placeholder="VAT, GST, Sales Tax, etc."
              className="bg-input-bg border-border-default"
            />
          </div>
        </div>

        {/* Payment Terms */}
        <div className="space-y-2">
          <Label>Default Payment Terms</Label>
          <Select
            value={formData.payment_terms}
            onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}
          >
            <SelectTrigger className="bg-input-bg border-border-default">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-raised border-border-default">
              {paymentTermsOptions.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bank Details */}
        <div className="space-y-2">
          <Label>Bank Details / Payment Instructions</Label>
          <Textarea
            value={formData.bank_details}
            onChange={(e) => setFormData({ ...formData, bank_details: e.target.value })}
            placeholder="Bank: Example Bank&#10;Account: 1234567890&#10;IBAN: DE89...&#10;SWIFT: EXAMPLEXX"
            className="bg-input-bg border-border-default min-h-[100px]"
          />
          <p className="text-xs text-text-muted">
            Shown on invoice header - include bank name, account number, IBAN, etc.
          </p>
        </div>

        {/* Default Notes */}
        <div className="space-y-2">
          <Label>Default Invoice Notes</Label>
          <Textarea
            value={formData.invoice_notes}
            onChange={(e) => setFormData({ ...formData, invoice_notes: e.target.value })}
            placeholder="Thank you for your business!"
            className="bg-input-bg border-border-default min-h-[60px]"
          />
          <p className="text-xs text-text-muted">
            Pre-filled on new invoices (can be edited per invoice)
          </p>
        </div>

        {/* Footer */}
        <div className="space-y-2">
          <Label>Invoice Footer</Label>
          <Input
            value={formData.invoice_footer}
            onChange={(e) => setFormData({ ...formData, invoice_footer: e.target.value })}
            placeholder="Thank you for your business!"
            className="bg-input-bg border-border-default"
          />
          <p className="text-xs text-text-muted">
            Shown at the bottom of every invoice
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save Invoice Settings
        </Button>
      </CardContent>
    </Card>
  )
}
