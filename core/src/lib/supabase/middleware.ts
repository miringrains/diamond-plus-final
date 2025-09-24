import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://birthcsvtmayyxrzzyhh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnRoY3N2dG1heXl4cnp6eWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzU2MjgsImV4cCI6MjA3Mzk1MTYyOH0.rqvnSSt5as1JBiqqEH02ktTwfdUvqp7armaImUizFfA',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Log for debugging
  if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/login') {
    console.log('Middleware auth check:', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      error: error?.message,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    })
  }
  
  // Skip auth check for public routes
  const publicRoutes = [
    '/login',
    '/register',
    '/auth',
    '/reset-password',
    '/',
    '/api/auth',
    '/_next',
    '/favicon'
  ]
  
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  if (!isPublicRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}