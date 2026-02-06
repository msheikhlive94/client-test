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
  Bot,
  Server,
  Lock,
  Rocket,
  Code,
  Sparkles,
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
   Features data
   ──────────────────────────────────────────── */
const features = [
  {
    icon: Bot,
    title: 'AI Assistant Integration (MCP)',
    desc: 'The only PM tool your AI can natively control. Built on Model Context Protocol — Claude Code, Cursor, and Cline can create tasks, log time, and manage workflows through natural conversation.',
    badge: 'EXCLUSIVE',
  },
  {
    icon: Palette,
    title: 'Complete White-Label Branding',
    desc: 'Custom logo, colors, and workspace name. Your clients see your brand, not ours. Built-in theming system with 40+ styled components.',
  },
  {
    icon: Server,
    title: 'Self-Hosted on Your Infrastructure',
    desc: 'Deploy to Vercel, Railway, or your own servers. Your data stays on your database. Full control, no vendor lock-in.',
  },
  {
    icon: Eye,
    title: 'Client Portal Built-In',
    desc: 'Secure client access with role-based permissions. Real-time project visibility without cluttering your workflow.',
  },
  {
    icon: Lock,
    title: 'Your Database, Your Rules',
    desc: 'Runs on Supabase (PostgreSQL) with row-level security. You own the infrastructure. No multi-tenant data sharing.',
  },
  {
    icon: Rocket,
    title: 'Deploy in Minutes',
    desc: 'One-click Vercel deploy, detailed docs, environment variable templates. From license to live in under 30 minutes.',
  },
]

/* ────────────────────────────────────────────
   Why Self-Hosted comparison
   ──────────────────────────────────────────── */
const comparisons = [
  {
    feature: 'Data ownership',
    saas: 'Their servers',
    selfHosted: 'Your database',
    highlight: true,
  },
  {
    feature: 'Monthly costs',
    saas: '$29-$79/month forever',
    selfHosted: 'One-time license',
    highlight: true,
  },
  {
    feature: 'Branding',
    saas: 'Their logo, their colors',
    selfHosted: 'Fully white-labeled',
    highlight: false,
  },
  {
    feature: 'Customization',
    saas: 'Limited to their features',
    selfHosted: 'Full source code access',
    highlight: false,
  },
  {
    feature: 'AI integration',
    saas: 'API calls (if available)',
    selfHosted: 'Native MCP server',
    highlight: true,
  },
  {
    feature: 'Updates',
    saas: 'Forced on their schedule',
    selfHosted: 'You control when',
    highlight: false,
  },
]

/* ────────────────────────────────────────────
   FAQ data
   ──────────────────────────────────────────── */
