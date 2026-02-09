-- ============================================================
-- ProjoFlow Self-Hosted — Complete Consolidated Schema
-- ============================================================
--
-- This is the SINGLE migration file that creates the entire
-- ProjoFlow database schema from scratch. It consolidates the
-- base schema.sql and all 12 incremental migration files into
-- one atomic, idempotent SQL file.
--
-- The setup wizard runs ONLY this file instead of 13 separate ones.
--
-- IDEMPOTENCY: This file is safe to run multiple times.
--   - Enums use DO/EXCEPTION blocks
--   - Tables use IF NOT EXISTS
--   - Indexes use IF NOT EXISTS
--   - Functions use CREATE OR REPLACE
--   - Triggers use DROP IF EXISTS + CREATE
--   - Policies are dropped en masse then recreated
--   - Realtime uses DO/EXCEPTION blocks
--
-- ============================================================


-- ============================================================
-- 1. ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft', 'active', 'on_hold', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('automation', 'internal_system', 'mvp', 'ai_agent', 'consulting', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE budget_type AS ENUM ('fixed', 'hourly', 'retainer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE note_type AS ENUM ('general', 'meeting', 'technical', 'decision');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE budget_range AS ENUM ('under_5k', '5k_10k', '10k_25k', '25k_50k', '50k_plus', 'not_sure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_timeline AS ENUM ('asap', '1_month', '2_3_months', '3_6_months', 'flexible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comment_author_type AS ENUM ('admin', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE client_user_role AS ENUM ('viewer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 2. CORE TABLES (in dependency order)
-- ============================================================

-- Users (synced from auth.users for FK references)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,  -- matches auth.users.id
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Admin users (email-based access control)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  workspace_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role workspace_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  company text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status project_status DEFAULT 'draft',
  project_type project_type DEFAULT 'other',
  budget_type budget_type DEFAULT 'hourly',
  budget_amount numeric,
  hourly_rate numeric,
  estimated_hours numeric,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  estimated_hours numeric,
  due_date date,
  position integer DEFAULT 0,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  author_type comment_author_type DEFAULT 'admin',
  author_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Comment Mentions
CREATE TABLE IF NOT EXISTS task_comment_mentions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mentioned_user_id uuid,
  mentioned_email text NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  description text,
  duration_minutes integer NOT NULL,
  date date DEFAULT CURRENT_DATE,
  billable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  note_type note_type DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  project_description text,
  project_type project_type DEFAULT 'other',
  budget_range budget_range,
  timeline project_timeline,
  source text,
  referral text,
  status lead_status DEFAULT 'new',
  notes text,
  converted_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  converted_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  intake_token text,
  token_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Intake Links
CREATE TABLE IF NOT EXISTS intake_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  label text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Client Users (portal access)
CREATE TABLE IF NOT EXISTS client_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role client_user_role DEFAULT 'viewer',
  invited_by uuid,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Client Invitations
CREATE TABLE IF NOT EXISTS client_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  role client_user_role DEFAULT 'viewer',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Workspace Settings
CREATE TABLE IF NOT EXISTS workspace_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  logo_url text,
  theme_config jsonb DEFAULT NULL,
  setup_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Licenses
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text UNIQUE NOT NULL,
  purchase_email text NOT NULL,
  purchase_platform text NOT NULL,
  purchase_id text,
  product_name text DEFAULT 'ProjoFlow Self-Hosted',
  status text DEFAULT 'active',
  max_activations integer DEFAULT 999,
  activation_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- From schema.sql
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_comment_id ON task_comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_task_id ON task_comment_mentions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_mentioned_user_id ON task_comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_intake_token ON leads(intake_token);
CREATE INDEX IF NOT EXISTS idx_intake_links_token ON intake_links(token);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_client_id ON client_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);

-- From multi_tenant.sql
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace ON clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_workspace ON time_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_intake_links_workspace ON intake_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_workspace ON admin_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- From subscriptions.sql
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- From licenses.sql
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_purchase_email ON licenses(purchase_email);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);


-- ============================================================
-- 4. VIEW: project_stats
-- ============================================================

CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id,
  p.name,
  p.status,
  p.budget_amount,
  p.hourly_rate,
  p.estimated_hours,
  COALESCE(SUM(te.duration_minutes), 0) AS total_minutes,
  ROUND(COALESCE(SUM(te.duration_minutes), 0) / 60.0, 2) AS total_hours,
  ROUND(
    COALESCE(SUM(CASE WHEN te.billable THEN te.duration_minutes ELSE 0 END), 0) / 60.0
    * COALESCE(p.hourly_rate, 0),
    2
  ) AS billable_amount,
  COALESCE(COUNT(t.id) FILTER (WHERE t.status IN ('todo', 'in_progress', 'review')), 0) AS open_tasks,
  COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'done'), 0) AS completed_tasks
FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name, p.status, p.budget_amount, p.hourly_rate, p.estimated_hours;


-- ============================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================

-- ---- Auto-sync auth.users -> public.users ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- update_updated_at trigger function ----
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---- set_updated_at triggers for all tables with updated_at ----
DROP TRIGGER IF EXISTS set_updated_at ON clients;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON projects;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON task_comments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON time_entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON notes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON leads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON workspace_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON workspaces;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- Security definer helper functions (avoid RLS recursion) ----

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

-- ---- License functions ----

CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'PJ-';
  part text;
  i integer;
BEGIN
  FOR part_num IN 1..3 LOOP
    part := '';
    FOR i IN 1..6 LOOP
      part := part || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    result := result || part;
    IF part_num < 3 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION increment_license_activation(p_license_key text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_activations integer;
  v_current_count integer;
BEGIN
  SELECT max_activations, activation_count
  INTO v_max_activations, v_current_count
  FROM licenses
  WHERE license_key = p_license_key
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_current_count >= v_max_activations THEN
    RETURN FALSE;
  END IF;

  UPDATE licenses
  SET activation_count = activation_count + 1
  WHERE license_key = p_license_key;

  RETURN TRUE;
END;
$$;


-- ============================================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. DROP ALL EXISTING POLICIES (clean slate)
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
-- 8. RLS POLICIES
-- ============================================================

-- ==================== users ====================
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

CREATE POLICY "workspaces_select_anon" ON workspaces FOR SELECT TO anon
  USING (false);

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

CREATE POLICY "ws_settings_insert" ON workspace_settings FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "ws_settings_update" ON workspace_settings FOR UPDATE TO authenticated
  USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND workspace_id = workspace_settings.workspace_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "ws_settings_service" ON workspace_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== subscriptions ====================
CREATE POLICY "subs_select" ON subscriptions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids(auth.uid())));

CREATE POLICY "subs_service" ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== licenses ====================
CREATE POLICY "licenses_select_active" ON licenses FOR SELECT
  USING (status = 'active');


-- ============================================================
-- 9. GRANTS
-- ============================================================

-- Authenticated role
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

-- Anonymous role (limited)
GRANT SELECT ON intake_links TO anon;
GRANT UPDATE ON intake_links TO anon;
GRANT INSERT ON leads TO anon;
GRANT SELECT ON client_invitations TO anon;
GRANT SELECT ON workspaces TO anon;
GRANT SELECT ON workspace_settings TO anon;

-- Licenses
GRANT SELECT ON licenses TO anon;
GRANT SELECT ON licenses TO authenticated;

-- Service role (full access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- View
GRANT SELECT ON project_stats TO authenticated;

-- License function grants
GRANT EXECUTE ON FUNCTION generate_license_key() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_license_activation(text) TO anon, authenticated, service_role;


-- ============================================================
-- 10. REALTIME
-- ============================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
EXCEPTION WHEN OTHERS THEN
  -- Table may already be a member of the publication
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================
-- DONE. ProjoFlow database is ready.
-- The setup wizard will create the initial workspace and admin.
-- ============================================================


-- ============================================================
-- 11. STORAGE BUCKETS
-- ============================================================

-- Create storage buckets for file uploads
-- Note: This uses Supabase's storage schema

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('brand-assets', 'brand-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('task-attachments', 'task-attachments', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for brand-assets (public bucket)
CREATE POLICY "brand_assets_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

CREATE POLICY "brand_assets_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "brand_assets_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets');

CREATE POLICY "brand_assets_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets');

-- Storage policies for task-attachments (private bucket)
CREATE POLICY "task_attachments_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');

-- Service role full access to storage
CREATE POLICY "storage_service_role" ON storage.objects FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- 12. TASK ATTACHMENTS TABLE
-- ============================================================

-- Table for task and comment file attachments
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

-- Indexes for task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_comment_id ON task_attachments(comment_id);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
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
