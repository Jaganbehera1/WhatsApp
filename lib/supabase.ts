import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 
    'Missing Supabase environment variables!\n\n' +
    'Please create a .env file in the root directory with:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n' +
    'Get these values from your Supabase project: Settings > API\n' +
    'Then restart the development server (npm run dev)'
  
  if (typeof window === 'undefined') {
    // Server-side error
    throw new Error(errorMessage)
  } else {
    // Client-side error - show user-friendly message
    console.error(errorMessage)
    alert('Missing Supabase configuration!\n\nPlease check the console for setup instructions.')
  }
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
  console.warn(
    '⚠️ Supabase URL format looks incorrect!\n' +
    `Current URL: ${supabaseUrl}\n` +
    'Expected format: https://your-project-id.supabase.co\n\n' +
    'Please verify your Supabase URL in the .env file and restart the server.'
  )
}

// Debug: Log environment variables (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'missing',
  })
}

// Create client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

