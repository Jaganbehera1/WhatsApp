-- Fix RLS Policies for Chats Table
-- Run this to fix "violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow chat creation" ON public.chats;

-- Recreate policies with explicit permissions
-- Allow authenticated users to view chats they participate in
CREATE POLICY "Users can view chats they participate in" ON public.chats 
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to create chats
CREATE POLICY "Users can create chats" ON public.chats 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update chats they participate in
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

-- Verify policies
SELECT 
  policyname,
  cmd as "Command",
  roles,
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

