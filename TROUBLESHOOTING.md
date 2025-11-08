# Troubleshooting Guide

## Error: ERR_NAME_NOT_RESOLVED or Failed to fetch

This error means your browser cannot connect to your Supabase project URL.

### Common Causes:

1. **Supabase Project is Paused**
   - Free tier projects are paused after 7 days of inactivity
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Find your project and click "Restore" if it's paused

2. **Incorrect Project URL**
   - The URL format should be: `https://your-project-id.supabase.co`
   - Go to your Supabase project → Settings → API
   - Copy the exact "Project URL" (not the API URL)
   - Make sure there are no extra spaces or characters

3. **Project Doesn't Exist**
   - Verify the project ID in the URL matches your actual project
   - Check your Supabase dashboard to see all your projects

### How to Fix:

1. **Verify Your Supabase Project:**
   ```
   1. Go to https://supabase.com/dashboard
   2. Check if your project is listed and active
   3. If paused, click "Restore" to reactivate it
   ```

2. **Get the Correct URL:**
   ```
   1. Open your Supabase project
   2. Go to Settings (gear icon) → API
   3. Under "Project URL", copy the exact URL
   4. It should look like: https://xxxxxxxxxxxxx.supabase.co
   ```

3. **Update .env File:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-correct-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Restart the Server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

5. **Clear Browser Cache:**
   - Clear your browser's cache and localStorage
   - Or use an incognito/private window

### Test Your Connection:

You can test if your Supabase URL is accessible by opening it in a browser:
- Try opening: `https://your-project-id.supabase.co`
- You should see a Supabase API response (JSON)

If it doesn't load, the project is likely paused or the URL is incorrect.

## Other Common Issues

### "Missing Supabase environment variables"
- Make sure `.env` file exists in the root directory
- Check that variable names start with `NEXT_PUBLIC_`
- Restart the dev server after creating/updating `.env`

### Real-time not working
- Enable replication in Supabase: Database → Replication
- Toggle ON for `messages` table
- Check browser console for subscription errors

### Authentication errors
- Verify your Supabase project has Authentication enabled
- Check that email confirmation is disabled (for development) in:
  - Authentication → Settings → Email Auth
  - Disable "Enable email confirmations"

