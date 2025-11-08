-- Verify and Fix Chats RLS - Run this to see what's actually blocking

-- Step 1: Check current RLS status
SELECT 
    'RLS Status:' as check_type,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'chats';

-- Step 2: List ALL existing policies
SELECT 
    'Current Policies:' as check_type,
    policyname,
    cmd as "Command",
    roles,
    permissive,
    qual as "Using",
    with_check as "With Check"
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- Step 3: If RLS is enabled but no INSERT policy exists, or if policies are wrong:
-- Disable RLS temporarily
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chats'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats', pol.policyname);
        RAISE NOTICE 'Dropped: %', pol.policyname;
    END LOOP;
END $$;

-- Step 5: Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Step 6: Create a simple, permissive INSERT policy
-- This MUST work for authenticated users
CREATE POLICY "chats_allow_insert" ON public.chats
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 7: Verify the new policy
SELECT 
    'New Policy:' as check_type,
    policyname,
    cmd,
    roles,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- The policy should show:
-- - policyname: chats_allow_insert
-- - cmd: INSERT
-- - roles: {authenticated}
-- - permissive: PERMISSIVE
-- - with_check: true

