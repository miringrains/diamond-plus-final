import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Update the user's email - this will send a confirmation email
    const { error } = await supabase.auth.updateUser({
      email: email
    })
    
    if (error) {
      console.error('Email update error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update email' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Confirmation email sent. Please check your inbox to confirm the email change.'
    })
  } catch (error) {
    console.error('Email change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
