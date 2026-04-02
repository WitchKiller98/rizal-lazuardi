import { createBrowserClient } from '@supabase/ssr'

// Buat Supabase client untuk penggunaan di browser/client components
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Graceful degradation jika env vars tidak diset (untuk development)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Running in demo mode.')
    // Return mock client untuk development
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
