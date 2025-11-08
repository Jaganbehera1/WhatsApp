-- DEFINITIVE FIX - This MUST work
-- The SQL Editor "not authenticated" is normal - frontend requests ARE authenticated

-- Step 1: Completely reset
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop all policies
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
    END LOOP;
END $$;

-- Step 2: Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Step 3: Create PERMISSIVE INSERT policy (explicitly permissive)
-- This is the key - PERMISSIVE allows, RESTRICTIVE denies
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert" ON public.chats
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 4: Verify it was created correctly
SELECT 
    policyname,
    cmd,
    roles,
    permissive,  -- Should show 'PERMISSIVE'
    with_check
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'INSERT';

-- If the above shows the policy exists with PERMISSIVE and WITH CHECK = 'true'
-- Then the policy is correct and should work for authenticated frontend requests

