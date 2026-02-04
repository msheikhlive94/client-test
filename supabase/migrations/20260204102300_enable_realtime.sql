-- Enable Supabase Realtime for tasks and task_comments tables
-- This allows connected clients to receive live updates when data changes

-- Add tables to the supabase_realtime publication
-- This is required for Supabase's postgres_changes realtime feature
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
