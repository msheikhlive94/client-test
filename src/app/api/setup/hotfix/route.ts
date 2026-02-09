import { NextResponse } from 'next/server'
import { Client } from 'pg'

/**
 * POST /api/setup/hotfix
 * 
 * Applies hotfixes/missing tables to an existing database.
 * This is for users who already ran the initial migration but are missing newer tables.
 * 
 * Body: { databaseHost, databasePassword }
 */
export async function POST(request: Request) {
  try {
    const { databaseHost, databasePassword } = await request.json()

    if (!databaseHost || !databasePassword) {
      return NextResponse.json(
        { error: 'Database host and password are required' },
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

    // Build connection string
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
    const isPooler = databaseHost.includes('pooler.supabase.com')
    const port = isPooler ? '6543' : '5432'
    const cleanHost = databaseHost.split(':')[0]
    const username = isPooler ? `postgres.${projectRef}` : 'postgres'
    const connectionString = `postgresql://${username}:${encodeURIComponent(databasePassword)}@${cleanHost}:${port}/postgres`

    const client = new Client({ 
      connectionString,
      connectionTimeoutMillis: 10000,
    })

    try {
      await client.connect()
    } catch (connError: any) {
      return NextResponse.json(
        { error: `Connection failed: ${connError.message}` },
        { status: 401 }
      )
    }

    const hotfixes: { name: string; sql: string }[] = [
      {
        name: 'task_attachments_table',
        sql: `
          -- Create task_attachments table if it doesn't exist
          CREATE TABLE IF NOT EXISTS task_attachments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            comment_id uuid REFERENCES task_comments(id) ON DELETE CASCADE,
            file_name text NOT NULL,
            file_path text NOT NULL,
            file_size bigint NOT NULL DEFAULT 0,
            mime_type text NOT NULL DEFAULT 'application/octet-stream',
            uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
            created_at timestamptz DEFAULT now()
          );

          -- Indexes
          CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
          CREATE INDEX IF NOT EXISTS idx_task_attachments_comment_id ON task_attachments(comment_id);

          -- Enable RLS
          ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

          -- Drop existing policies if any (to avoid conflicts)
          DROP POLICY IF EXISTS "task_attachments_select" ON task_attachments;
          DROP POLICY IF EXISTS "task_attachments_insert" ON task_attachments;
          DROP POLICY IF EXISTS "task_attachments_delete" ON task_attachments;
          DROP POLICY IF EXISTS "task_attachments_service" ON task_attachments;

          -- RLS Policies
          CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT TO authenticated
            USING (
              task_id IN (
                SELECT t.id FROM tasks t WHERE t.workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
              )
            );

          CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT TO authenticated
            WITH CHECK (
              task_id IN (
                SELECT t.id FROM tasks t WHERE t.workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
              )
            );

          CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE TO authenticated
            USING (
              task_id IN (
                SELECT t.id FROM tasks t WHERE t.workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
              )
            );

          CREATE POLICY "task_attachments_service" ON task_attachments FOR ALL TO service_role
            USING (true) WITH CHECK (true);

          -- Grant permissions
          GRANT ALL ON task_attachments TO authenticated;
          GRANT ALL ON task_attachments TO service_role;
        `,
      },
    ]

    const results: { name: string; status: 'applied' | 'error'; error?: string }[] = []

    for (const hotfix of hotfixes) {
      try {
        await client.query(hotfix.sql)
        results.push({ name: hotfix.name, status: 'applied' })
      } catch (err: any) {
        // Check if it's a "already exists" type error
        if (err.message?.includes('already exists')) {
          results.push({ name: hotfix.name, status: 'applied', error: 'Already exists (skipped)' })
        } else {
          results.push({ name: hotfix.name, status: 'error', error: err.message })
        }
      }
    }

    await client.end()

    const hasErrors = results.some(r => r.status === 'error' && !r.error?.includes('Already exists'))

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Some hotfixes failed' : 'All hotfixes applied successfully',
      results,
    })
  } catch (error: any) {
    console.error('Hotfix error:', error)
    return NextResponse.json(
      { error: error.message || 'Hotfix failed' },
      { status: 500 }
    )
  }
}
