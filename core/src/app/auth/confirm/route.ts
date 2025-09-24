import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  
  // Use production URL for redirects
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://diamondplusportal.com' 
    : request.url

  // Handle both old and new URL formats
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    // Handle magic link / OAuth code exchange
    const supabase = await createSupabaseServerClient()
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // For password recovery, redirect to reset password page
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/reset-password', baseUrl))
        }
        
        // Otherwise redirect to the next page
        return NextResponse.redirect(new URL(next, baseUrl))
      }
    } catch (error) {
      console.error('Code exchange error:', error)
    }
  }

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // For password recovery, redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', baseUrl))
      }
      
      // Otherwise redirect to the specified page after successful verification
      return NextResponse.redirect(new URL(next, baseUrl))
    }
  }

  // Redirect to error page if verification fails
  return NextResponse.redirect(new URL('/login?error=auth_error', baseUrl))
}