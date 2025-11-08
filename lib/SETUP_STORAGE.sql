-- SETUP SUPABASE STORAGE FOR IMAGES AND VIDEOS
-- Run this script in Supabase SQL Editor to create the storage bucket

-- ============================================
-- Step 1: Create storage bucket for chat media
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true, -- Public bucket so images/videos can be accessed via URL
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Step 2: Create storage policies for chat-media bucket
-- ============================================

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read all files in chat-media
DROP POLICY IF EXISTS "Users can read chat media" ON storage.objects;
CREATE POLICY "Users can read chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete their chat media" ON storage.objects;
CREATE POLICY "Users can delete their chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- Step 3: Verify bucket was created
-- ============================================
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'chat-media';

