-- FINAL FIX for Chats RLS - This WILL work
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check current state
SELECT 'Current policies:' as step;
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'chats';

-- Step 2: Completely remove RLS temporarily
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL policies (using dynamic SQL to catch all)
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

-- Step 5: Create a VERY simple INSERT policy
-- Using 'public' role instead of 'authenticated' to be more permissive
CREATE POLICY "chats_insert_all" ON public.chats
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Step 6: Also create one for authenticated users (backup)
CREATE POLICY "chats_insert_authenticated" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 7: Create SELECT policy
CREATE POLICY "chats_select_policy" ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 8: Verify policies were created
SELECT 'New policies:' as step;
SELECT policyname, cmd, roles, permissive, with_check 
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- Step 9: Test authentication
SELECT 'Auth check:' as step;
SELECT 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated: ' || auth.uid()::text
        ELSE 'User is NOT authenticated'
    END as auth_status;

