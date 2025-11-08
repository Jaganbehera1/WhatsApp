-- FIX MISSING MOBILE COLUMN IN PROFILES TABLE
-- Run this to add the mobile column if it's missing

-- ============================================
-- Step 1: Check if mobile column exists
-- ============================================
SELECT 
    'Current columns in profiles:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- Step 2: Add mobile column if it doesn't exist
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'mobile'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN mobile TEXT;
        RAISE NOTICE 'Added mobile column to profiles';
    ELSE
        RAISE NOTICE 'mobile column already exists in profiles';
    END IF;
END $$;

-- ============================================
-- Step 3: Drop existing unique constraints/indexes first
-- ============================================
DROP INDEX IF EXISTS unique_mobile_not_null;
DROP INDEX IF EXISTS profiles_mobile_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unique_mobile;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_mobile_key;

-- ============================================
-- Step 4: Fix duplicate empty strings - assign unique temporary values
-- ============================================
-- First, update NULL mobiles to empty string
UPDATE public.profiles 
SET mobile = '' 
WHERE mobile IS NULL;

-- Then, assign unique temporary values to duplicate empty strings
DO $$
DECLARE
    row_record RECORD;
    counter INTEGER := 1;
BEGIN
    -- Find all rows with empty mobile and assign unique temporary values
    FOR row_record IN 
        SELECT id FROM public.profiles WHERE mobile = '' ORDER BY created_at
    LOOP
        UPDATE public.profiles 
        SET mobile = 'temp_' || counter || '_' || substring(id::text, 1, 8)
        WHERE id = row_record.id;
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Assigned temporary unique values to % rows with empty mobile', counter - 1;
END $$;

-- ============================================
-- Step 5: Make mobile nullable (to allow flexibility)
-- ============================================
DO $$
BEGIN
    -- Remove NOT NULL constraint if it exists
    ALTER TABLE public.profiles ALTER COLUMN mobile DROP NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN mobile SET DEFAULT '';
    RAISE NOTICE 'Set mobile column to nullable with default empty string';
END $$;

-- ============================================
-- Step 6: Add unique constraint only for non-empty values
-- ============================================
-- Create unique index that only enforces uniqueness on non-empty, non-null values
-- This allows multiple NULLs and multiple empty strings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'profiles_mobile_unique_not_empty'
    ) THEN
        CREATE UNIQUE INDEX profiles_mobile_unique_not_empty 
        ON public.profiles (mobile) 
        WHERE mobile IS NOT NULL AND mobile != '';
        RAISE NOTICE 'Created unique index for non-empty mobile values';
    ELSE
        RAISE NOTICE 'Unique index for mobile already exists';
    END IF;
END $$;

-- ============================================
-- Step 7: Verify the column was added
-- ============================================
SELECT 
    'After fix - columns in profiles:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'mobile';

-- ============================================
-- Step 8: Update trigger function to handle mobile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, mobile, full_name, is_online, last_seen)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false,
    TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    mobile = COALESCE(NULLIF(EXCLUDED.mobile, ''), profiles.mobile),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 9: Verify trigger exists
-- ============================================
SELECT 
    'Trigger Status:' as info,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

