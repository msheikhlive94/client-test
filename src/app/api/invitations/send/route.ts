import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Get invitation details from database
    const supabase = await createClient()
    const { data: invitation, error: invError } = await supabase
      .from('client_invitations')
      .select('*, clients(name)')
      .eq('id', invitationId)
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Build invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.z-flow.de'}/portal/invite/${invitation.token}`

    // Send email with retries
    await sendInvitationEmail(
      invitation.email,
      invitation.clients.name,
      invitationLink
    )

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully'
    })
  } catch (error: any) {
    console.error('Error sending invitation email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation email' },
      { status: 500 }
    )
  }
}
