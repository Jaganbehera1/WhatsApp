-- FINAL FIX - Run this and check the output carefully
-- This will show you EXACTLY what's wrong

-- ============================================
-- STEP 1: See what policies exist NOW
-- ============================================
SELECT 'BEFORE FIX - Current Policies:' as info;
SELECT 
    policyname,
    cmd,
    roles,
    permissive,  -- CRITICAL: Must be PERMISSIVE, not RESTRICTIVE
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chats';

-- ============================================
-- STEP 2: Complete nuclear reset
-- ============================================
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop every single policy
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

-- ============================================
-- STEP 3: Re-enable and create SIMPLEST policy
-- ============================================
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policy - note: AS PERMISSIVE is the default, but being explicit
CREATE POLICY "chats_allow_insert" ON public.chats
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- STEP 4: Verify what was created
-- ============================================
SELECT 'AFTER FIX - New Policy:' as info;
SELECT 
    policyname,
    cmd,
    roles,
    permissive,  -- CHECK THIS: Should be 'PERMISSIVE'
    qual,
    with_check   -- CHECK THIS: Should be 'true'
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- ============================================
-- STEP 5: If permissive shows RESTRICTIVE or NULL, that's the problem!
-- ============================================
-- In that case, try this alternative approach:

-- DROP POLICY IF EXISTS "chats_allow_insert" ON public.chats;
-- 
-- -- Alternative: Use a function-based policy
-- CREATE OR REPLACE FUNCTION public.allow_chat_insert()
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   RETURN auth.uid() IS NOT NULL;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- 
-- CREATE POLICY "chats_allow_insert_v2" ON public.chats
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (public.allow_chat_insert());

