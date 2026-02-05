'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  FolderPlus,
  Rocket,
  SkipForward,
  KeyRound,
  Keyboard,
  Users,
  LayoutDashboard,
  Database,
  CheckCircle2,
  XCircle,
  Shield,
  Key,
} from 'lucide-react'
import { appConfig } from '@/lib/config/theme'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SetupData {
  email: string
  password: string
  confirmPassword: string
  companyName: string
  logoUrl: string
  projectName: string
  projectDescription: string
}

const TOTAL_STEPS = 7

/* ------------------------------------------------------------------ */
/*  Progress Dots                                                      */
/* ------------------------------------------------------------------ */

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        return (
          <div
            key={step}
            className={`
              h-2 rounded-full transition-all duration-500 ease-out
              ${isActive ? 'w-8 bg-emerald-500' : isCompleted ? 'w-2 bg-emerald-500/60' : 'w-2 bg-zinc-700'}
            `}
          />
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Welcome                                                   */
/* ------------------------------------------------------------------ */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center gap-3 mb-2">
        <Image
          src={appConfig.logo}
          alt={appConfig.name}
          width={48}
          height={48}
          className="h-12 w-12"
        />
        <h1 className="text-3xl font-bold text-text-primary">{appConfig.name}</h1>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-text-primary">
          Welcome to {appConfig.name}
        </h2>
        <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
          Let&apos;s get your workspace set up in under 2 minutes. You&apos;ll
          create your admin account, configure your workspace, and optionally
          set up your first project.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="grid grid-cols-5 gap-3 text-center max-w-2xl w-full">
          {[
            { icon: Key, label: 'License' },
            { icon: Database, label: 'Database' },
            { icon: KeyRound, label: 'Account' },
            { icon: Building2, label: 'Workspace' },
            { icon: FolderPlus, label: 'Project' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800/50"
            >
              <Icon className="h-5 w-5 text-brand" />
              <span className="text-xs text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onNext}
        className="bg-brand hover:bg-brand-hover text-white text-text-primary px-8 h-11 text-base"
      >
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2 — License Key Validation                                    */
/* ------------------------------------------------------------------ */

function StepLicenseKey({ onComplete }: { onComplete: () => void }) {
  const [licenseKey, setLicenseKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<any>(null)

  const validateLicense = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter your license key')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setError(data.error || 'Invalid license key')
        setIsValidating(false)
        return
      }

      setProductInfo(data)
      setIsValid(true)
      setIsValidating(false)
    } catch (err: any) {
      setError(err.message || 'Failed to validate license')
      setIsValidating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      validateLicense()
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <Key className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Enter Your License Key
        </h2>
        <p className="text-text-secondary text-sm">
          Enter the license key from your purchase email to continue.
        </p>
      </div>

      {!isValid && (
        <>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-text-primary">License Key</Label>
              <Input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="PJ-XXXXX-XXXXX-XXXXX"
                className="bg-zinc-800 border-border-default h-10 font-mono text-sm"
                disabled={isValidating}
                autoFocus
              />
              <div className="text-xs text-text-muted space-y-1">
                <p>
                  📧 Check your purchase email for your license key.
                </p>
                <p>
                  Format: <code className="text-brand">PJ-XXXXX-XXXXX-XXXXX</code>
                </p>
                <p className="text-amber-400">
                  💡 Lost your key? Email support@projoflow.com
                </p>
              </div>
            </div>

            <Button
              onClick={validateLicense}
              disabled={isValidating || !licenseKey.trim()}
              className="w-full bg-brand hover:bg-brand-hover text-white"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Validate License
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {isValid && productInfo && (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-text-primary">
              License Verified!
            </h3>
            <p className="text-text-secondary text-sm">
              {productInfo.message}
            </p>
            {productInfo.purchaseEmail && (
              <p className="text-xs text-text-muted">
                Licensed to: {productInfo.purchaseEmail}
              </p>
            )}
          </div>

          <Button
            onClick={onComplete}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            Continue Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Database Setup (Migrations)                               */
/* ------------------------------------------------------------------ */

function StepDatabaseMigration({ onComplete }: { onComplete: () => void }) {
  const [databasePassword, setDatabasePassword] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  const runMigrations = async () => {
    if (!databasePassword.trim()) {
      setError('Please enter your database password')
      return
    }

    setIsRunning(true)
    setError(null)
    setResults([])

    try {
      const res = await fetch('/api/setup/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databasePassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Migration failed')
        if (data.results) setResults(data.results)
        setIsRunning(false)
        return
      }

      setResults(data.results || [])
      setIsComplete(true)
      setIsRunning(false)
    } catch (err: any) {
      setError(err.message || 'Failed to run migrations')
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <Database className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Database Setup
        </h2>
        <p className="text-text-secondary text-sm">
          We'll automatically set up your database tables and security policies.
        </p>
      </div>

      {!isComplete && (
        <>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-text-primary">
                Supabase Database Password
              </Label>
              <Input
                type="password"
                value={databasePassword}
                onChange={(e) => setDatabasePassword(e.target.value)}
                placeholder="Enter your database password"
                className="bg-zinc-800 border-border-default h-10 font-mono text-sm"
                disabled={isRunning}
              />
              <div className="text-xs text-text-muted space-y-1">
                <p>
                  📍 <strong>Where to find it:</strong> Supabase Dashboard →
                  Settings → Database → Connection String
                </p>
                <p>
                  This is the password you set when creating your Supabase
                  project (not the API keys).
                </p>
                <p className="text-amber-400">
                  🔒 This password is used once and never stored.
                </p>
              </div>
            </div>

            <Button
              onClick={runMigrations}
              disabled={isRunning || !databasePassword.trim()}
              className="w-full bg-brand hover:bg-brand-hover text-white"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running migrations...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Setup Database
                </>
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Migration Results:
              </p>
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  {r.success ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="text-text-secondary font-mono">
                      {r.file}
                    </span>
                    {r.error && (
                      <p className="text-text-muted mt-0.5">{r.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isComplete && (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-text-primary">
              Database Ready!
            </h3>
            <p className="text-text-secondary text-sm">
              All migrations completed successfully. Your database is ready to
              use.
            </p>
          </div>

          <Button
            onClick={onComplete}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            Continue Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Create Admin Account                                      */
/* ------------------------------------------------------------------ */

function StepAdminAccount({
  data,
  onChange,
  error,
}: {
  data: SetupData
  onChange: (partial: Partial<SetupData>) => void
  error: string | null
}) {
  const passwordsMatch =
    data.confirmPassword.length === 0 || data.password === data.confirmPassword
  const passwordLongEnough = data.password.length >= 6

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <KeyRound className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Create Admin Account
        </h2>
        <p className="text-text-secondary text-sm">
          This will be the primary administrator of your workspace.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-text-primary">Email Address</Label>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="admin@yourcompany.com"
            className="bg-zinc-800 border-border-default h-10"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-text-primary">Password</Label>
          <Input
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Min. 6 characters"
            className="bg-zinc-800 border-border-default h-10"
            autoComplete="new-password"
            required
          />
          {data.password.length > 0 && !passwordLongEnough && (
            <p className="text-xs text-amber-400">
              Password must be at least 6 characters
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-text-primary">Confirm Password</Label>
          <Input
            type="password"
            value={data.confirmPassword}
            onChange={(e) => onChange({ confirmPassword: e.target.value })}
            placeholder="Re-enter your password"
            className="bg-zinc-800 border-border-default h-10"
            autoComplete="new-password"
            required
          />
          {!passwordsMatch && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Workspace Settings                                        */
/* ------------------------------------------------------------------ */

function StepWorkspace({
  data,
  onChange,
}: {
  data: SetupData
  onChange: (partial: Partial<SetupData>) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <Building2 className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">Workspace Settings</h2>
        <p className="text-text-secondary text-sm">
          Tell us about your company or organization.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-text-primary">Company / Organization Name</Label>
          <Input
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            placeholder="Acme Agency"
            className="bg-zinc-800 border-border-default h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-text-primary">
            Logo URL{' '}
            <span className="text-text-muted font-normal">(optional)</span>
          </Label>
          <Input
            value={data.logoUrl}
            onChange={(e) => onChange({ logoUrl: e.target.value })}
            placeholder="https://yoursite.com/logo.png"
            className="bg-zinc-800 border-border-default h-10"
          />
          <p className="text-xs text-text-muted">
            Paste a URL to your company logo. You can update this later in
            Settings.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4 — First Project (Optional)                                  */
/* ------------------------------------------------------------------ */

function StepFirstProject({
  data,
  onChange,
}: {
  data: SetupData
  onChange: (partial: Partial<SetupData>) => void
}) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <FolderPlus className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Create Your First Project
        </h2>
        <p className="text-text-secondary text-sm">
          Optionally create a project to get started right away.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-text-primary">Project Name</Label>
          <Input
            value={data.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder="Website Redesign"
            className="bg-zinc-800 border-border-default h-10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-text-primary">
            Description{' '}
            <span className="text-text-muted font-normal">(optional)</span>
          </Label>
          <textarea
            value={data.projectDescription}
            onChange={(e) => onChange({ projectDescription: e.target.value })}
            placeholder="Brief description of the project..."
            rows={3}
            className="w-full rounded-md bg-zinc-800 border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
          />
        </div>
      </div>

      <div className="pt-1 text-center">
        <p className="text-xs text-text-muted">
          You can skip this step and create projects later from the dashboard.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Done!                                                     */
/* ------------------------------------------------------------------ */

function StepComplete() {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 mb-2">
        <Rocket className="h-8 w-8 text-brand" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-text-primary">
          Your Workspace is Ready!
        </h2>
        <p className="text-text-secondary max-w-sm mx-auto">
          Everything&apos;s set up. Here are some quick tips to get you started:
        </p>
      </div>

      <div className="grid gap-3 text-left max-w-sm mx-auto">
        {[
          {
            icon: LayoutDashboard,
            title: 'Dashboard',
            desc: 'View all your projects and activity at a glance',
          },
          {
            icon: Users,
            title: 'Invite Team',
            desc: 'Add team members and assign them to projects',
          },
          {
            icon: Keyboard,
            title: 'Keyboard Shortcuts',
            desc: 'Use Ctrl+K to quickly search and navigate',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-border-default/50"
          >
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const [data, setData] = useState<SetupData>({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    logoUrl: '',
    projectName: '',
    projectDescription: '',
  })

  // Check if setup is still required
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup')
        const json = await res.json()
        if (!json.setupRequired) {
          router.replace('/login')
          return
        }
      } catch {
        // If we can't check, allow access to setup page
      }
      setIsLoading(false)
    }
    checkSetup()
  }, [router])

  const updateData = (partial: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...partial }))
  }

  /* ---- Validation ---- */
  const canProceedStep4 =
    data.email.length > 0 &&
    data.password.length >= 6 &&
    data.password === data.confirmPassword

  const canProceed = (s: number) => {
    switch (s) {
      case 1:
        return true
      case 2:
        return false // License validation handles its own navigation
      case 3:
        return false // Database migration handles its own navigation
      case 4:
        return canProceedStep4
      case 5:
        return true // workspace settings are optional
      case 6:
        return true // project is optional
      default:
        return true
    }
  }

  /* ---- Navigation ---- */
  const goNext = () => {
    setDirection('forward')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  const goBack = () => {
    setDirection('backward')
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        email: data.email,
        password: data.password,
        companyName: data.companyName || undefined,
        logoUrl: data.logoUrl || undefined,
        project: data.projectName
          ? {
              name: data.projectName,
              description: data.projectDescription || undefined,
            }
          : undefined,
      }

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Setup failed. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Move to the "Done" step
      setDirection('forward')
      setStep(TOTAL_STEPS)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    }

    setIsSubmitting(false)
  }

  /* ---- Step advance handler ---- */
  const handleNext = async () => {
    // On step 6, submit everything before moving to step 7
    if (step === 6) {
      await handleSubmit()
      return
    }
    goNext()
  }

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg">
      {/* Step indicator */}
      <div className="flex justify-center mb-6">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Card */}
      <Card className="bg-surface-raised border-border-default overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Step content with transition */}
          <div
            key={step}
            className="animate-step-in"
            style={
              {
                '--slide-from': direction === 'forward' ? '24px' : '-24px',
              } as React.CSSProperties
            }
          >
            {step === 1 && <StepWelcome onNext={goNext} />}
            {step === 2 && <StepLicenseKey onComplete={goNext} />}
            {step === 3 && <StepDatabaseMigration onComplete={goNext} />}
            {step === 4 && (
              <StepAdminAccount
                data={data}
                onChange={updateData}
                error={error}
              />
            )}
            {step === 5 && <StepWorkspace data={data} onChange={updateData} />}
            {step === 6 && (
              <StepFirstProject data={data} onChange={updateData} />
            )}
            {step === 7 && <StepComplete />}
          </div>

          {/* Navigation buttons (hidden for step 1, 2, 3, and 7) */}
          {step > 3 && step < TOTAL_STEPS && (
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border-default">
              <Button
                variant="ghost"
                onClick={goBack}
                className="text-text-secondary hover:text-text-primary hover:bg-zinc-800"
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {step === 6 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      updateData({ projectName: '', projectDescription: '' })
                      handleSubmit()
                    }}
                    className="text-text-secondary hover:text-text-primary hover:bg-zinc-800"
                    disabled={isSubmitting}
                  >
                    <SkipForward className="mr-1 h-4 w-4" />
                    Skip
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={!canProceed(step) || isSubmitting}
                  className="bg-brand hover:bg-brand-hover text-white text-text-primary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : step === 6 ? (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Complete Setup
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Done step — go to dashboard */}
          {step === TOTAL_STEPS && (
            <div className="mt-8 pt-4 border-t border-border-default flex justify-center">
              <Button
                onClick={() => router.replace('/login')}
                className="bg-brand hover:bg-brand-hover text-white text-text-primary px-8 h-11 text-base"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-zinc-600 mt-4">
        {appConfig.name} &copy; {appConfig.copyrightYear}
      </p>
    </div>
  )
}
