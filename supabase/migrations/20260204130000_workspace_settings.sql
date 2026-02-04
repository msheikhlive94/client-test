-- Workspace settings table for setup wizard / white-label configuration
CREATE TABLE IF NOT EXISTS workspace_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT '',
  logo_url text,
  setup_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only allow one row (singleton pattern)
CREATE UNIQUE INDEX workspace_settings_singleton ON workspace_settings ((true));

-- RLS
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for setup status check before auth)
CREATE POLICY "Anyone can read workspace_settings"
  ON workspace_settings FOR SELECT
  USING (true);

-- Only authenticated admin users can update
CREATE POLICY "Admins can update workspace_settings"
  ON workspace_settings FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Insert is handled by service role during setup (bypasses RLS)
-- No insert policy needed for regular users

COMMENT ON TABLE workspace_settings IS 'Singleton table for workspace configuration. Created during first-time setup.';
