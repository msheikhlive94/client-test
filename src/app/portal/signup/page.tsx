'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClientSignUp, useAuthUser } from '@/lib/hooks/use-client-portal'
import { Loader2, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { appConfig } from '@/lib/config/theme'
import Link from 'next/link'
import { toast } from 'sonner'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const { user, loading: authLoading } = useAuthUser()
  const signUp = useClientSignUp()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect || '/portal')
    }
  }, [user, authLoading, router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    try {
      const result = await signUp.mutateAsync({ email, password })
      
      // If auto-confirm is enabled, user is automatically logged in
      // Check if the session exists
      if (result.session) {
        // User is logged in, redirect to invitation acceptance
        toast.success('Account created! Redirecting...')
        router.push(redirect || '/portal')
      } else {
        // Email confirmation required
        setSubmitted(true)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-surface-raised border-border-default">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-brand" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Check Your Email</h2>
            <p className="text-text-secondary">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>. 
              Click the link to activate your account.
            </p>
            <Link href="/portal/login">
              <Button className="mt-6 bg-brand hover:bg-brand-hover text-white">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface-raised border-border-default">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src={appConfig.logo} alt={appConfig.name} width={32} height={32} className="h-8 w-8" />
            <span className="text-2xl font-bold text-text-primary">{appConfig.name}</span>
          </div>
          <CardTitle className="text-text-primary">Create Account</CardTitle>
          <CardDescription className="text-text-secondary">
            Sign up to access the client portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-surface-raised border-border-default"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-surface-raised border-border-default"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-surface-raised border-border-default"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover text-white"
              disabled={signUp.isPending}
            >
              {signUp.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{' '}
            <Link 
              href={redirect ? `/portal/login?redirect=${redirect}` : '/portal/login'} 
              className="text-brand hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PortalSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
