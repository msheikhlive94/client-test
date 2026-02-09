import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/setup/storage
 * 
 * Creates required storage buckets if they don't exist.
 * This is idempotent - safe to call multiple times.
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: { bucket: string; status: 'created' | 'exists' | 'error'; error?: string }[] = []

    // Define required buckets
    const buckets = [
      {
        id: 'brand-assets',
        name: 'brand-assets',
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      },
      {
        id: 'task-attachments',
        name: 'task-attachments',
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: null, // Allow all types
      },
    ]

    for (const bucket of buckets) {
      // Check if bucket exists
      const { data: existingBucket } = await supabase.storage.getBucket(bucket.id)

      if (existingBucket) {
        results.push({ bucket: bucket.id, status: 'exists' })
        continue
      }

      // Create bucket
      const { error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes || undefined,
      })

      if (error) {
        // Check if it's a "already exists" error
        if (error.message?.includes('already exists')) {
          results.push({ bucket: bucket.id, status: 'exists' })
        } else {
          results.push({ bucket: bucket.id, status: 'error', error: error.message })
        }
      } else {
        results.push({ bucket: bucket.id, status: 'created' })
      }
    }

    const hasErrors = results.some(r => r.status === 'error')

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Some buckets failed to create' 
        : 'Storage buckets configured successfully',
      results,
    })
  } catch (error: any) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to setup storage' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/setup/storage
 * 
 * Check status of storage buckets
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const requiredBuckets = ['brand-assets', 'task-attachments']
    const results: { bucket: string; exists: boolean }[] = []

    for (const bucketId of requiredBuckets) {
      const { data } = await supabase.storage.getBucket(bucketId)
      results.push({ bucket: bucketId, exists: !!data })
    }

    const allExist = results.every(r => r.exists)

    return NextResponse.json({
      configured: allExist,
      buckets: results,
    })
  } catch (error: any) {
    console.error('Storage check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check storage' },
      { status: 500 }
    )
  }
}
