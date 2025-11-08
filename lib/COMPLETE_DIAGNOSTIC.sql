-- COMPLETE DIAGNOSTIC - Run this and share ALL output
-- This will show us exactly what's wrong

-- ============================================
-- PART 1: Check RLS Status
-- ============================================
SELECT '=== PART 1: RLS STATUS ===' as section;

SELECT 
    tablename,
    rowsecurity as "RLS Enabled",
    CASE WHEN rowsecurity THEN 'YES - RLS is ON' ELSE 'NO - RLS is OFF' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'chats';

-- ============================================
-- PART 2: List ALL Policies with Full Details
-- ============================================
SELECT '=== PART 2: ALL POLICIES ===' as section;

SELECT 
    policyname,
    cmd as "Command",
    roles::text as "Roles",
    permissive as "Permissive?",
    CASE 
        WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE (Good)'
        WHEN permissive = 'RESTRICTIVE' THEN '❌ RESTRICTIVE (Bad - blocks everything)'
        ELSE '⚠️ Unknown: ' || permissive
    END as permissive_status,
    qual as "Using Clause",
    with_check as "With Check Clause"
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'chats'
ORDER BY cmd, policyname;

-- ============================================
-- PART 3: Check for RESTRICTIVE Policies
-- ============================================
SELECT '=== PART 3: RESTRICTIVE POLICY CHECK ===' as section;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            '❌ FOUND ' || COUNT(*) || ' RESTRICTIVE POLICY/POLICIES - This is blocking inserts!'
        ELSE 
            '✅ No RESTRICTIVE policies found'
    END as restrictive_check,
    string_agg(policyname, ', ') as restrictive_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'chats' 
  AND permissive = 'RESTRICTIVE';

-- ============================================
-- PART 4: Check INSERT Policies Specifically
-- ============================================
SELECT '=== PART 4: INSERT POLICIES ===' as section;

SELECT 
    policyname,
    roles::text,
    permissive,
    with_check,
    CASE 
        WHEN permissive = 'PERMISSIVE' AND with_check = 'true' THEN '✅ Should work'
        WHEN permissive = 'RESTRICTIVE' THEN '❌ Will block everything'
        WHEN permissive = 'PERMISSIVE' AND with_check IS NULL THEN '⚠️ No WITH CHECK clause'
        ELSE '⚠️ Unknown state'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'chats' 
  AND cmd = 'INSERT';

-- ============================================
-- PART 5: Check if authenticated role exists
-- ============================================
SELECT '=== PART 5: ROLE CHECK ===' as section;

SELECT 
    rolname,
    CASE 
        WHEN rolname = 'authenticated' THEN '✅ authenticated role exists'
        ELSE 'Other role: ' || rolname
    END as role_status
FROM pg_roles 
WHERE rolname IN ('authenticated', 'anon', 'authenticator', 'service_role');

-- ============================================
-- PART 6: Check table structure
-- ============================================
SELECT '=== PART 6: TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'chats'
ORDER BY ordinal_position;

