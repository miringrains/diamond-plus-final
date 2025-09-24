import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedVideoUrl } from "@/lib/s3"
import Mux from "@mux/mux-node"

// Simple S3 upload
async function uploadToS3(file: File, key: string) {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  })
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }))
  
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`
}

export async function POST(req: NextRequest) {
  try {
    // Check auth
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Get form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const contentType = formData.get('contentType') as string // 'welcome' | 'podcast' | 'group' | 'script'
    
    if (!file || !title || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Generate unique ID
    const id = crypto.randomUUID()
    
    // 1. Upload to S3
    const s3Key = `${contentType}/${id}/${file.name}`
    const fileUrl = await uploadToS3(file, s3Key)
    
    // 2. Create Mux asset (if configured)
    let muxPlaybackId = null
    let muxAssetId = null
    
    if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) {
      try {
        const mux = new Mux({
          tokenId: process.env.MUX_TOKEN_ID,
          tokenSecret: process.env.MUX_TOKEN_SECRET,
        })
        
        // Get a signed URL for Mux to access the S3 file
        const signedUrl = await getSignedVideoUrl(s3Key, 7200) // 2 hour expiry
        console.log("Generated signed URL for Mux")
        
        const asset = await mux.video.assets.create({
          inputs: [{ url: signedUrl }],
          playback_policy: ['public'],
        })
        
        muxAssetId = asset.id
        muxPlaybackId = asset.playback_ids?.[0]?.id || null
        
        console.log("Mux asset created:", muxAssetId)
        console.log("Mux playback ID:", muxPlaybackId)
      } catch (error) {
        console.error("Mux creation failed (non-fatal):", error)
      }
    }
    
    // 3. Save to Supabase (simple insert)
    const tables: Record<string, string> = {
      'welcome': 'welcome_course_videos',
      'podcast': 'dp_podcasts',
      'group': 'group_calls',
      'script': 'script_videos'
    }
    
    const tableName = tables[contentType]
    const isAudio = file.type.startsWith('audio/')
    
    const record: any = {
      id,
      title,
      description,
      [isAudio ? 'audio_url' : 'video_url']: fileUrl,
      mux_playback_id: muxPlaybackId,
      mux_asset_id: muxAssetId,
      thumbnail_url: muxPlaybackId && !isAudio ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=5` : null,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Add specific fields based on content type
    if (contentType === 'welcome' || contentType === 'script') {
      record.order = 0
    }
    if (contentType === 'group') {
      record.call_date = new Date().toISOString()
    }
    
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .insert([record])
      .select()
      .single()
    
    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save to database" }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: `${contentType} uploaded successfully!` 
    })
    
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Upload failed" 
    }, { status: 500 })
  }
}
