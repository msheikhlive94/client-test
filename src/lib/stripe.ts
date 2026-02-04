import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})

/**
 * Map our internal plan names to Stripe Price IDs from environment variables.
 */
export function getPriceId(plan: 'pro' | 'business'): string {
  const priceMap: Record<string, string | undefined> = {
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  }

  const priceId = priceMap[plan]
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan: ${plan}`)
  }
  return priceId
}
