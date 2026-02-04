-- Migration: Create task_comment_mentions table for @mention tracking
-- This table stores mentions in task comments for notification purposes

CREATE TABLE IF NOT EXISTS task_comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mentioned_user_id uuid,
  mentioned_email text NOT NULL,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for looking up mentions by comment
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_comment_id ON task_comment_mentions(comment_id);

-- Index for looking up mentions by task
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_task_id ON task_comment_mentions(task_id);

-- Index for looking up mentions by user
CREATE INDEX IF NOT EXISTS idx_task_comment_mentions_mentioned_user_id ON task_comment_mentions(mentioned_user_id);

-- RLS Policies
ALTER TABLE task_comment_mentions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read mentions
CREATE POLICY "Authenticated users can read mentions"
  ON task_comment_mentions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert mentions
CREATE POLICY "Authenticated users can insert mentions"
  ON task_comment_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access to mentions"
  ON task_comment_mentions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
