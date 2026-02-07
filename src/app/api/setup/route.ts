import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Service-role client without strict DB typing (setup needs access to tables not in the generated types) */
function createSetupClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Convert a string to a URL-friendly slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'workspace'
}

/**
 * GET /api/setup — Check if initial setup has been completed
 * Returns { setupRequired: boolean }
 */
export async function GET() {
  try {
    const supabase = createSetupClient()

    // Check if any admin user exists
    const { count, error } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      // If table doesn't exist (migrations not run), setup is required
      if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('Admin users table not found, setup required')
        return NextResponse.json({ setupRequired: true })
      }
      
      console.error('Setup status check error:', error)
      return NextResponse.json(
        { error: 'Failed to check setup status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      setupRequired: (count ?? 0) === 0,
    })
  } catch (err) {
    console.error('Setup status error:', err)
    // On any unexpected error, assume setup is required
    return NextResponse.json({ setupRequired: true })
  }
}

/**
 * POST /api/setup — Complete initial setup
 * Body: { email, password, companyName, logoUrl?, project?: { name, description } }
 *
 * This endpoint:
 * 1. Verifies no admin users exist (prevents re-running)
 * 2. Creates the Supabase Auth user
 * 3. Inserts into admin_users table
 * 4. Creates a workspace + workspace_member (owner)
 * 5. Creates workspace_settings row
 * 6. Optionally creates the first project (with workspace_id)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, companyName, logoUrl, project } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createSetupClient()

    // 1. Verify no admin users exist (setup should only run once)
    const { count, error: countError } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Admin count error:', countError)
      return NextResponse.json(
        { error: 'Failed to verify setup status' },
        { status: 500 }
      )
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Setup has already been completed' },
        { status: 409 }
      )
    }

    // 2. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for first admin
      })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create admin account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // 3. Create workspace
    const workspaceName = companyName || 'My Workspace'
    const workspaceSlug = slugify(workspaceName)
    let workspaceId: string | null = null

    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: workspaceSlug,
          owner_id: authData.user.id,
          logo_url: logoUrl || null,
          settings: {},
        })
        .select('id')
        .single()

      if (workspaceError) {
        console.error('Workspace creation error:', workspaceError)
        // Non-fatal if workspace table doesn't exist yet (migration not applied)
      } else {
        workspaceId = workspace.id
      }
    } catch (wsErr) {
      console.error('Workspace creation exception:', wsErr)
    }

    // 4. Create workspace member (owner)
    if (workspaceId) {
      try {
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: authData.user.id,
            role: 'owner',
          })

        if (memberError) {
          console.error('Workspace member creation error:', memberError)
        }
      } catch (memberErr) {
        console.error('Workspace member creation exception:', memberErr)
      }
    }

    // 5. Insert into admin_users (with workspace_id if available)
    const adminInsert: Record<string, unknown> = { email: authData.user.email }
    if (workspaceId) adminInsert.workspace_id = workspaceId

    const { error: adminError } = await supabase
      .from('admin_users')
      .insert(adminInsert)

    if (adminError) {
      console.error('Admin user insert error:', adminError)
      // Attempt to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to grant admin privileges' },
        { status: 500 }
      )
    }

    // 6. Create workspace settings (with workspace_id)
    const settingsInsert: Record<string, unknown> = {
      company_name: companyName || '',
      logo_url: logoUrl || null,
      setup_completed_at: new Date().toISOString(),
    }
    if (workspaceId) settingsInsert.workspace_id = workspaceId

    const { error: settingsError } = await supabase
      .from('workspace_settings')
      .insert(settingsInsert)

    if (settingsError) {
      console.error('Workspace settings error:', settingsError)
      // Non-fatal — setup is still usable without this
    }

    // 7. Optionally create first project (with workspace_id)
    let projectId: string | null = null
    if (project?.name) {
      const projectInsert: Record<string, unknown> = {
        name: project.name,
        description: project.description || null,
        status: 'active',
        project_type: 'other',
        budget_type: 'hourly',
      }
      if (workspaceId) projectInsert.workspace_id = workspaceId

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert(projectInsert)
        .select('id')
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
        // Non-fatal
      } else {
        projectId = projectData?.id ?? null
      }
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      workspaceId,
      projectId,
    })
  } catch (err) {
    console.error('Setup error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
