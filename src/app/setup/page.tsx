'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Rocket,
  KeyRound,
  Keyboard,
  Users,
  LayoutDashboard,
  Database,
  CheckCircle2,
  Shield,
  Key,
  ChevronDown,
  ChevronUp,
  Search,
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
}

const TOTAL_STEPS = 4

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
/*  Step 1 — License Key Validation                                    */
/* ------------------------------------------------------------------ */

function StepLicenseKey({ onComplete }: { onComplete: () => void }) {
  const [licenseKey, setLicenseKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)

  const validateLicense = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter your license key')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      // Call the central ProjoFlow license validation API
      const licenseApiUrl = process.env.NEXT_PUBLIC_LICENSE_API_URL || 'https://www.projoflow.com/api/license/validate'
      
      const res = await fetch(licenseApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setError(data.message || 'Invalid license key')
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
        <div className="flex items-center justify-center gap-3 mb-3">
          <Image
            src={appConfig.logo}
            alt={appConfig.name}
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <h1 className="text-2xl font-bold text-text-primary">{appConfig.name}</h1>
        </div>
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-2">
          <Key className="h-6 w-6 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          Enter Your License Key
        </h2>
        <p className="text-text-secondary text-sm">
          Set up your workspace in under 2 minutes. Enter the license key from your purchase email.
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
              <p className="text-xs text-text-muted">
                Format: <code className="text-brand">PJ-XXXXX-XXXXX-XXXXX</code>
              </p>
            </div>

            {/* Expandable help section */}
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <Search className="h-3 w-3" />
              <span>Can&apos;t find your key?</span>
              {showHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showHelp && (
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2 text-xs text-text-muted">
                <p>1. Check the confirmation email from your purchase platform (Gumroad, LemonSqueezy, or Stripe)</p>
                <p>2. Search your inbox for &quot;ProjoFlow&quot; or &quot;PJ-&quot;</p>
                <p>3. Check spam/promotions folders</p>
                <p className="text-amber-400 pt-1">
                  Still can&apos;t find it? Email {appConfig.supportEmail}
                </p>
              </div>
            )}

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
/*  Step 2 — Database Setup                                            */
/* ------------------------------------------------------------------ */

function StepDatabase({ onComplete }: { onComplete: () => void }) {
  const [databaseHost, setDatabaseHost] = useState('')
  const [databasePassword, setDatabasePassword] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showPasswordHelp, setShowPasswordHelp] = useState(false)

  const testConnection = async () => {
    if (!databaseHost.trim()) {
      setError('Please enter your database host')
      return
    }
    if (!databasePassword.trim()) {
      setError('Please enter your database password')
      return
    }

    setIsTesting(true)
    setError(null)
    setErrorDetails(null)

    try {
      const res = await fetch('/api/setup/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseHost, databasePassword, testOnly: true }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Connection failed')
        setErrorDetails(data.detail || null)
        setIsTesting(false)
        return
      }

      setIsConnected(true)
      setIsTesting(false)
    } catch (err: any) {
      setError(err.message || 'Failed to test connection')
      setIsTesting(false)
    }
  }

  const runMigrations = async () => {
    setIsRunning(true)
    setError(null)
    setErrorDetails(null)
    setProgress(10)

    // Simulate progress while waiting for response
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 85))
    }, 500)

    try {
      const res = await fetch('/api/setup/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseHost, databasePassword }),
      })

      clearInterval(progressInterval)
      const data = await res.json()

      if (!res.ok) {
        setProgress(0)
        setError(data.error || 'Database setup failed')
        if (data.failedMigrations?.length > 0) {
          setErrorDetails(
            data.failedMigrations.map((f: any) => `${f.file}: ${f.error}`).join('\n')
          )
        }
        setIsRunning(false)
        return
      }

      setProgress(100)
      setTimeout(() => {
        setIsComplete(true)
        setIsRunning(false)
      }, 500)
    } catch (err: any) {
      clearInterval(progressInterval)
      setProgress(0)
      setError(err.message || 'Failed to run database setup')
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
          Connect to your Supabase database and configure tables automatically.
        </p>
      </div>

      {!isComplete && (
        <>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              {errorDetails && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-red-400/60 hover:text-red-400 flex items-center gap-1"
                  >
                    Technical details
                    {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showDetails && (
                    <pre className="text-xs text-red-400/50 whitespace-pre-wrap font-mono bg-red-500/5 rounded p-2 max-h-32 overflow-y-auto">
                      {errorDetails}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-text-primary">
                Database Host
              </Label>
              <Input
                type="text"
                value={databaseHost}
                onChange={(e) => {
                  setDatabaseHost(e.target.value)
                  setIsConnected(false)
                  setError(null)
                }}
                placeholder="aws-1-eu-west-1.pooler.supabase.com"
                className="bg-zinc-800 border-border-default h-10 font-mono text-sm"
                disabled={isRunning}
              />
              <p className="text-xs text-text-muted">
                Copy from your Supabase project → <strong className="text-text-secondary">Connect</strong> → <strong className="text-text-secondary">Transaction pooler</strong> → <strong className="text-text-secondary">host</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-text-primary">
                Supabase Database Password
              </Label>
              <Input
                type="password"
                value={databasePassword}
                onChange={(e) => {
                  setDatabasePassword(e.target.value)
                  setIsConnected(false)
                  setError(null)
                }}
                placeholder="Enter your database password"
                className="bg-zinc-800 border-border-default h-10 font-mono text-sm"
                disabled={isRunning}
              />

              {/* Expandable help */}
              <button
                type="button"
                onClick={() => setShowPasswordHelp(!showPasswordHelp)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                <Search className="h-3 w-3" />
                <span>Where do I find this?</span>
                {showPasswordHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showPasswordHelp && (
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2 text-xs text-text-muted">
                  <p>1. Go to your <strong className="text-text-secondary">Supabase project dashboard</strong></p>
                  <p>2. Click <strong className="text-text-secondary">Settings</strong> (gear icon) in the left sidebar</p>
                  <p>3. Click <strong className="text-text-secondary">Database</strong></p>
                  <p>4. Your database password is what you set when creating the project</p>
                  <p className="text-amber-400 pt-1">
                    This is NOT an API key — it&apos;s the password you chose during Supabase project creation.
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar (shown during migration) */}
            {isRunning && (
              <div className="space-y-2">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted text-center">
                  Configuring database tables, security policies, and functions...
                </p>
              </div>
            )}

            {/* Connection test → then run migrations */}
            {!isConnected && !isRunning && (
              <Button
                onClick={testConnection}
                disabled={isTesting || !databaseHost.trim() || !databasePassword.trim()}
                className="w-full bg-brand hover:bg-brand-hover text-white"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing connection...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            )}

            {isConnected && !isRunning && (
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-emerald-400">Connection successful!</p>
                </div>
                <Button
                  onClick={runMigrations}
                  className="w-full bg-brand hover:bg-brand-hover text-white"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Setup Database
                </Button>
              </div>
            )}

            <p className="text-xs text-text-muted text-center">
              Your password is used once for this setup and is never stored.
            </p>
          </div>
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
              All tables, security policies, and functions are configured.
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
/*  Step 3 — Admin Account + Workspace (combined)                      */
/* ------------------------------------------------------------------ */

function StepAccount({
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
          Create Your Account
        </h2>
        <p className="text-text-secondary text-sm">
          Set up your admin account and workspace details.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Admin account fields */}
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

        {/* Workspace fields (combined into same step) */}
        <div className="pt-2 border-t border-border-default space-y-4">
          <div className="space-y-2">
            <Label className="text-text-primary">
              Company Name{' '}
              <span className="text-text-muted font-normal">(optional)</span>
            </Label>
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
              You can update branding later in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Done!                                                     */
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
  const canProceedStep3 =
    data.email.length > 0 &&
    data.password.length >= 6 &&
    data.password === data.confirmPassword

  const canProceed = (s: number) => {
    switch (s) {
      case 1:
        return false // License validation handles its own navigation
      case 2:
        return false // Database migration handles its own navigation
      case 3:
        return canProceedStep3
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
    // On step 3 (Account), submit everything before moving to step 4 (Done)
    if (step === 3) {
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
            {step === 1 && <StepLicenseKey onComplete={goNext} />}
            {step === 2 && <StepDatabase onComplete={goNext} />}
            {step === 3 && (
              <StepAccount
                data={data}
                onChange={updateData}
                error={error}
              />
            )}
            {step === 4 && <StepComplete />}
          </div>

          {/* Navigation buttons (only for step 3 — Account) */}
          {step === 3 && (
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

              <Button
                onClick={handleNext}
                disabled={!canProceed(step) || isSubmitting}
                className="bg-brand hover:bg-brand-hover text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Done step — go to dashboard */}
          {step === TOTAL_STEPS && (
            <div className="mt-8 pt-4 border-t border-border-default flex justify-center">
              <Button
                onClick={() => router.replace('/login')}
                className="bg-brand hover:bg-brand-hover text-white px-8 h-11 text-base"
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
