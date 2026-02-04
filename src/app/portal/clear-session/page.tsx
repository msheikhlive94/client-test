'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function ClearSessionPage() {
  const router = useRouter()

  useEffect(() => {
    const clearSession = async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      
      // Wait a moment for cookies to clear
      setTimeout(() => {
        router.push('/portal/login')
      }, 500)
    }

    clearSession()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Clearing session...</p>
        </CardContent>
      </Card>
    </div>
  )
}
