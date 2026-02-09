import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer'
import { format } from 'date-fns'

// Register a default font (optional, uses Helvetica by default)
// Font.register({ family: 'Helvetica', src: '...' })

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  companyDetails: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  billTo: {
    flex: 1,
  },
  dates: {
    flex: 1,
    textAlign: 'right',
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientDetails: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 2,
  },
  dateRow: {
    fontSize: 10,
    marginBottom: 4,
  },
  dateLabel: {
    color: '#6b7280',
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  colDescription: {
    flex: 1,
  },
  colQty: {
    width: 60,
    textAlign: 'right',
  },
  colPrice: {
    width: 80,
    textAlign: 'right',
  },
  colAmount: {
    width: 80,
    textAlign: 'right',
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  cellText: {
    fontSize: 10,
  },
  totals: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#6b7280',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 10,
    color: '#4b5563',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#6b7280',
  },
  status: {
    position: 'absolute',
    top: 100,
    right: 40,
    padding: '8 16',
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
})

interface InvoiceData {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  paid_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency_symbol: string
  notes: string | null
  payment_terms: string | null
  clients: {
    name: string
    company: string | null
    email: string | null
    address: string | null
  } | null
  invoice_items: {
    description: string
    quantity: number
    unit_price: number
    amount: number
  }[]
}

interface SettingsData {
  company_name: string | null
  bank_details: string | null
  tax_label: string | null
  invoice_footer: string | null
}

function formatCurrency(cents: number, symbol: string) {
  return `${symbol}${(cents / 100).toFixed(2)}`
}

function InvoicePDF({ invoice, settings }: { invoice: InvoiceData; settings: SettingsData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Paid stamp */}
        {invoice.status === 'paid' && (
          <View style={[styles.status, styles.statusPaid]}>
            <Text style={styles.statusText}>PAID</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{settings.company_name || 'Your Company'}</Text>
            {settings.bank_details && (
              <Text style={styles.companyDetails}>{settings.bank_details}</Text>
            )}
          </View>
        </View>

        {/* Bill To & Dates */}
        <View style={styles.section}>
          <View style={styles.billTo}>
            <Text style={styles.label}>Bill To</Text>
            {invoice.clients ? (
              <>
                <Text style={styles.clientName}>{invoice.clients.name}</Text>
                {invoice.clients.company && (
                  <Text style={styles.clientDetails}>{invoice.clients.company}</Text>
                )}
                {invoice.clients.email && (
                  <Text style={styles.clientDetails}>{invoice.clients.email}</Text>
                )}
                {invoice.clients.address && (
                  <Text style={styles.clientDetails}>{invoice.clients.address}</Text>
                )}
              </>
            ) : (
              <Text style={styles.clientDetails}>No client</Text>
            )}
          </View>
          <View style={styles.dates}>
            <Text style={styles.dateRow}>
              <Text style={styles.dateLabel}>Issue Date: </Text>
              {format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
            </Text>
            {invoice.due_date && (
              <Text style={styles.dateRow}>
                <Text style={styles.dateLabel}>Due Date: </Text>
                {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
              </Text>
            )}
            {invoice.paid_date && (
              <Text style={styles.dateRow}>
                <Text style={styles.dateLabel}>Paid Date: </Text>
                {format(new Date(invoice.paid_date), 'MMMM d, yyyy')}
              </Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDescription]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Price</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          {invoice.invoice_items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatCurrency(item.unit_price, invoice.currency_symbol)}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatCurrency(item.amount, invoice.currency_symbol)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.subtotal, invoice.currency_symbol)}
            </Text>
          </View>
          {invoice.tax_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {settings.tax_label || 'Tax'} ({invoice.tax_rate}%)
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.tax_amount, invoice.currency_symbol)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.total, invoice.currency_symbol)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.notesText}>Payment Terms: {invoice.payment_terms}</Text>
          </View>
        )}

        {/* Footer */}
        {settings.invoice_footer && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{settings.invoice_footer}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invoice with items and client
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name, company, email, address),
        invoice_items (description, quantity, unit_price, amount)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch workspace settings
    const { data: settings } = await supabase
      .from('workspace_settings')
      .select('company_name, bank_details, tax_label, invoice_footer')
      .eq('workspace_id', invoice.workspace_id)
      .single()

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <InvoicePDF 
        invoice={invoice as InvoiceData} 
        settings={settings || { company_name: null, bank_details: null, tax_label: null, invoice_footer: null }} 
      />
    )

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
