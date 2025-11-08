-- FIX MESSAGES AND CHAT_PARTICIPANTS RLS
-- Run this to ensure messages can be sent and received

-- ============================================
-- Fix chat_participants INSERT policy
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

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create permissive INSERT policy
CREATE POLICY "chat_participants_insert" ON public.chat_participants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT policy (using the helper function to avoid recursion)
CREATE POLICY "chat_participants_select" ON public.chat_participants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_chat_participant(chat_id, auth.uid())
  );

-- ============================================
-- Fix messages RLS
-- ============================================
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'messages'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can view messages in chats they participate in
CREATE POLICY "messages_select" ON public.messages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: Users can send messages to chats they participate in
CREATE POLICY "messages_insert" ON public.messages
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM public.chat_participants 
      WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- UPDATE policy: Users can update their own messages
CREATE POLICY "messages_update" ON public.messages
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- Verify policies
-- ============================================
SELECT 'chat_participants policies:' as info;
SELECT policyname, cmd, permissive, with_check
FROM pg_policies 
WHERE tablename = 'chat_participants'
ORDER BY cmd;

SELECT 'messages policies:' as info;
SELECT policyname, cmd, permissive, with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY cmd;
