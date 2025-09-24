import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' }, { status: 400 })
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Optimize and resize image using sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer()

    // Generate unique filename
    const fileExt = 'jpg' // Always save as JPEG after optimization
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`

    // Delete old avatar if exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.avatar_url) {
      // Extract file path from URL
      const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
      await supabase.storage.from('avatars').remove([oldPath])
    }

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      // If update fails, delete the uploaded file
      await supabase.storage.from('avatars').remove([fileName])
      throw updateError
    }

    // Also update user metadata
    await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    })

    return NextResponse.json({ 
      success: true, 
      avatar_url: publicUrl 
    })

  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current avatar URL
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.avatar_url) {
      // Extract file path from URL
      const filePath = profile.avatar_url.split('/').slice(-2).join('/')
      
      // Delete from storage
      await supabase.storage.from('avatars').remove([filePath])
    }

    // Remove avatar URL from profile
    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    // Update user metadata
    await supabase.auth.updateUser({
      data: { avatar_url: null }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Avatar delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete avatar' },
      { status: 500 }
    )
  }
}
