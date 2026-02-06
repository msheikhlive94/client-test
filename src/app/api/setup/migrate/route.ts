import { NextResponse } from 'next/server'
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

/**
 * Classify a PostgreSQL error into a user-friendly category.
 */
function classifyError(err: any): { type: string; message: string; detail?: string } {
  const msg = (err.message || '').toLowerCase()
  const code = err.code || ''

  if (msg.includes('password authentication failed') || code === '28P01') {
    return {
      type: 'connection_failed',
      message: 'Incorrect database password. Double-check the password you set when creating your Supabase project.',
    }
  }
  if (msg.includes('could not connect') || msg.includes('econnrefused') || msg.includes('getaddrinfo')) {
    return {
      type: 'connection_failed',
      message: 'Could not connect to the database. Check that your Supabase project is running and your NEXT_PUBLIC_SUPABASE_URL is correct.',
    }
  }
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return {
      type: 'connection_failed',
      message: 'Connection timed out. Check your internet connection and Supabase project status.',
    }
  }
  if (msg.includes('permission denied') || code === '42501') {
    return {
      type: 'permission_denied',
      message: 'Permission denied. Make sure you are using the database password, not an API key.',
    }
  }
  if (msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('already been granted') || msg.includes('already a member')) {
    return { type: 'benign', message: 'Already configured (skipped)' }
  }
  return {
    type: 'migration_error',
    message: 'A database error occurred during setup.',
    detail: err.message,
  }
}

/**
 * Build a PostgreSQL connection string from Supabase URL + database password.
 */
function buildConnectionString(supabaseUrl: string, password: string): string {
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
}

/**
 * POST /api/setup/migrate
 *
 * Modes:
 *   - { databasePassword, testOnly: true }  → Test connection without running migrations
 *   - { databasePassword }                  → Run the consolidated migration
 *
 * The password is used only for this operation and is never stored.
 */
export async function POST(request: Request) {
  try {
    const { databasePassword, testOnly } = await request.json()

    if (!databasePassword || typeof databasePassword !== 'string') {
      return NextResponse.json(
        { error: 'Database password is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL not configured' },
        { status: 500 }
      )
    }

    const connectionString = buildConnectionString(supabaseUrl, databasePassword)
    const client = new Client({ connectionString })

    try {
      await client.connect()
    } catch (connError: any) {
      const classified = classifyError(connError)
      return NextResponse.json(
        {
          error: classified.message,
          errorType: classified.type,
          detail: classified.detail,
        },
        { status: 401 }
      )
    }

    // Test-only mode: verify connection and return
    if (testOnly) {
      await client.end()
      return NextResponse.json({ success: true, message: 'Connection successful' })
    }

    // Run the consolidated migration file
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const consolidatedFile = '00_complete_schema.sql'
    const consolidatedPath = path.join(migrationsDir, consolidatedFile)

    // Check if consolidated migration exists, fall back to running all files
    let filesToRun: string[]

    if (fs.existsSync(consolidatedPath)) {
      filesToRun = [consolidatedFile]
    } else {
      // Fallback: run all migration files (backwards compatibility)
      try {
        filesToRun = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
      } catch {
        await client.end()
        return NextResponse.json(
          { error: 'Migration files not found. Ensure supabase/migrations folder exists.' },
          { status: 500 }
        )
      }
    }

    if (filesToRun.length === 0) {
      await client.end()
      return NextResponse.json(
        { error: 'No migration files found in supabase/migrations/' },
        { status: 500 }
      )
    }

    const results: { file: string; success: boolean; error?: string }[] = []

    for (const file of filesToRun) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')

      try {
        await client.query(sql)
        results.push({ file, success: true })
      } catch (err: any) {
        const classified = classifyError(err)
        if (classified.type === 'benign') {
          results.push({ file, success: true, error: classified.message })
        } else {
          results.push({ file, success: false, error: classified.message + (classified.detail ? ` (${classified.detail})` : '') })
        }
      }
    }

    await client.end()

    const failedMigrations = results.filter(r => !r.success)

    if (failedMigrations.length > 0) {
      return NextResponse.json(
        {
          error: `Database setup encountered ${failedMigrations.length} error(s)`,
          errorType: 'migration_error',
          results,
          failedMigrations,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Database configured successfully',
      totalMigrations: results.length,
      results,
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed unexpectedly', errorType: 'unknown' },
      { status: 500 }
    )
  }
}
