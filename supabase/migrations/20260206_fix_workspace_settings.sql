-- ============================================================
-- Fix workspace_settings table for branding persistence
-- Adds missing workspace_id and theme_config columns
-- Replaces singleton constraint with per-workspace uniqueness
-- ============================================================

-- Add workspace_id column (nullable first for backfill)
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Add theme_config JSONB column for storing branding colors
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS theme_config jsonb DEFAULT NULL;

-- Backfill workspace_id from the first workspace if any rows exist
UPDATE workspace_settings
SET workspace_id = (SELECT id FROM workspaces LIMIT 1)
WHERE workspace_id IS NULL;

-- Add foreign key constraint
DO $$ BEGIN
  ALTER TABLE workspace_settings
    ADD CONSTRAINT fk_workspace_settings_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop the singleton constraint (allows one row per workspace)
DROP INDEX IF EXISTS workspace_settings_singleton;

-- Add unique constraint per workspace
CREATE UNIQUE INDEX IF NOT EXISTS workspace_settings_per_workspace
  ON workspace_settings (workspace_id);

-- Update RLS policies for workspace-scoped access
DROP POLICY IF EXISTS "Anyone can read workspace_settings" ON workspace_settings;
DROP POLICY IF EXISTS "Admins can update workspace_settings" ON workspace_settings;
DROP POLICY IF EXISTS "ws_settings_select" ON workspace_settings;
DROP POLICY IF EXISTS "ws_settings_update" ON workspace_settings;
DROP POLICY IF EXISTS "ws_settings_service" ON workspace_settings;

-- Anyone can read settings (needed for setup flow and public branding)
CREATE POLICY "ws_settings_select" ON workspace_settings FOR SELECT
  USING (true);

-- Workspace admins can update their own workspace settings
CREATE POLICY "ws_settings_update" ON workspace_settings FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT get_user_workspace_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid()
      AND workspace_members.workspace_id = workspace_settings.workspace_id
      AND role IN ('owner', 'admin')
    )
  );

-- Service role has full access (for setup wizard)
CREATE POLICY "ws_settings_service" ON workspace_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN workspace_settings.workspace_id IS 'Links settings to a workspace for multi-tenant isolation';
COMMENT ON COLUMN workspace_settings.theme_config IS 'JSONB storing custom branding colors and theme overrides';
