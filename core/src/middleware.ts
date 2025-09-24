// CORE ONLY — Supabase-only auth
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Public routes that don't need auth
  const publicRoutes = ['/login', '/register', '/reset-password', '/auth', '/api/supabase-login', '/_next', '/public']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Protected routes that need auth
  const protectedRoutes = ['/dashboard', '/podcasts', '/coaching', '/community', '/me', '/ask-ai', '/calendar', '/group-calls', '/scripts', '/challenges', '/workshops', '/business-audit', '/action-plan']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute || pathname === '/') {
    // Create response to pass cookies
    const response = NextResponse.next()
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as any)
            })
          },
        },
      }
    )
    
    // Check session
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}