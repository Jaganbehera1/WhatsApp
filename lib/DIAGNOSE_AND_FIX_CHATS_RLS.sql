-- COMPLETE DIAGNOSTIC AND FIX FOR CHATS RLS
-- Run this entire script

-- ============================================
-- STEP 1: Check current state
-- ============================================
SELECT '=== CURRENT STATE ===' as step;

-- Check RLS status
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'chats';

-- List ALL policies (including RESTRICTIVE ones)
SELECT 
    'All Policies' as check_type,
    policyname,
    cmd,
    roles,
    permissive,  -- Should be PERMISSIVE, not RESTRICTIVE
    qual as "Using",
    with_check as "With Check"
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- ============================================
-- STEP 2: Complete reset
-- ============================================
SELECT '=== RESETTING ===' as step;

-- Disable RLS
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (including RESTRICTIVE if any)
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
            RAISE NOTICE 'Error dropping %: %', pol.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Re-enable and create policy
-- ============================================
SELECT '=== CREATING POLICY ===' as step;

-- Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policy with EXPLICIT PERMISSIVE
CREATE POLICY "chats_insert_allow" ON public.chats
  AS PERMISSIVE  -- Explicitly set as PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- STEP 4: Verify
-- ============================================
SELECT '=== VERIFICATION ===' as step;

SELECT 
    policyname,
    cmd,
    roles,
    permissive,  -- Must show 'PERMISSIVE'
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- If permissive shows 'RESTRICTIVE' or NULL, that's the problem!
-- It MUST show 'PERMISSIVE'

-- ============================================
-- STEP 5: Alternative if above doesn't work
-- ============================================
-- If still failing, uncomment and run this:

/*
DROP POLICY IF EXISTS "chats_insert_allow" ON public.chats;

-- Try with USING clause for INSERT (some PostgreSQL versions need this)
CREATE POLICY "chats_insert_final" ON public.chats
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  USING (true)
  WITH CHECK (true);
*/

