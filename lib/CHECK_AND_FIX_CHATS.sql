-- CHECK AND FIX - This will show you exactly what's wrong
-- Run this and share the output

-- Step 1: Check RLS status
SELECT 'RLS Status:' as info, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'chats';

-- Step 2: List ALL policies with full details
SELECT 'ALL Policies:' as info;
SELECT 
    policyname,
    cmd,
    roles,
    permissive,  -- CRITICAL: Must be PERMISSIVE
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chats';

-- Step 3: If no INSERT policy exists, or if it's RESTRICTIVE, fix it:
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop all
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chats'
    ) LOOP
        EXECUTE format('DROP POLICY %I ON public.chats', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create with absolute simplest syntax
CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 4: Verify
SELECT 'After Fix - INSERT Policy:' as info;
SELECT 
    policyname,
    cmd,
    roles,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- If you see the policy but it still doesn't work, the issue might be:
-- 1. Supabase caching - wait 30 seconds and try again
-- 2. The policy needs to be RESTRICTIVE (unlikely, but try if PERMISSIVE doesn't work)
-- 3. There's a database-level setting blocking it

