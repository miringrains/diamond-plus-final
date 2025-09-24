import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

// Types for compatibility
export interface User {
  id: string
  email: string
  name?: string
  role?: string
  avatar_url?: string | null
  [key: string]: any
}

export interface Session {
  user: User | null
  expires?: string
}

// Server-side auth check
export async function auth(): Promise<Session | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Fetch profile for role and additional data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: profile?.full_name || user.email || '',
        role: profile?.role || 'user',
        avatar_url: profile?.avatar_url || null,
        firstName: (profile?.metadata as any)?.first_name || '',
        lastName: (profile?.metadata as any)?.last_name || '',
        phone: (profile?.metadata as any)?.phone || '',
        createdAt: user.created_at,
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

// Alias for auth()
export const getServerSession = auth

// Client-side sign in
export async function signIn(provider: string, options?: { email: string, password: string }): Promise<{ error?: any }> {
  if (provider !== 'credentials' || !options?.email || !options?.password) {
    return { error: 'Invalid credentials' }
  }

  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: options.email,
      password: options.password,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Sign in failed' }
  }
}

// Sign out
export async function signOut() {
  if (typeof window !== 'undefined') {
    // Client-side
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
  } else {
    // Server-side
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  }
}

// Role-based access control
export async function requireRole(roles: string[]) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const userRole = session.user.role || 'user'
  
  if (!roles.includes(userRole)) {
    redirect('/unauthorized')
  }

  return session
}

// Check if authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth()
  return !!session?.user
}

// Redirect to login
export function redirectToLogin() {
  redirect('/login')
}

// Middleware helper for API routes
export async function withAuth(handler: Function) {
  return async function(req: Request, ...args: any[]) {
    const session = await auth()
    
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    return handler(req, ...args)
  }
}
