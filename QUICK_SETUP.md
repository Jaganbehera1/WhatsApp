# Quick Database Setup - 5 Minutes

## The Error You're Seeing
```
Could not find the table 'public.chat_participants' in the schema cache
```

This means the database tables haven't been created yet.

## Fix in 3 Steps

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run the Database Script
1. Open `lib/database.sql` from your project folder
2. **Select ALL** the text (Ctrl+A)
3. **Copy** it (Ctrl+C)
4. **Paste** into the Supabase SQL Editor
5. Click **"Run"** button (or press Ctrl+Enter)

You should see: "Success. No rows returned"

### Step 3: Fix RLS Policies
1. Open `lib/DIAGNOSE_AND_FIX.sql` from your project
2. **Select ALL** the text (Ctrl+A)
3. **Copy** it (Ctrl+C)
4. **Paste** into a new query in SQL Editor
5. Click **"Run"**

You should see a table showing the policies were created.

### Step 4: Enable Real-time (Optional but Recommended)
1. In Supabase, go to **Database** → **Replication**
2. Find the `messages` table
3. Toggle it **ON**

### Step 5: Refresh Your App
1. Go back to your app
2. **Refresh the page** (F5)
3. The error should be gone! 🎉

---

## Verify It Worked

After running the scripts, you should be able to:
- ✅ See the chat list (even if empty)
- ✅ Search for users
- ✅ Start a new chat
- ✅ Send messages

---

## Troubleshooting

### "relation already exists" error
- Some tables already exist - that's fine!
- The script uses `CREATE TABLE IF NOT EXISTS` so it's safe
- Just continue with the RLS fix script

### "permission denied" error
- Make sure you're logged into Supabase
- Check you're in the correct project
- Try running the script again

### Still seeing errors?
- Clear your browser cache
- Restart your dev server: `npm run dev`
- Check the browser console for new error messages

---

## What the Scripts Do

**database.sql** creates:
- `profiles` - User profiles
- `chats` - Chat rooms
- `chat_participants` - Who's in each chat
- `messages` - All messages
- RLS policies for security
- Triggers for automatic profile creation

**DIAGNOSE_AND_FIX.sql** fixes:
- RLS policies to allow proper access
- Ensures you can read/write your own data

That's it! Your app should work now. 🚀

