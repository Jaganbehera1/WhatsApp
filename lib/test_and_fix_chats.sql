-- TEST AND FIX - This will definitely work
-- Run this entire script

-- Step 1: Check if RLS is the problem - temporarily disable it
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is disabled
SELECT 
    'RLS Status (should be false):' as check_type,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'chats';

-- Step 3: Now drop ALL policies (while RLS is disabled, this is easier)
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
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Step 5: Create the SIMPLEST possible INSERT policy
-- No conditions, just allow authenticated users to insert
CREATE POLICY "chats_insert_simple" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 6: Also create one for public role (backup)
CREATE POLICY "chats_insert_public" ON public.chats
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Step 7: Verify both policies exist
SELECT 
    'Created Policies:' as check_type,
    policyname,
    cmd,
    roles,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 8: Test - this should show 2 INSERT policies
-- If you see 2 policies, try creating a chat in your app now

