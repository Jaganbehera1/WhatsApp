-- Diagnose Chats RLS Policies
-- Run this first to see what's actually there

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'chats';

-- List ALL policies on chats table
SELECT 
    policyname,
    cmd as "Command",
    roles,
    permissive,
    qual as "Using Expression",
    with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- Check if user is authenticated (run as the logged-in user)
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

