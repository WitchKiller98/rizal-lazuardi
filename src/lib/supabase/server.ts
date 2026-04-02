import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Buat Supabase client untuk penggunaan di server components dan API routes
export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Graceful degradation jika env vars tidak diset
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Running in demo mode.')
    return createServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Server component - tidak bisa set cookie
            }
          },
          remove(name: string, options: Record<string, unknown>) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Server component - tidak bisa hapus cookie
            }
          },
        },
      }
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Server component - tidak bisa set cookie langsung
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Server component - tidak bisa hapus cookie langsung
        }
      },
    },
  })
}

// Buat Supabase admin client dengan service role key (untuk operasi server-side)
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase service role key not set.')
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
