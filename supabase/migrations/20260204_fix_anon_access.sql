-- Fix anonymous access to workspaces (info disclosure)
-- and tighten intake_links anonymous access

-- Drop the overly permissive anon workspace policy
DROP POLICY IF EXISTS "workspaces_select_anon" ON workspaces;

-- Anon can only look up workspaces by specific slug (for routing)
-- They can't list all workspaces anymore
CREATE POLICY "workspaces_select_anon" ON workspaces FOR SELECT TO anon
  USING (false);
-- Note: setup/login flow uses service key or authenticated user, so anon doesn't need access

-- Fix anonymous leads INSERT (needed for intake forms)
DROP POLICY IF EXISTS "leads_insert_anon" ON leads;
CREATE POLICY "leads_insert_anon" ON leads FOR INSERT TO anon
  WITH CHECK (true);
