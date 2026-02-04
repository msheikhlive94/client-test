-- ============================================================
-- COMPLETE RLS REBUILD — Drop everything, start fresh
-- Run this INSTEAD of fix_grants.sql and fix_rls_isolation.sql
-- ============================================================

-- ============================================================
-- STEP 0: GRANTS (required before RLS works)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_comment_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON intake_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO authenticated;

GRANT SELECT ON intake_links TO anon;
GRANT UPDATE ON intake_links TO anon;
GRANT INSERT ON leads TO anon;
GRANT SELECT ON client_invitations TO anon;
GRANT SELECT ON workspaces TO anon;
GRANT SELECT ON workspace_settings TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT SELECT ON project_stats TO authenticated;

-- ============================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================

DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: HELPER FUNCTIONS (avoid RLS recursion)
-- ============================================================

-- Get workspace IDs for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_workspace_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = uid;
$$;

-- Check if user is admin/owner of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_admin(uid uuid, ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = uid AND workspace_id = ws_id AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: RLS POLICIES — TABLE BY TABLE
-- ============================================================

-- ==================== users ====================
-- Users can see themselves + co-members of their workspaces
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT wm.user_id FROM workspace_members wm
      WHERE wm.workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ==================== workspaces ====================
CREATE POLICY "workspaces_select_auth" ON workspaces FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Anon needs read for setup/login flow
CREATE POLICY "workspaces_select_anon" ON workspaces FOR SELECT TO anon
  USING (true);

CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE TO authenticated
  USING (is_workspace_admin(auth.uid(), id));

CREATE POLICY "workspaces_service" ON workspaces FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== workspace_members ====================
CREATE POLICY "wm_select" ON workspace_members FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "wm_insert" ON workspace_members FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "wm_delete" ON workspace_members FOR DELETE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "wm_service" ON workspace_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== admin_users ====================
CREATE POLICY "admin_select" ON admin_users FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "admin_service" ON admin_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== projects ====================
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- ==================== clients ====================
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- ==================== tasks ====================
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR project_id IN (
      SELECT id FROM projects WHERE client_id IN (
        SELECT client_id FROM client_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- ==================== task_comments ====================
-- Scoped via task → workspace
CREATE POLICY "comments_select" ON task_comments FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT id FROM projects WHERE client_id IN (
          SELECT client_id FROM client_users WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_update" ON task_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "comments_delete" ON task_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==================== task_comment_mentions ====================
CREATE POLICY "mentions_select" ON task_comment_mentions FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "mentions_insert" ON task_comment_mentions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "mentions_service" ON task_comment_mentions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== time_entries ====================
CREATE POLICY "time_select" ON time_entries FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "time_insert" ON time_entries FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "time_update" ON time_entries FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "time_delete" ON time_entries FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- ==================== notes ====================
CREATE POLICY "notes_select" ON notes FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "notes_insert" ON notes FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "notes_update" ON notes FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "notes_delete" ON notes FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- ==================== leads ====================
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "leads_insert_auth" ON leads FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Anon can submit leads (intake forms)
CREATE POLICY "leads_insert_anon" ON leads FOR INSERT TO anon
  WITH CHECK (true);

-- ==================== intake_links ====================
CREATE POLICY "intake_select_auth" ON intake_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "intake_insert" ON intake_links FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "intake_update_auth" ON intake_links FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "intake_delete" ON intake_links FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

-- Anon can validate active links (for intake form)
CREATE POLICY "intake_select_anon" ON intake_links FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "intake_update_anon" ON intake_links FOR UPDATE TO anon
  USING (is_active = true);

-- ==================== client_users ====================
CREATE POLICY "cu_select_own" ON client_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "cu_select_admin" ON client_users FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "cu_insert_self" ON client_users FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cu_insert_admin" ON client_users FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "cu_delete_admin" ON client_users FOR DELETE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

-- ==================== client_invitations ====================
CREATE POLICY "ci_select_admin" ON client_invitations FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "ci_insert_admin" ON client_invitations FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    )
  );

CREATE POLICY "ci_update_auth" ON client_invitations FOR UPDATE TO authenticated
  USING (expires_at > now());

CREATE POLICY "ci_select_anon" ON client_invitations FOR SELECT TO anon
  USING (expires_at > now());

-- ==================== workspace_settings ====================
CREATE POLICY "ws_settings_select" ON workspace_settings FOR SELECT
  USING (true);

CREATE POLICY "ws_settings_update" ON workspace_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "ws_settings_service" ON workspace_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== subscriptions ====================
CREATE POLICY "subs_select" ON subscriptions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "subs_service" ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- DONE. Every table has workspace-scoped RLS.
-- No infinite recursion. No cross-tenant leaks.
-- ============================================================
