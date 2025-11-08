-- ============================================
-- COMPLETE DIAGNOSTIC AND FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Check current RLS status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Step 2: List all existing policies
SELECT 
  policyname,
  cmd as "Command",
  qual as "Using Expression",
  with_check as "With Check Expression"
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 3: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Step 4: Create NEW policies with explicit permissions

-- SELECT: Allow ANYONE (authenticated or not) to read profiles
-- This is needed for the app to work
CREATE POLICY "Allow public profile read" ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- UPDATE: Allow users to update ONLY their own profile
CREATE POLICY "Allow own profile update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Allow authenticated users to insert their own profile
CREATE POLICY "Allow own profile insert" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 5: Verify the new policies
SELECT 
  policyname,
  cmd as "Command",
  roles,
  qual as "Using Expression"
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Step 6: Test query (run this as an authenticated user)
-- This should work now:
-- SELECT * FROM public.profiles LIMIT 1;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. The SELECT policy uses "TO public" which means it applies to everyone
-- 2. The UPDATE and INSERT policies use "TO authenticated" which means only logged-in users
-- 3. Make sure email confirmation is DISABLED in Authentication > Settings
-- 4. After running this, clear your browser cache and try again

