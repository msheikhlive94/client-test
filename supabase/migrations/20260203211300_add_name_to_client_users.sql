-- Add name column to client_users table
-- This allows storing the client user's full name for display in comments and UI

ALTER TABLE client_users 
ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN client_users.name IS 'Full name of the client user for display purposes';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
