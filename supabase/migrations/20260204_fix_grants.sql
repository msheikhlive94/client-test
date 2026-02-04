-- ============================================================
-- Fix table grants for authenticated and anon roles
-- Supabase requires explicit GRANT on tables created via SQL Editor
-- ============================================================

-- Grant authenticated role access to all tables
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

-- Grant anon role limited access (for public routes: intake forms, invitations)
GRANT SELECT ON intake_links TO anon;
GRANT UPDATE ON intake_links TO anon;
GRANT INSERT ON leads TO anon;
GRANT SELECT ON client_invitations TO anon;
GRANT SELECT ON workspaces TO anon;
GRANT SELECT ON workspace_settings TO anon;

-- Grant service_role full access (already has by default, but be explicit)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant access to sequences (needed for inserts with auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant access to the project_stats view
GRANT SELECT ON project_stats TO authenticated;
