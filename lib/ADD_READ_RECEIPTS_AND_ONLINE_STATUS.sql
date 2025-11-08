-- ADD READ RECEIPTS AND ONLINE STATUS FEATURES
-- Run this script to add read receipts and online status tracking

-- ============================================
-- Step 1: Add read_at column to messages
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added read_at column to messages';
    ELSE
        RAISE NOTICE 'read_at column already exists in messages';
    END IF;
END $$;

-- ============================================
-- Step 2: Add is_online and last_seen to profiles
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'is_online'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_online column to profiles';
    ELSE
        RAISE NOTICE 'is_online column already exists in profiles';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
        RAISE NOTICE 'Added last_seen column to profiles';
    ELSE
        RAISE NOTICE 'last_seen column already exists in profiles';
    END IF;
END $$;

-- ============================================
-- Step 3: Create function to update last_seen when user goes offline
-- ============================================
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_online = false AND OLD.is_online = true THEN
        NEW.last_seen = TIMEZONE('utc'::text, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_last_seen_trigger ON public.profiles;
CREATE TRIGGER update_last_seen_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.is_online IS DISTINCT FROM NEW.is_online)
    EXECUTE FUNCTION update_last_seen();

-- ============================================
-- Step 4: Create function to mark messages as read
-- ============================================
CREATE OR REPLACE FUNCTION mark_messages_as_read(chat_uuid UUID, reader_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.messages
    SET read_at = TIMEZONE('utc'::text, NOW())
    WHERE chat_id = chat_uuid
      AND sender_id != reader_uuid
      AND read_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;

-- ============================================
-- Step 5: Verify columns were added
-- ============================================
SELECT 
    'Messages columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND column_name IN ('read_at')
ORDER BY column_name;

SELECT 
    'Profiles columns:' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('is_online', 'last_seen')
ORDER BY column_name;

