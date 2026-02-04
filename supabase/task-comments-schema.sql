-- Task Comments Schema
-- Run this in Supabase SQL Editor after the main schema

-- Task Comments table
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('admin', 'client')),
    author_name TEXT, -- Cached for display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Helper: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if user can access a task (via client_users → clients → projects → tasks)
CREATE OR REPLACE FUNCTION can_access_task(user_uuid UUID, task_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins can access all tasks
    IF is_admin_user(user_uuid) THEN
        RETURN TRUE;
    END IF;

    -- Clients can access tasks in projects belonging to their client
    RETURN EXISTS (
        SELECT 1
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN client_users cu ON p.client_id = cu.client_id
        WHERE t.id = task_uuid
        AND cu.user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: SELECT - users can read comments on tasks they can access
CREATE POLICY "Users can read comments on accessible tasks"
    ON task_comments FOR SELECT
    USING (can_access_task(auth.uid(), task_id));

-- Policy: INSERT - users can add comments to tasks they can access
CREATE POLICY "Users can add comments to accessible tasks"
    ON task_comments FOR INSERT
    WITH CHECK (
        can_access_task(auth.uid(), task_id)
        AND user_id = auth.uid()
    );

-- Policy: UPDATE - users can only edit their own comments
CREATE POLICY "Users can edit their own comments"
    ON task_comments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: DELETE - admins can delete any, users can delete their own
CREATE POLICY "Users can delete comments"
    ON task_comments FOR DELETE
    USING (
        user_id = auth.uid()
        OR is_admin_user(auth.uid())
    );
