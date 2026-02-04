'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClientSignIn, useAuthUser } from '@/lib/hooks/use-client-portal'
import { Zap, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const error = searchParams.get('error')
  const { user, loading: authLoading } = useAuthUser()
  const signIn = useClientSignIn()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (error === 'session_expired') {
      toast.error('Your session expired. Please sign in again.')
    }
  }, [error])

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect || '/portal')
    }
  }, [user, authLoading, router, redirect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await signIn.mutateAsync({ email, password })
      router.push(redirect || '/portal')
    } catch (error: any) {
      toast.error(error.message || 'Invalid email or password')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-emerald-500" />
            <span className="text-2xl font-bold text-white">z-flow</span>
          </div>
          <CardTitle className="text-white">Client Portal</CardTitle>
          <CardDescription className="text-zinc-400">
            Sign in to view your projects
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
                className="bg-zinc-800 border-zinc-700"
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
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-4">
            Don&apos;t have an account?{' '}
            <Link 
              href={redirect ? `/portal/signup?redirect=${redirect}` : '/portal/signup'} 
              className="text-emerald-500 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
