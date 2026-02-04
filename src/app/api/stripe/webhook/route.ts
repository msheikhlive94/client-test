import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

/**
 * Stripe sends raw body; we must read it as text for signature verification.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          await upsertSubscription(supabase, subscription)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await upsertSubscription(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await (supabase as any)
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.parent?.subscription_details?.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.parent.subscription_details.subscription as string
          )
          await upsertSubscription(supabase, subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.parent?.subscription_details?.subscription) {
          await (supabase as any)
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.parent.subscription_details.subscription as string)
        }
        break
      }

      default:
        // Unhandled event type — log it but don't fail
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Determine the plan name from a Stripe subscription's price.
 */
function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return 'free'

  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business'
  return 'pro' // default fallback for unknown price IDs
}

/**
 * Map Stripe subscription status to our internal status.
 */
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'active'
  }
}

/**
 * Upsert subscription data in Supabase.
 * Uses stripe_customer_id to find the workspace mapping.
 * We use `any` for the subscriptions table since it's not in the generated types yet.
 */
async function upsertSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer

  const plan = getPlanFromSubscription(subscription)
  const status = mapStatus(subscription.status)

  const db = supabase as any

  // Try to find existing subscription by stripe_customer_id or stripe_subscription_id
  const { data: existing } = await db
    .from('subscriptions')
    .select('id, workspace_id')
    .or(`stripe_customer_id.eq.${customerId},stripe_subscription_id.eq.${subscription.id}`)
    .limit(1)
    .single()

  // Get period timestamps from the first item
  const currentItem = subscription.items.data[0]
  const periodStart = currentItem?.current_period_start
  const periodEnd = currentItem?.current_period_end

  const subscriptionData: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await db
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existing.id)
  } else {
    // If no existing record, we need a workspace_id.
    // Look for the first workspace (for now) — in production you'd map customer → workspace.
    const { data: workspace } = await db
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    if (workspace) {
      await db.from('subscriptions').upsert({
        ...subscriptionData,
        workspace_id: workspace.id,
      }, {
        onConflict: 'workspace_id',
      })
    } else {
      console.error('No workspace found for subscription:', subscription.id)
    }
  }
}
