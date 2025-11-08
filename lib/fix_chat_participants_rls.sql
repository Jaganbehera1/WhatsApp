-- Fix Chat Participants RLS Policy
-- Run this to fix "violates row-level security policy for table chat_participants"

-- Step 1: Disable RLS temporarily
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND table_name = 'chat_participants'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: Create PERMISSIVE INSERT policy
-- Allow authenticated users to add participants to chats
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_participants;
CREATE POLICY "chat_participants_insert" ON public.chat_participants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 5: Create SELECT policy
-- Users can see participants of chats they're in
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_participants;
CREATE POLICY "chat_participants_select" ON public.chat_participants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is viewing their own participation
    user_id = auth.uid() OR
    -- Or if user is in the same chat
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 6: Verify policies
SELECT 
    policyname,
    cmd,
    roles,
    permissive,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_participants'
ORDER BY cmd;

