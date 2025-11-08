-- Fix RLS Policies for WhatApp
-- Run this in Supabase SQL Editor if you're getting 401 errors

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate profiles policies
-- Allow anyone (including unauthenticated) to view profiles for searching
CREATE POLICY "Users can view all profiles" ON public.profiles 
  FOR SELECT 
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Verify policies are created
SELECT * FROM pg_policies WHERE tablename = 'profiles';

