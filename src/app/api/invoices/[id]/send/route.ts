import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { format } from 'date-fns'

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(
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

    // Fetch invoice with client
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (name, company, email)
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if client has email
    if (!invoice.clients?.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    // Fetch workspace settings
    const { data: settings } = await supabase
      .from('workspace_settings')
      .select('company_name')
      .eq('workspace_id', invoice.workspace_id)
      .single()

    const companyName = settings?.company_name || 'Your Company'
    const clientName = invoice.clients.name
    const clientEmail = invoice.clients.email

    // Check if Resend is configured
    if (!resend) {
      // If no email service configured, return instructions
      return NextResponse.json({ 
        error: 'Email service not configured. Add RESEND_API_KEY to your environment variables.',
        suggestion: 'You can sign up for free at resend.com and add your API key to enable email sending.'
      }, { status: 400 })
    }

    // Format currency
    const formatCurrency = (cents: number) => {
      return `${invoice.currency_symbol}${(cents / 100).toFixed(2)}`
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
            .invoice-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total { font-size: 24px; font-weight: bold; color: #10b981; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #1f2937;">${companyName}</h1>
            </div>
            
            <p>Dear ${clientName},</p>
            
            <p>Please find attached your invoice <strong>${invoice.invoice_number}</strong>.</p>
            
            <div class="invoice-box">
              <p style="margin: 0 0 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p style="margin: 0 0 10px 0;"><strong>Issue Date:</strong> ${format(new Date(invoice.issue_date), 'MMMM d, yyyy')}</p>
              ${invoice.due_date ? `<p style="margin: 0 0 10px 0;"><strong>Due Date:</strong> ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>` : ''}
              <p style="margin: 0;"><strong>Amount Due:</strong> <span class="total">${formatCurrency(invoice.total)}</span></p>
            </div>
            
            ${invoice.payment_terms ? `<p><strong>Payment Terms:</strong> ${invoice.payment_terms}</p>` : ''}
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br/>${companyName}</p>
            
            <div class="footer">
              <p>This invoice was sent from ${companyName}.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Generate PDF for attachment
    const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${id}/pdf`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      },
    })

    let attachments: { filename: string; content: Buffer }[] = []
    
    if (pdfResponse.ok) {
      const pdfBuffer = await pdfResponse.arrayBuffer()
      attachments = [{
        filename: `${invoice.invoice_number}.pdf`,
        content: Buffer.from(pdfBuffer),
      }]
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@resend.dev',
      to: clientEmail,
      subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
      html: emailHtml,
      attachments,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update invoice status to sent if it was draft
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', id)
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
