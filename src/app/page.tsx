'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { appConfig } from '@/lib/config/theme'
import {
  Building2,
  Eye,
  Clock,
  AtSign,
  FileInput,
  Palette,
  Check,
  ChevronDown,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Menu,
  X,
} from 'lucide-react'

/* ────────────────────────────────────────────
   Intersection Observer hook for scroll animations
   ──────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

/* ────────────────────────────────────────────
   Pricing data
   ──────────────────────────────────────────── */
const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for freelancers getting started',
    features: [
      '1 workspace',
      '3 projects',
      '2 team members',
      'Basic task management',
      'Email support',
    ],
    cta: 'Get Started Free',
    highlight: false,
    priceId: null,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    description: 'For growing agencies & teams',
    features: [
      'Unlimited projects',
      '10 team members',
      'Client portal',
      'Time tracking & billing',
      '@Mentions & comments',
      'Lead intake forms',
      'Priority email support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
    priceId: 'pro',
  },
  {
    name: 'Business',
    price: '$79',
    period: '/mo',
    description: 'For agencies that need it all',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'White-label branding',
      'API access',
      'Advanced reporting',
      'Priority support',
      'Custom onboarding',
    ],
    cta: 'Start Free Trial',
    highlight: false,
    priceId: 'business',
  },
]

/* ────────────────────────────────────────────
   Features data
   ──────────────────────────────────────────── */
const features = [
  {
    icon: Building2,
    title: 'Multi-Tenant Workspaces',
    desc: 'Isolated workspaces per client or team with role-based access control.',
  },
  {
    icon: Eye,
    title: 'Client Portal',
    desc: 'Give clients real-time visibility into task progress without cluttering your workflow.',
  },
  {
    icon: Clock,
    title: 'Time Tracking & Billing',
    desc: 'Track billable hours, set rates per project, and generate invoices effortlessly.',
  },
  {
    icon: AtSign,
    title: '@Mentions & Comments',
    desc: 'Real-time collaboration with threaded comments and instant @mention notifications.',
  },
  {
    icon: FileInput,
    title: 'Lead Intake Forms',
    desc: 'Embed branded forms to capture leads and automatically create projects on submission.',
  },
  {
    icon: Palette,
    title: 'White-Label Branding',
    desc: 'Custom logo, colours, and domain — your clients see your brand, not ours.',
  },
]

/* ────────────────────────────────────────────
   FAQ data
   ──────────────────────────────────────────── */
const faqs = [
  {
    q: 'Can I try TaskFlow Pro before committing?',
    a: 'Absolutely. The Starter plan is free forever — no credit card required. Paid plans include a 14-day free trial so you can explore every feature risk-free.',
  },
  {
    q: 'How does the client portal work?',
    a: 'Each client gets a secure, branded portal where they can view project progress, leave comments, and upload files. You control exactly what they can see.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade, downgrade, or cancel anytime from your billing settings. Changes take effect immediately and we prorate the difference.',
  },
  {
    q: 'Is my data secure?',
    a: 'We use Supabase (built on PostgreSQL) with row-level security, encrypted connections, and SOC 2-compliant infrastructure. Your data stays yours.',
  },
  {
    q: 'Do you offer custom onboarding?',
    a: "Business plan customers get a dedicated onboarding session. We'll help migrate your data, set up workspaces, and train your team.",
  },
  {
    q: 'What happens when I hit a plan limit?',
    a: "We'll let you know before you hit any limits. You can upgrade at any time, and your existing data is never deleted.",
  },
]

/* ────────────────────────────────────────────
   FAQ Accordion Item
   ──────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-white">{q}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-zinc-400 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Checkout helper
   ──────────────────────────────────────────── */
async function handleCheckout(priceId: string | null) {
  if (!priceId) {
    window.location.href = '/setup'
    return
  }

  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: priceId }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      // Fallback: go to signup
      window.location.href = '/setup'
    }
  } catch {
    window.location.href = '/setup'
  }
}

