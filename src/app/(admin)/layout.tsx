'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar, MobileHeader } from '@/components/layout/sidebar'
import { WorkspaceProvider } from '@/lib/contexts/workspace-context'
import { Loader2 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()

      // Check if setup has been completed (any admin exists)
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })

      if (count === 0) {
        router.replace('/setup')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', user.email)
        .single()

      if (!adminUser) {
        // Not an admin - redirect to login
        await supabase.auth.signOut()
        router.replace('/login?error=unauthorized')
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page-bg">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <WorkspaceProvider>
      <div className="flex flex-col h-screen lg:flex-row">
        <MobileHeader />
        <Sidebar />
        <main className="flex-1 overflow-auto bg-surface">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  )
}
