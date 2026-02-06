/**
 * Theme configuration for ProjoFlow
 *
 * All branding values are driven by environment variables with sensible defaults.
 * Override any value by setting the corresponding NEXT_PUBLIC_* env var.
 *
 * @example .env.local
 * NEXT_PUBLIC_APP_NAME="My Agency PM"
 * NEXT_PUBLIC_APP_TAGLINE="Manage projects like a boss"
 * NEXT_PUBLIC_PRIMARY_COLOR="#6366f1"
 */

export const appConfig = {
  /** Display name shown in sidebar, login, emails, metadata */
  name: process.env.NEXT_PUBLIC_APP_NAME || 'ProjoFlow',

  /** One-liner shown on marketing / onboarding pages */
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ||
    'Project management that gets out of your way — and works with your AI',

  /** Path to logo (relative to /public or an absolute URL) */
  logo: process.env.NEXT_PUBLIC_APP_LOGO || '/logo.svg',

  /** Primary brand colour – used for accents, buttons, active states */
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#10b981',

  /** Secondary / darker accent – gradients, hover states */
  accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR || '#059669',

  /** Canonical app URL (no trailing slash) */
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://projoflow.com',

  /** Support email shown to users */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'tech@z-flow.de',

  /** "From" address for transactional email */
  emailFrom:
    process.env.NEXT_PUBLIC_EMAIL_FROM ||
    `${process.env.NEXT_PUBLIC_APP_NAME || 'ProjoFlow'} <no-reply@${
      process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'projoflow.com'
    }>`,

  /** Domain used for sending email (Resend, SES, etc.) */
  emailDomain: process.env.NEXT_PUBLIC_EMAIL_DOMAIN || 'projoflow.com',

  /** Price displayed on the landing page */
  price: process.env.NEXT_PUBLIC_PRICE || '$197',

  /** Original price (shown as strikethrough) */
  originalPrice: process.env.NEXT_PUBLIC_ORIGINAL_PRICE || '$497',

  /** Purchase checkout URL (Gumroad, LemonSqueezy, Stripe, etc.) */
  purchaseUrl: process.env.NEXT_PUBLIC_PURCHASE_URL || '#pricing',

  /** Demo URL — demo button hidden when empty */
  demoUrl: process.env.NEXT_PUBLIC_DEMO_URL || '',

  /** Current year for copyright notices */
  copyrightYear: new Date().getFullYear(),
} as const

export type AppConfig = typeof appConfig
