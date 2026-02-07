import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/** Anon client for checking setup status and auth operations */
function createSetupClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Admin client for database operations during setup (bypasses RLS) */
function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { 
      auth: { 
        autoRefreshToken: false, 
        persistSession: false 
      } 
    }
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
    // Check if Supabase credentials are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // No credentials configured yet, setup is definitely required
      console.log('No Supabase credentials configured, setup required')
      return NextResponse.json({ setupRequired: true })
    }

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

    // Use anon client for auth operations
    const anonClient = createSetupClient()
    
    // Use admin client for database operations (bypasses RLS)
    const adminClient = createAdminClient()

    // 1. Verify no admin users exist (setup should only run once)
    const { count, error: countError } = await adminClient
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

    // 2. Create auth user using signUp (works with anon key)
    const { data: authData, error: authError } =
      await anonClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
          },
        },
      })

    if (authError) {
      console.error('Auth user creation error:', authError)
      
      // Check if email confirmation is required
      if (authError.message?.includes('confirm') || authError.message?.includes('verification')) {
        return NextResponse.json(
          { 
            error: 'Email confirmation is required. Please disable "Confirm email" in your Supabase project settings (Authentication → Providers → Email) and try again.' 
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: authError.message || 'Failed to create admin account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user. Make sure email confirmation is disabled in Supabase.' },
        { status: 500 }
      )
    }

    // 3. Create workspace (using admin client to bypass RLS)
    const workspaceName = companyName || 'My Workspace'
    const workspaceSlug = slugify(workspaceName)
    let workspaceId: string | null = null

    try {
      const { data: workspace, error: workspaceError } = await adminClient
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

    // 4. Create workspace member (owner) (using admin client)
    if (workspaceId) {
      try {
        const { error: memberError } = await adminClient
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

    // 5. Insert into admin_users (with workspace_id if available) (using admin client)
    const adminInsert: Record<string, unknown> = { email: authData.user.email }
    if (workspaceId) adminInsert.workspace_id = workspaceId

    const { error: adminError } = await adminClient
      .from('admin_users')
      .insert(adminInsert)

    if (adminError) {
      console.error('Admin user insert error:', adminError)
      // Attempt to clean up the auth user (using admin client for auth.admin)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to grant admin privileges' },
        { status: 500 }
      )
    }

    // 6. Create workspace settings (with workspace_id) (using admin client)
    const settingsInsert: Record<string, unknown> = {
      company_name: companyName || '',
      logo_url: logoUrl || null,
      setup_completed_at: new Date().toISOString(),
    }
    if (workspaceId) settingsInsert.workspace_id = workspaceId

    const { error: settingsError } = await adminClient
      .from('workspace_settings')
      .insert(settingsInsert)

    if (settingsError) {
      console.error('Workspace settings error:', settingsError)
      // Non-fatal — setup is still usable without this
    }

    // 7. Optionally create first project (with workspace_id) (using admin client)
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

      const { data: projectData, error: projectError } = await adminClient
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