/* ════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════ */
export default function LandingPage() {
  const hero = useInView(0.1)
  const social = useInView()
  const feat = useInView()
  const pricing = useInView()
  const faq = useInView()
  const cta = useInView()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={appConfig.logo}
              alt={appConfig.name}
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-lg font-bold tracking-tight">{appConfig.name}</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Features
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-zinc-400 transition-colors hover:text-white">
              FAQ
            </a>
          </div>

          {/* CTA buttons */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/setup"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-80 border-t border-zinc-800' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-4 p-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white"
            >
              FAQ
            </a>
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white">
                Login
              </Link>
              <Link
                href="/setup"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-[100px]" />
        </div>

        <div
          ref={hero.ref}
          className={`relative mx-auto max-w-4xl px-4 text-center sm:px-6 transition-all duration-700 ${
            hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
            Built for agencies that move fast
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Project management that{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              gets out of your way
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed sm:text-xl">
            Track projects, manage clients, log time, and close deals — all in one
            beautiful workspace your whole team will actually enjoy using.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/25"
            >
              Start Free — No Card Required
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
            >
              See Features
            </a>
          </div>

          {/* Dashboard mockup area */}
          <div className="relative mt-16 sm:mt-20">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/50">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="ml-4 h-4 w-48 rounded bg-zinc-800" />
              </div>
              <div className="grid grid-cols-4 gap-3 p-4 sm:p-6">
                {/* Stat cards mockup */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg bg-zinc-800/60 p-3 sm:p-4">
                    <div className="h-2 w-12 rounded bg-zinc-700 mb-2" />
                    <div className="h-5 w-8 rounded bg-emerald-500/20" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="space-y-2 rounded-lg bg-zinc-800/60 p-3 sm:p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500/40" />
                      <div className="h-2 flex-1 rounded bg-zinc-700" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2 rounded-lg bg-zinc-800/60 p-3 sm:p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500/40" />
                      <div className="h-2 flex-1 rounded bg-zinc-700" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow effect under mockup */}
            <div className="absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section
        ref={social.ref}
        className={`border-y border-zinc-800/60 py-12 transition-all duration-700 delay-100 ${
          social.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Trusted by 100+ agencies worldwide
            </p>
            <div className="flex items-center gap-8 text-zinc-600">
              {['Agency One', 'Studio X', 'DevShop', 'PixelCraft'].map((name) => (
                <span key={name} className="text-sm font-semibold tracking-wide whitespace-nowrap">
                  {name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              ))}
              <span className="ml-2 text-sm text-zinc-400">4.9/5</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 sm:py-32">
        <div
          ref={feat.ref}
          className={`mx-auto max-w-6xl px-4 sm:px-6 transition-all duration-700 ${
            feat.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">
              Everything you need
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Powerful features, zero complexity
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              From project tracking to client management, TaskFlow Pro gives your agency
              superpowers without the learning curve.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-zinc-900"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 inline-flex rounded-lg bg-emerald-500/10 p-3 text-emerald-500 transition-colors group-hover:bg-emerald-500/20">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 sm:py-32 bg-zinc-900/30">
        <div
          ref={pricing.ref}
          className={`mx-auto max-w-6xl px-4 sm:px-6 transition-all duration-700 ${
            pricing.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">
              Simple pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Choose the plan that fits your agency
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                  plan.highlight
                    ? 'border-emerald-500/40 bg-zinc-900 shadow-lg shadow-emerald-500/5'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-lg text-zinc-400">{plan.period}</span>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25'
                      : 'border border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 sm:py-32">
        <div
          ref={faq.ref}
          className={`mx-auto max-w-3xl px-4 sm:px-6 transition-all duration-700 ${
            faq.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-12 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/50 px-6">
            {faqs.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 sm:py-32">
        <div
          ref={cta.ref}
          className={`mx-auto max-w-4xl px-4 sm:px-6 text-center transition-all duration-700 ${
            cta.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-10 sm:p-16">
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[80px]" />
            </div>

            <div className="relative">
              <Shield className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
              <h2 className="text-3xl font-bold sm:text-4xl">
                Ready to streamline your agency?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-zinc-400">
                Join 100+ agencies managing projects, clients, and billing with TaskFlow Pro.
                Free to start, scales as you grow.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/setup"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/25"
                >
                  Start Free Today
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                No credit card required · Free plan available forever
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src={appConfig.logo}
                  alt={appConfig.name}
                  width={24}
                  height={24}
                  className="h-6 w-6"
                />
                <span className="text-base font-bold">{appConfig.name}</span>
              </Link>
              <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                Project management built for agencies. Track, collaborate, and bill — all in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-300">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-zinc-500 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-zinc-500 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="text-sm text-zinc-500 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-300">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-zinc-500">About</span></li>
                <li><span className="text-sm text-zinc-500">Blog</span></li>
                <li><span className="text-sm text-zinc-500">Careers</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-300">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-zinc-500">Privacy Policy</span></li>
                <li><span className="text-sm text-zinc-500">Terms of Service</span></li>
                <li><span className="text-sm text-zinc-500">Security</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-800/60 pt-8 sm:flex-row">
            <p className="text-sm text-zinc-600">
              © {appConfig.copyrightYear} {appConfig.name}. All rights reserved.
            </p>
            <p className="text-xs text-zinc-700">
              {appConfig.supportEmail}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
