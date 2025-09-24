import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, location, bio } = await request.json()
    
    const supabase = await createSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Update the user's profile in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        phone,
        location,
        bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }
    
    // Update the user metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { 
        full_name: name,
        phone,
        location,
        bio
      }
    })
    
    if (metadataError) {
      console.error('Metadata update error:', metadataError)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
