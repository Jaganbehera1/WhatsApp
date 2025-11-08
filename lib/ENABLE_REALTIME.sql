-- ENABLE REALTIME FOR MESSAGES TABLE
-- Run this to ensure real-time subscriptions work for messages

-- ============================================
-- Step 1: Enable real-time for messages table
-- ============================================
-- Note: In Supabase, real-time is enabled via the dashboard
-- But we can verify it's enabled by checking publication

-- Check if real-time is enabled (this is usually done in Supabase Dashboard)
-- Go to: Database → Replication → Enable for 'messages' table

-- ============================================
-- Step 2: Verify messages table exists and has correct structure
-- ============================================
SELECT 
    'Messages table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- ============================================
-- Step 3: Grant necessary permissions for real-time
-- ============================================
-- Real-time requires SELECT permission on the table
-- This should already be handled by RLS policies

-- Verify RLS policies allow SELECT
SELECT 
    'Messages SELECT policies:' as info,
    policyname,
    cmd,
    permissive,
    qual as "Using Clause"
FROM pg_policies 
WHERE tablename = 'messages' AND cmd = 'SELECT';

-- ============================================
-- IMPORTANT: Enable Real-time in Supabase Dashboard
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Database → Replication
-- 3. Find the 'messages' table
-- 4. Toggle ON the replication switch
-- 5. Save changes

-- This script only verifies the setup - actual enabling is done in the dashboard

