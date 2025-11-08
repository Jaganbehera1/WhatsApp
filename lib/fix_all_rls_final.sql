-- FINAL FIX for ALL RLS Policies
-- Run this to fix chats and chat_participants RLS

-- ============================================
-- Fix CHATS table
-- ============================================
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- Re-enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert" ON public.chats
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create SELECT policy
DROP POLICY IF EXISTS "chats_select" ON public.chats;
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

-- ============================================
-- Fix CHAT_PARTICIPANTS table
-- ============================================
ALTER TABLE public.chat_participants DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'chat_participants'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_participants;
CREATE POLICY "chat_participants_insert" ON public.chat_participants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create SELECT policy
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_participants;
CREATE POLICY "chat_participants_select" ON public.chat_participants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Verify all policies
-- ============================================
SELECT 'Chats policies:' as table_name;
SELECT policyname, cmd, roles, permissive 
FROM pg_policies 
WHERE tablename = 'chats'
ORDER BY cmd;

SELECT 'Chat participants policies:' as table_name;
SELECT policyname, cmd, roles, permissive 
FROM pg_policies 
WHERE tablename = 'chat_participants'
ORDER BY cmd;

