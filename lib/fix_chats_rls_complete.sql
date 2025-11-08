-- Complete Fix for Chats RLS Policy
-- This will fix the "violates row-level security policy" error

-- Step 1: Drop ALL existing policies on chats table
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow chat creation" ON public.chats;
DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;

-- Step 2: Verify RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Step 3: Create INSERT policy FIRST (most permissive)
-- This allows any authenticated user to create chats
CREATE POLICY "Allow chat creation" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 4: Create SELECT policy
-- Users can view chats they participate in
CREATE POLICY "Users can view their chats" ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is a participant OR if chat was just created (for immediate access)
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 5: Create UPDATE policy
CREATE POLICY "Users can update their chats" ON public.chats
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Step 6: Verify policies were created
SELECT 
  policyname,
  cmd as "Command",
  roles,
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- Step 7: Test query (should show the policies)
-- You should see 3 policies: INSERT, SELECT, and UPDATE

