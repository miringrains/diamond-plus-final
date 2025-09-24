import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { email, password, redirectTo = '/admin' } = requestData

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create response first
    const response = NextResponse.json(
      { success: true, redirectTo },
      { status: 200 }
    )
    
    // Create Supabase client with response-based cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Clear any existing session cookies first
              request.cookies.getAll().forEach(cookie => {
                if (cookie.name.startsWith('sb-')) {
                  response.cookies.delete(cookie.name)
                }
              })
              // Set the new cookie with proper options
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',
                path: '/',
              } as any)
            })
          },
        },
      }
    )

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      // Sign out non-admin users
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Return the response with cookies set
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    // Make sure we always return JSON, never HTML
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}