const faqs = [
  {
    q: 'How does the MCP integration work?',
    a: 'ProjoFlow includes an MCP server that lets AI assistants (Claude Code, Cursor, Cline) directly interact with your project data. Your AI can create tasks, update status, log time, and query projects through natural conversation. No API setup, no middleware — just works.',
  },
  {
    q: 'What do I get with the license?',
    a: 'Full source code, deployment docs, MCP server, white-label branding system, client portal, time tracking, and all features. Plus free updates forever and email support (first 100 licenses only).',
  },
  {
    q: 'Can I customize the code?',
    a: 'Absolutely. You get the full Next.js/React source. Modify features, add integrations, change the UI — it\'s yours. The license only restricts reselling the code itself.',
  },
  {
    q: 'How hard is deployment?',
    a: 'If you can click a Vercel "Deploy" button, you can deploy ProjoFlow. Setup wizard handles database migrations, environment variables are documented, and you\'ll be live in ~30 minutes.',
  },
  {
    q: 'What if I need help?',
    a: 'First 100 license holders get email support. After that, we provide detailed docs and a community Discord. You can also hire your own developers — you have the source code.',
  },
  {
    q: 'Do I need to keep paying monthly?',
    a: 'Nope. One-time purchase. Your only ongoing costs are your own hosting (Vercel has a generous free tier, Supabase too). No recurring fees to us.',
  },
  {
    q: 'Can I use this for multiple clients?',
    a: 'Yes! The license is per entity (your agency/company), not per deployment. Use it for all your client projects. Just don\'t resell the code itself.',
  },
  {
    q: 'What about updates?',
    a: 'Free updates forever via GitHub. You pull updates when you want them, test in staging, and deploy on your schedule.',
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
   Testimonial Card (placeholder for now)
   ──────────────────────────────────────────── */
function TestimonialCard({
  quote,
  name,
  role,
  company,
}: {
  quote: string
  name: string
  role: string
  company: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="mb-4 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        ))}
      </div>
      <p className="mb-4 text-zinc-300 leading-relaxed">"{quote}"</p>
      <div>
        <p className="font-medium text-white">{name}</p>
        <p className="text-sm text-zinc-400">
          {role} · {company}
        </p>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Main Landing Page Component
   ──────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const hero = useInView(0.1)
  const features1 = useInView()
  const comparison = useInView()
  const faq = useInView()
  const cta = useInView()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ──── Navigation ──── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {appConfig.logo ? (
                <Image
                  src={appConfig.logo}
                  alt={appConfig.name}
                  width={32}
                  height={32}
                  className="rounded"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-purple-600">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <span className="text-lg font-bold">{appConfig.name}</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:gap-6">
              <Link
                href="#features"
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Features
              </Link>
              <Link
                href="#comparison"
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Why Self-Hosted
              </Link>
              <Link
                href="#faq"
                className="text-sm text-zinc-400 transition-colors hover:text-white"
              >
                FAQ
              </Link>
              <Link
                href="#pricing"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-500 hover:to-purple-500"
              >
                Get Your License
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-zinc-800 bg-black md:hidden">
            <div className="space-y-1 px-4 py-3">
              <Link
                href="#features"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#comparison"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Why Self-Hosted
              </Link>
              <Link
                href="#faq"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="#pricing"
                className="block rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Your License
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ──── Hero Section ──── */}
      <section className="relative overflow-hidden pt-24">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
        </div>

        <div
          ref={hero.ref}
          className={`mx-auto max-w-7xl px-4 py-20 text-center transition-all duration-1000 sm:px-6 lg:px-8 ${
            hero.visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-10 opacity-0'
          }`}
        >
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-zinc-300">
              The only PM tool with native AI integration
            </span>
          </div>

          <h1 className="mx-auto mb-6 max-w-4xl text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
            White-Label Project Management
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {' '}
              You Own & Control
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 sm:text-xl">
            One-time license. Self-hosted. Full branding. Built for agencies and
            consultancies who want control over their infrastructure and their
            brand.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="#pricing"
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-medium text-white transition-all hover:from-blue-500 hover:to-purple-500 sm:w-auto"
            >
              Get Your License
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            {appConfig.demoUrl && (
              <Link
                href={appConfig.demoUrl}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-4 font-medium text-white transition-colors hover:bg-zinc-900 sm:w-auto"
              >
                <Code className="h-5 w-5" />
                View Demo
              </Link>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span>One-time payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-500" />
              <span>Full source code</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <span>Free updates forever</span>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Features Section ──── */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            ref={features1.ref}
            className={`mb-16 text-center transition-all duration-1000 ${
              features1.visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            <h2 className="mb-4 text-4xl font-bold">
              Built for Agencies Who Need Control
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400">
              Everything you need to manage client projects — on your
              infrastructure, with your branding.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-500 hover:border-zinc-700 ${
                  features1.visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    <feature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  {feature.badge && (
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Comparison Table ──── */}
      <section id="comparison" className="bg-zinc-950/50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div
            ref={comparison.ref}
            className={`mb-16 text-center transition-all duration-1000 ${
              comparison.visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            <h2 className="mb-4 text-4xl font-bold">
              Why Self-Hosted Beats Generic SaaS
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400">
              When your business depends on it, ownership matters.
            </p>
          </div>

          <div
            className={`overflow-hidden rounded-xl border border-zinc-800 transition-all duration-1000 ${
              comparison.visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            <table className="w-full">
              <thead className="bg-zinc-900/80">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400"></th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-zinc-400">
                    Generic SaaS
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-blue-400">
                    ProjoFlow (Self-Hosted)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {comparisons.map((item, i) => (
                  <tr
                    key={i}
                    className={`${
                      item.highlight ? 'bg-zinc-900/50' : 'bg-black'
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {item.feature}
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-500">
                      {item.saas}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-blue-400">
                      {item.selfHosted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ──── Pricing Section ──── */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-4xl font-bold">Simple, Transparent Pricing</h2>
          <p className="mb-12 text-lg text-zinc-400">
            One-time purchase. No recurring fees. Free updates forever.
          </p>

          <div className="rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-2xl">
            <div className="mb-6">
              <div className="mb-2 inline-block rounded-full bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-400">
                Early Launch Offer
              </div>
              <div className="mb-2 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">{appConfig.price}</span>
                <span className="text-xl text-zinc-500 line-through">{appConfig.originalPrice}</span>
              </div>
              <p className="text-zinc-400">One-time payment · Lifetime access</p>
            </div>

            <ul className="mb-8 space-y-3 text-left">
              {[
                'Full source code (Next.js, React, TypeScript)',
                'MCP server for AI integration',
                'White-label branding system',
                'Client portal & time tracking',
                'Deployment docs & setup wizard',
                'Free updates forever (via GitHub)',
                'Email support (first 100 licenses)',
                'No monthly fees, ever',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={appConfig.purchaseUrl}
              className="group flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-medium text-white transition-all hover:from-blue-500 hover:to-purple-500"
            >
              Get Your License Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <p className="mt-6 text-sm text-zinc-500">
              First 100 licenses include email support. After that, docs-only.
            </p>
          </div>
        </div>
      </section>

      {/* ──── FAQ Section ──── */}
      <section id="faq" className="bg-zinc-950/50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div
            ref={faq.ref}
            className={`mb-12 text-center transition-all duration-1000 ${
              faq.visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            <h2 className="mb-4 text-4xl font-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-zinc-400">
              Everything you need to know before purchasing.
            </p>
          </div>

          <div
            className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-1000 ${
              faq.visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }`}
          >
            {faqs.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ──── Final CTA Section ──── */}
      <section className="py-20">
        <div
          ref={cta.ref}
          className={`mx-auto max-w-4xl px-4 text-center transition-all duration-1000 sm:px-6 lg:px-8 ${
            cta.visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-10 opacity-0'
          }`}
        >
          <div className="rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-12 border border-blue-500/20">
            <h2 className="mb-4 text-4xl font-bold">
              Ready to Own Your Project Management?
            </h2>
            <p className="mb-8 text-lg text-zinc-400">
              Join the agencies and consultancies who chose control over
              convenience.
            </p>

            <Link
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-medium text-white transition-all hover:from-blue-500 hover:to-purple-500"
            >
              Get Your License
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <p className="mt-6 text-sm text-zinc-500">
              Questions? Email us at {appConfig.supportEmail}
            </p>
          </div>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              {appConfig.logo ? (
                <Image
                  src={appConfig.logo}
                  alt={appConfig.name}
                  width={24}
                  height={24}
                  className="rounded"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-purple-600">
                  <Building2 className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm text-zinc-400">
                © {appConfig.copyrightYear} {appConfig.name}. All rights reserved.
              </span>
            </div>

            <div className="flex gap-6 text-sm text-zinc-400">
              <Link href="/docs" className="hover:text-white">
                Documentation
              </Link>
              <Link href="/license" className="hover:text-white">
                License Terms
              </Link>
              <Link href="/support" className="hover:text-white">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
