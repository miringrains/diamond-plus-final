import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Create a Supabase client for use in the browser
export function createClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://birthcsvtmayyxrzzyhh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnRoY3N2dG1heXl4cnp6eWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzU2MjgsImV4cCI6MjA3Mzk1MTYyOH0.rqvnSSt5as1JBiqqEH02ktTwfdUvqp7armaImUizFfA'
  )
}

// For backwards compatibility
export const createBrowserClient = createClient
export const getSupabaseBrowserClient = createClient
