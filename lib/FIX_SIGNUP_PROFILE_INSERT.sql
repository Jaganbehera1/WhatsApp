-- FIX SIGNUP PROFILE INSERT ISSUES
-- Run this to ensure profile creation works during signup

-- ============================================
-- Step 1: Ensure all required columns exist
-- ============================================
DO $$ 
BEGIN
    -- Add is_online if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_online'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;

    -- Add last_seen if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
    END IF;
END $$;

-- ============================================
-- Step 2: Update the trigger function to handle new columns
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
    mobile = COALESCE(EXCLUDED.mobile, profiles.mobile),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 3: Verify RLS policy allows profile insert
-- ============================================
-- Check if INSERT policy exists
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND cmd = 'INSERT'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Create INSERT policy if it doesn't exist
        CREATE POLICY "Users can insert own profile" ON public.profiles 
        FOR INSERT 
        TO authenticated
        WITH CHECK (auth.uid() = id);
        
        RAISE NOTICE 'Created INSERT policy for profiles';
    ELSE
        RAISE NOTICE 'INSERT policy already exists for profiles';
    END IF;
END $$;

-- ============================================
-- Step 4: Verify trigger exists
-- ============================================
SELECT 
    'Trigger Status:' as info,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- Step 5: Test the function (commented out - uncomment to test)
-- ============================================
-- SELECT public.handle_new_user();

