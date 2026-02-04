import type { Metadata } from 'next'
import { appConfig } from '@/lib/config/theme'

export const metadata: Metadata = {
  title: `Setup | ${appConfig.name}`,
  description: `Set up your ${appConfig.name} workspace`,
}

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
