# Setup Image and Video Upload

## Step 1: Set Up Storage Bucket

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `lib/SETUP_STORAGE.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the SQL

This will create:
- A storage bucket named `chat-media` for storing images and videos
- Storage policies that allow authenticated users to upload and read files
- 50MB file size limit
- Support for common image formats (JPEG, PNG, GIF, WebP) and video formats (MP4, WebM, QuickTime)

## Step 2: Test It Out

1. Refresh your browser
2. Open a chat with someone
3. Click the **paperclip icon** (📎) next to the message input
4. Select an image or video file
5. The file will upload and appear in the chat!

## Features

- ✅ Upload images (JPEG, PNG, GIF, WebP)
- ✅ Upload videos (MP4, WebM, QuickTime)
- ✅ 50MB file size limit
- ✅ Images are clickable to open in a new tab
- ✅ Videos have built-in player controls
- ✅ Real-time updates - files appear instantly for both users
- ✅ Read receipts work for image/video messages too

## Troubleshooting

### "Storage bucket not set up" error
- Make sure you ran `SETUP_STORAGE.sql` in Supabase SQL Editor
- Check that the bucket `chat-media` exists in Storage section of Supabase dashboard

### "File size must be less than 50MB"
- The current limit is 50MB per file
- To change this, edit `lib/SETUP_STORAGE.sql` and update `file_size_limit` value

### Images/videos not loading
- Check browser console for errors
- Verify the storage bucket is set to **public** in Supabase dashboard
- Make sure storage policies are correctly set up

