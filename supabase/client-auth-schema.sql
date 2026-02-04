-- Client Users table - links Supabase Auth users to clients
CREATE TABLE client_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'viewer', -- viewer, admin
    invited_by TEXT, -- email of who invited them
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);

-- Client Invitations table - pending invitations
CREATE TABLE client_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'viewer',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_client_users_user_id ON client_users(user_id);
CREATE INDEX idx_client_users_client_id ON client_users(client_id);
CREATE INDEX idx_client_invitations_token ON client_invitations(token);
CREATE INDEX idx_client_invitations_email ON client_invitations(email);

-- RLS Policies for client portal access
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Admin access (for main app - using service role or anon with full access)
CREATE POLICY "Allow all for client_users" ON client_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for client_invitations" ON client_invitations FOR ALL USING (true) WITH CHECK (true);

-- Function to get client_ids for a user
CREATE OR REPLACE FUNCTION get_user_client_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY SELECT client_id FROM client_users WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update projects RLS to allow client users to view their projects
DROP POLICY IF EXISTS "Allow all for projects" ON projects;
CREATE POLICY "Full access for service role" ON projects FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Update tasks RLS
DROP POLICY IF EXISTS "Allow all for tasks" ON tasks;
CREATE POLICY "Full access for tasks" ON tasks FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Update time_entries RLS
DROP POLICY IF EXISTS "Allow all for time_entries" ON time_entries;
CREATE POLICY "Full access for time_entries" ON time_entries FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Update notes RLS  
DROP POLICY IF EXISTS "Allow all for notes" ON notes;
CREATE POLICY "Full access for notes" ON notes FOR ALL 
    USING (true) 
    WITH CHECK (true);
