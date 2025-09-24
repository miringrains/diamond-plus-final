import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadLargeVideoToS3, calculateOptimalPartSize } from "@/lib/s3-multipart"
import { mux, requireMuxConfigured } from "@/lib/mux"
import path from "path"
import { writeFile, mkdir, unlink } from "fs/promises"

// Check if S3 is configured
const useS3 = Boolean(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.S3_BUCKET_NAME
)

// Configure route for large uploads
export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("Diamond Plus video upload endpoint hit at:", new Date().toISOString())
  
  let tempFilePath: string | null = null
  
  try {
    // Check authentication and admin role
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      console.error("Unauthorized upload attempt")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    console.log("Authenticated user:", session.user?.email)
    
    // Parse form data
    console.log("Parsing form data...")
    const formData = await req.formData()
    
    // Extract fields
    const contentId = formData.get('contentId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const orderIndexStr = formData.get('orderIndex') as string
    const orderIndex = orderIndexStr ? parseInt(orderIndexStr) : 0
    const file = formData.get('file') as File
    
    // Validate required fields
    if (!contentId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: contentId and title are required" },
        { status: 400 }
      )
    }
    
    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP4, WebM, OGG, MOV, and MKV videos are allowed." },
        { status: 400 }
      )
    }
    
    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5GB.` },
        { status: 400 }
      )
    }
    
    console.log(`Uploading video: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
    
    // Verify content exists
    const content = await prisma.dp_content.findUnique({
      where: { id: contentId }
    })
    
    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      )
    }
    
    // Create video record first with processing status
    const video = await prisma.dp_videos.create({
      data: {
        content_id: contentId,
        title,
        description,
        order_index: orderIndex,
        // Will be updated after upload
        video_url: null,
        mux_playback_id: null,
        mux_asset_id: null,
      }
    })
    
    console.log("Created video record:", video.id)
    
    try {
      let s3Key: string
      
      if (useS3) {
        // Upload to S3 with Diamond Plus specific path
        console.log("Uploading to S3...")
        const dpS3Key = `diamond-plus/videos/${contentId}/${video.id}/${file.name}`
        
        // Calculate optimal part size for multipart upload
        const partSize = calculateOptimalPartSize(file.size)
        console.log(`Using part size: ${(partSize / (1024 * 1024)).toFixed(2)}MB`)
        
        // Upload with progress tracking
        s3Key = await uploadLargeVideoToS3(
          file,
          dpS3Key,
          file.type,
          (progress) => {
            // Could send progress via WebSocket/SSE
            if (progress.percentage % 10 === 0) {
              console.log(`Upload progress: ${progress.percentage}%`)
            }
          }
        )
        
        console.log("S3 upload successful:", s3Key)
      } else {
        // For local development, save to temp directory
        console.log("Saving to local storage...")
        const tempDir = path.join(process.cwd(), "uploads", "temp")
        await mkdir(tempDir, { recursive: true })
        
        const fileName = `${video.id}-${file.name}`
        tempFilePath = path.join(tempDir, fileName)
        
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(tempFilePath, buffer)
        
        s3Key = tempFilePath
        console.log("Local save successful:", tempFilePath)
      }
      
      // Generate S3 URL
      const s3Url = useS3 
        ? `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`
        : s3Key
      
      // Create Mux asset
      console.log("Creating Mux asset...")
      requireMuxConfigured()
      
      const muxAsset = await mux.video.assets.create({
        input: s3Url,
        playback_policy: ['public'],
        passthrough: JSON.stringify({
          platform: 'diamond-plus',
          contentId,
          videoId: video.id,
          type: content.type
        })
      } as any) // TypeScript workaround - same pattern as podcast upload
      
      console.log("Mux asset created:", muxAsset.id)
      
      // Update video record with URLs and Mux info
      const updatedVideo = await prisma.dp_videos.update({
        where: { id: video.id },
        data: {
          video_url: s3Url,
          mux_asset_id: muxAsset.id,
          mux_playback_id: muxAsset.playback_ids?.[0]?.id || null,
          duration: muxAsset.duration ? Math.round(muxAsset.duration) : null,
        }
      })
      
      const elapsedTime = Date.now() - startTime
      console.log(`Upload completed in ${elapsedTime}ms`)
      
      return NextResponse.json({
        success: true,
        video: updatedVideo,
        uploadTime: elapsedTime,
        message: `Successfully uploaded ${(file.size / (1024 * 1024)).toFixed(2)}MB video`
      })
      
    } catch (uploadError) {
      // If upload fails, delete the video record
      console.error("Upload failed, cleaning up:", uploadError)
      await prisma.dp_videos.delete({
        where: { id: video.id }
      })
      throw uploadError
    }
    
  } catch (error) {
    console.error("Video upload error:", error)
    
    // Clean up temp file if it exists
    if (tempFilePath && !useS3) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error("Failed to clean up temp file:", cleanupError)
      }
    }
    
    // Provide specific error messages
    let errorMessage = "Failed to upload video"
    if (error instanceof Error) {
      if (error.message.includes("Access Denied")) {
        errorMessage = "S3 access denied. Please check AWS credentials."
      } else if (error.message.includes("NoSuchBucket")) {
        errorMessage = "S3 bucket not found. Please check bucket configuration."
      } else if (error.message.includes("NetworkingError")) {
        errorMessage = "Network error during upload. Please try again."
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}