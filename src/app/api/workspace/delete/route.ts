import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/workspace/delete
 * 
 * Deletes the current user's workspace and ALL associated data.
 * This is a destructive operation that cannot be undone.
 * 
 * Body: { confirmText: "DELETE" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { confirmText } = body

    // Require explicit confirmation
    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm' },
        { status: 400 }
      )
    }

    // Get current user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get service role client for deletion (bypasses RLS)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get user's workspace(s)
    const { data: workspaces, error: wsError } = await adminClient
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)

    if (wsError) {
      console.error('Error fetching workspaces:', wsError)
      return NextResponse.json(
        { error: 'Failed to fetch workspace data' },
        { status: 500 }
      )
    }

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json(
        { error: 'No workspace found for user' },
        { status: 404 }
      )
    }

    // Only owners can delete
    const ownerWorkspace = workspaces.find(w => w.role === 'owner')
    if (!ownerWorkspace) {
      return NextResponse.json(
        { error: 'Only workspace owners can delete the organization' },
        { status: 403 }
      )
    }

    const workspaceId = ownerWorkspace.workspace_id
    console.log(`Deleting workspace ${workspaceId} and all associated data...`)

    // Delete in order (respecting foreign key constraints)
    const deletionOrder = [
      // Comments and mentions first
      { table: 'task_comment_mentions', column: 'comment_id', subquery: true },
      { table: 'task_comments', column: 'task_id', subquery: true },
      // Time entries
      { table: 'time_entries', column: 'workspace_id' },
      // Tasks
      { table: 'tasks', column: 'workspace_id' },
      // Projects
      { table: 'projects', column: 'workspace_id' },
      // Client invitations and users
      { table: 'client_invitations', column: 'workspace_id' },
      { table: 'client_users', column: 'client_id', subquery: true },
      // Clients
      { table: 'clients', column: 'workspace_id' },
      // Notes
      { table: 'notes', column: 'workspace_id' },
      // Leads and intake links
      { table: 'intake_links', column: 'workspace_id' },
      { table: 'leads', column: 'workspace_id' },
      // Workspace settings
      { table: 'workspace_settings', column: 'workspace_id' },
      // Subscriptions
      { table: 'subscriptions', column: 'workspace_id' },
      // Admin users
      { table: 'admin_users', column: 'workspace_id' },
      // Workspace members
      { table: 'workspace_members', column: 'workspace_id' },
      // Finally, the workspace itself
      { table: 'workspaces', column: 'id' },
    ]

    const results: { table: string; status: 'deleted' | 'skipped' | 'error'; error?: string }[] = []

    for (const item of deletionOrder) {
      try {
        let query

        if (item.subquery) {
          // For tables that reference other workspace tables
          if (item.table === 'task_comment_mentions') {
            // Get all comment IDs for this workspace's tasks
            const { data: comments } = await adminClient
              .from('task_comments')
              .select('id, tasks!inner(workspace_id)')
              .eq('tasks.workspace_id', workspaceId)
            
            if (comments && comments.length > 0) {
              const commentIds = comments.map(c => c.id)
              await adminClient.from('task_comment_mentions').delete().in('comment_id', commentIds)
            }
            results.push({ table: item.table, status: 'deleted' })
            continue
          }
          
          if (item.table === 'task_comments') {
            const { data: tasks } = await adminClient
              .from('tasks')
              .select('id')
              .eq('workspace_id', workspaceId)
            
            if (tasks && tasks.length > 0) {
              const taskIds = tasks.map(t => t.id)
              await adminClient.from('task_comments').delete().in('task_id', taskIds)
            }
            results.push({ table: item.table, status: 'deleted' })
            continue
          }

          if (item.table === 'client_users') {
            const { data: clients } = await adminClient
              .from('clients')
              .select('id')
              .eq('workspace_id', workspaceId)
            
            if (clients && clients.length > 0) {
              const clientIds = clients.map(c => c.id)
              await adminClient.from('client_users').delete().in('client_id', clientIds)
            }
            results.push({ table: item.table, status: 'deleted' })
            continue
          }
        }

        // Standard deletion by workspace_id or id
        if (item.column === 'id') {
          query = adminClient.from(item.table).delete().eq('id', workspaceId)
        } else {
          query = adminClient.from(item.table).delete().eq(item.column, workspaceId)
        }

        const { error: deleteError } = await query

        if (deleteError) {
          console.error(`Error deleting from ${item.table}:`, deleteError)
          results.push({ table: item.table, status: 'error', error: deleteError.message })
        } else {
          results.push({ table: item.table, status: 'deleted' })
        }
      } catch (err: any) {
        console.error(`Exception deleting from ${item.table}:`, err)
        results.push({ table: item.table, status: 'error', error: err.message })
      }
    }

    // Delete storage files
    try {
      // Delete brand assets
      const { data: brandFiles } = await adminClient.storage
        .from('brand-assets')
        .list(workspaceId)
      
      if (brandFiles && brandFiles.length > 0) {
        const paths = brandFiles.map(f => `${workspaceId}/${f.name}`)
        await adminClient.storage.from('brand-assets').remove(paths)
      }

      // Delete task attachments
      const { data: attachmentFiles } = await adminClient.storage
        .from('task-attachments')
        .list(workspaceId)
      
      if (attachmentFiles && attachmentFiles.length > 0) {
        const paths = attachmentFiles.map(f => `${workspaceId}/${f.name}`)
        await adminClient.storage.from('task-attachments').remove(paths)
      }

      results.push({ table: 'storage', status: 'deleted' })
    } catch (storageErr: any) {
      console.error('Error deleting storage:', storageErr)
      results.push({ table: 'storage', status: 'error', error: storageErr.message })
    }

    // Sign out the user
    await supabase.auth.signOut()

    // Delete the auth user (optional - comment out if you want to keep auth accounts)
    try {
      await adminClient.auth.admin.deleteUser(user.id)
      results.push({ table: 'auth_user', status: 'deleted' })
    } catch (authDeleteErr: any) {
      console.error('Error deleting auth user:', authDeleteErr)
      results.push({ table: 'auth_user', status: 'error', error: authDeleteErr.message })
    }

    const hasErrors = results.some(r => r.status === 'error')

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Organization deleted with some errors' 
        : 'Organization and all data deleted successfully',
      results,
    })
  } catch (error: any) {
    console.error('Delete workspace error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete organization' },
      { status: 500 }
    )
  }
}
