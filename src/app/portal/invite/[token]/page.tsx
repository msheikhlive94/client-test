'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useValidateInvitation, useAcceptInvitation, useAuthUser, useClientSignUp } from '@/lib/hooks/use-client-portal'
import { Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const { user, loading: authLoading } = useAuthUser()
  const { data: invitation, isLoading: invLoading, error: invError } = useValidateInvitation(token)
  const acceptInvitation = useAcceptInvitation()
  const signUp = useClientSignUp()
  
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  useEffect(() => {
    // If user is logged in and invitation is valid, auto-accept
    if (user && invitation && !acceptInvitation.isPending && !acceptInvitation.isSuccess) {
      handleAccept()
    }
  }, [user, invitation])

  const handleAccept = async (userName?: string) => {
    if (!user || !invitation) return
    
    try {
      await acceptInvitation.mutateAsync({ 
        token, 
        userId: user.id,
        name: userName || name
      })
      toast.success('Welcome! Redirecting to portal...')
      router.push('/portal')
    } catch (error: any) {
      console.error('Accept invitation error:', error)
      toast.error(error.message || 'Failed to accept invitation')
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitation) return
    
    if (!name.trim()) {
      toast.error('Please enter your name')
      return
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setIsCreatingAccount(true)
    
    try {
      // Create account with invitation email
      const result = await signUp.mutateAsync({ 
        email: invitation.email, 
        password 
      })
      
      // If auto-confirm is enabled, user is automatically logged in
      if (result.session && result.user) {
        // User is logged in, now accept invitation with name
        await acceptInvitation.mutateAsync({ 
          token, 
          userId: result.user.id,
          name: name.trim()
        })
        toast.success('Account created! Welcome to the portal.')
        router.push('/portal')
      } else {
        toast.error('Account created but login failed. Please try signing in.')
        router.push(`/portal/login?redirect=/portal/invite/${token}`)
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Failed to create account')
      setIsCreatingAccount(false)
    }
  }

  if (authLoading || invLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (invError || !invitation) {
    const errorMessage = invError?.message || 'Unknown error'
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Invalid Invitation</h2>
            <p className="text-zinc-400 mb-2">
              {errorMessage === 'Invitation expired' 
                ? 'This invitation has expired.' 
                : 'This invitation link is invalid or has already been used.'}
            </p>
            <p className="text-sm text-zinc-500">
              Please contact us for a new invitation.
            </p>
            <a href="mailto:tech@z-flow.de" className="mt-4 inline-block">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Contact Support
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (acceptInvitation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Welcome!</h2>
            <p className="text-zinc-400 mb-6">
              You now have access to {invitation.clients?.name}&apos;s projects.
            </p>
            <Link href="/portal">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Go to Portal →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User not logged in - show password setup form
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-emerald-500" />
              <span className="text-2xl font-bold text-white">z-flow</span>
            </div>
            <CardTitle className="text-white text-xl">You&apos;re Invited!</CardTitle>
            <p className="text-zinc-400 text-sm mt-2">
              Set a password to access <strong className="text-white">{invitation.clients?.name}</strong>&apos;s projects
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-zinc-800 border-zinc-700 text-zinc-400"
                />
              </div>
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
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
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-zinc-800 border-zinc-700"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isCreatingAccount}
              >
                {isCreatingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Access Portal'
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-zinc-500 mt-4">
              Already have an account?{' '}
              <Link 
                href={`/portal/login?redirect=/portal/invite/${token}`}
                className="text-emerald-500 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User logged in, accepting invitation
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Accepting invitation...</p>
        </CardContent>
      </Card>
    </div>
  )
}
