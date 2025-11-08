-- FIX CHATS SELECT RLS POLICY
-- This will allow users to view chats they participate in

-- Step 1: Disable RLS temporarily
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing SELECT policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chats' AND cmd = 'SELECT'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SELECT policy - Users can view chats they participate in
CREATE POLICY "chats_select" ON public.chats
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 5: Verify the policy
SELECT 
    'SELECT Policy Created:' as status,
    policyname,
    cmd,
    permissive,
    qual as "Using Clause"
FROM pg_policies 
WHERE tablename = 'chats' AND cmd = 'SELECT';

