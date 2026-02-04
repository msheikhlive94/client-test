'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/lib/hooks/use-client-portal'
import { Zap, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NoAccessPage() {
  const router = useRouter()
  const signOut = useSignOut()

  const handleSignOut = async () => {
    await signOut.mutateAsync()
    router.push('/portal/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="h-8 w-8 text-emerald-500" />
            <span className="text-2xl font-bold text-white">z-flow</span>
          </div>
          <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Access Yet</h2>
          <p className="text-zinc-400 mb-6">
            Your account doesn&apos;t have access to any client projects. If you believe this is a mistake, 
            please contact us or ask for an invitation link.
          </p>
          <div className="space-y-3">
            <a href="mailto:hello@z-flow.de">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                Contact Us
              </Button>
            </a>
            <Button 
              variant="outline" 
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
