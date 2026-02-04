'use client'

import { useQuery } from '@tanstack/react-query'

interface SetupStatus {
  setupRequired: boolean
}

/**
 * Check whether the initial setup wizard has been completed.
 * Returns { setupRequired: true } when no admin user exists yet.
 */
export function useSetupStatus() {
  return useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const res = await fetch('/api/setup')
      if (!res.ok) throw new Error('Failed to check setup status')
      return res.json()
    },
    staleTime: 30_000, // Cache for 30 seconds
    retry: 2,
  })
}
