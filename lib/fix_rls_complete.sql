-- Complete RLS Policy Fix for WhatApp
-- Run this in Supabase SQL Editor to fix all 401 errors

-- ============================================
-- STEP 1: Drop all existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ============================================
-- STEP 2: Recreate Profiles Policies
-- ============================================

-- Allow anyone (authenticated or not) to SELECT profiles
-- This is needed for searching users and viewing profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (true);

-- Allow authenticated users to UPDATE their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to INSERT their own profile
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 3: Verify Policies
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================
-- STEP 4: Test Query (should work after policies are set)
-- ============================================
-- This query should work for any authenticated user
-- SELECT * FROM public.profiles LIMIT 1;

