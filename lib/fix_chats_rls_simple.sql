-- Simple Fix for Chats RLS - Run this if you get policy errors
-- This drops ALL possible policy names and recreates them

-- Drop ALL possible policy names
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow chat creation" ON public.chats;
DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;

-- Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy (allows chat creation)
CREATE POLICY "Allow chat creation" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create SELECT policy (allows viewing chats you're in)
CREATE POLICY "Users can view their chats" ON public.chats
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Verify policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'chats';

