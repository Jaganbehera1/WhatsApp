# Quick Setup Guide

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Create .env File
Create a `.env` file in the root directory with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 3: Set Up Supabase Database
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `lib/database.sql`
5. Paste it into the SQL Editor
6. Click "Run" to execute the SQL

## Step 4: Enable Real-time
1. In Supabase dashboard, go to **Database** → **Replication**
2. Find the following tables and toggle them ON:
   - `messages`
   - `chats` (optional, for chat list updates)
   - `chat_participants` (optional)

## Step 5: Run the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing
1. Create a new account with a unique email and mobile number
2. Create another account in a different browser/incognito window
3. Search for the first user and start a chat
4. Send messages - they should appear in real-time!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file exists in the root directory
- Check that the variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart the dev server after creating/updating `.env`

### Real-time not working
- Make sure you enabled replication for the `messages` table
- Check browser console for any errors
- Verify your Supabase project is active

### Profile picture not showing
- The app uses data URLs for profile pictures (base64)
- For production, consider using Supabase Storage for better performance

