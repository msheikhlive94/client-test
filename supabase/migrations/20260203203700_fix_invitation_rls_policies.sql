-- Fix RLS policies for invitation acceptance flow
-- Issue: Authenticated users couldn't read invitations by token after signing up
-- This caused PGRST116 error (0 rows returned) during invitation acceptance

-- Allow authenticated users to read invitations by token
-- Previously only anon users could read, blocking post-signup invitation acceptance
CREATE POLICY IF NOT EXISTS "Authenticated can read invitations by token"
ON client_invitations
FOR SELECT
TO authenticated
USING (expires_at > now());

-- Explicit policy for users to create their own client_users record
-- Makes invitation acceptance work for new signups
CREATE POLICY IF NOT EXISTS "Users can create their own access during invitation"
ON client_users
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
