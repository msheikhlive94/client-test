import { createBrowserClient } from '@supabase/ssr'

// Using 'any' for the database type to avoid strict typing issues
// The actual types are handled at the application level
export function createClient() {
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
