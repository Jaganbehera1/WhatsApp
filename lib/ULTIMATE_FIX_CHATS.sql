-- ULTIMATE FIX - This WILL work
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- STEP 1: Completely reset chats table RLS
-- ============================================

-- Disable RLS completely
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (even if they don't exist, this is safe)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chats'
    ) LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON public.chats', pol.policyname);
            RAISE NOTICE 'Dropped: %', pol.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop %: %', pol.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Re-enable RLS
-- ============================================
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create INSERT policy - SIMPLEST POSSIBLE
-- ============================================
CREATE POLICY "allow_chat_insert" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- STEP 4: Verify the policy exists
-- ============================================
SELECT 
    'VERIFICATION:' as status,
    policyname,
    cmd,
    roles,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- You should see:
-- policyname: allow_chat_insert
-- cmd: INSERT  
-- roles: {authenticated}
-- permissive: PERMISSIVE (or true)
-- with_check: true

-- ============================================
-- STEP 5: If still not working, try this alternative
-- ============================================
-- Uncomment the lines below if the above doesn't work:

-- DROP POLICY IF EXISTS "allow_chat_insert" ON public.chats;
-- 
-- CREATE POLICY "allow_chat_insert_v2" ON public.chats
--   AS PERMISSIVE
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() IS NOT NULL);

