import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { generateThumbnail, validateVideo } from "@/lib/video-processor"
import { uploadVideoToS3 } from "@/lib/s3"
import fs from "fs/promises"
import formidable from "formidable"
import { createWriteStream } from "fs"
import { Readable } from "stream"

// Check if S3 is configured
const useS3 = Boolean(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.S3_BUCKET_NAME
)

// Configure route for streaming
export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

// CRITICAL: We need to handle the raw request body to properly stream
// This requires parsing the request ourselves instead of using req.formData()
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("Stream upload endpoint hit at:", new Date().toISOString())
  
  try {
    // Check authentication and admin role
    const session = await auth()
    
    if (!session || session.user?.role !== "ADMIN") {
      console.error("Unauthorized upload attempt")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    console.log("Authenticated user:", session.user?.email)
    
    // Create directories
    const tempDir = path.join(process.cwd(), "uploads", "temp")
    const videosDir = path.join(process.cwd(), "public", "videos")
    const thumbnailsDir = path.join(process.cwd(), "public", "thumbnails")
    
    await mkdir(tempDir, { recursive: true })
    await mkdir(videosDir, { recursive: true })
    await mkdir(thumbnailsDir, { recursive: true })
    
    // Generate unique filename
    const uploadId = randomUUID()
    
    // PROPER STREAMING APPROACH - using formidable for multipart parsing
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxTotalFileSize: 5 * 1024 * 1024 * 1024, // 5GB total
      allowEmptyFiles: false,
      multiples: false,
      filename: (_name, ext) => {
        return `${uploadId}${ext}`
      }
    })
    
    // Parse the multipart form with streaming
    let originalName = ''
    let tempFilePath = ''
    let fileSize = 0
    let fileType = ''
    
    try {
      console.log("Starting form parse...")
      
      // Get request body as a Web Stream
      const body = req.body
      if (!body) {
        return NextResponse.json(
          { error: "No request body" },
          { status: 400 }
        )
      }
      
      // Convert Web Stream to Node.js stream
      const reader = body.getReader()
      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read()
            if (done) {
              this.push(null)
            } else {
              this.push(Buffer.from(value))
            }
          } catch (error) {
            this.destroy(error as Error)
          }
        }
      })
      
      // Create a fake IncomingMessage that formidable expects
      const fakeReq = Object.assign(nodeStream, {
        headers: Object.fromEntries(req.headers.entries()),
        method: req.method,
        url: req.url,
      })
      
      await new Promise((resolve, reject) => {
        let fileProcessed = false
        
        form.on('file', (formName, file) => {
          console.log(`File received: ${file.originalFilename}, Size: ${file.size} bytes`)
          originalName = file.originalFilename || 'video.mp4'
          tempFilePath = file.filepath
          fileSize = file.size
          fileType = file.mimetype || 'video/mp4'
          fileProcessed = true
        })
        
        form.on('error', (err) => {
          console.error('Form parsing error:', err)
          reject(err)
        })
        
        form.on('end', () => {
          if (!fileProcessed) {
            reject(new Error('No file was uploaded'))
          } else {
            console.log('Form parsing completed')
            resolve(true)
          }
        })
        
        // Parse using the fake request object
        // @ts-expect-error - formidable types don't match our custom object perfectly
        form.parse(fakeReq, (err) => {
          if (err) {
            console.error('Form parse error:', err)
            reject(err)
          }
        })
      })
      
    } catch (parseError) {
      console.error("Failed to parse form:", parseError)
      return NextResponse.json(
        { error: "Failed to parse upload: " + (parseError instanceof Error ? parseError.message : String(parseError)) },
        { status: 400 }
      )
    }
    
    if (!tempFilePath || !originalName) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }
    
    console.log(`File streamed to disk: ${tempFilePath}`)
    console.log(`Size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`)
    
    // Extract the file extension for later use
    const fileExtension = path.extname(originalName)
    const fileName = path.basename(tempFilePath) // Use the actual filename from formidable
    
    try {
      // Validate video (this only reads metadata, not the whole file)
      console.log("Validating video...")
      const validation = await validateVideo(tempFilePath)
      if (!validation.valid) {
        await fs.unlink(tempFilePath).catch(() => {})
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }
      
      console.log("Video validated successfully")
      
      // Generate thumbnail
      console.log("Generating thumbnail...")
      let thumbnailUrl = null
      try {
        const thumbnailPath = await generateThumbnail(
          tempFilePath,
          thumbnailsDir,
          {
            timestamp: Math.min(2, validation.metadata?.duration ? validation.metadata.duration / 10 : 1),
            width: 640,
            height: 360,
            quality: 85,
          }
        )
        thumbnailUrl = `/thumbnails/${path.basename(thumbnailPath)}`
        console.log("Thumbnail generated:", thumbnailUrl)
      } catch (thumbError) {
        console.error("Thumbnail generation failed:", thumbError)
        // Try alternative timestamps if first attempt fails
        try {
          console.log("Trying alternative thumbnail generation at 0.5s...")
          const thumbnailPath = await generateThumbnail(
            tempFilePath,
            thumbnailsDir,
            {
              timestamp: 0.5, // Try half a second in
              width: 640,
              height: 360,
              quality: 85,
            }
          )
          thumbnailUrl = `/thumbnails/${path.basename(thumbnailPath)}`
          console.log("Alternative thumbnail generated:", thumbnailUrl)
        } catch (secondError) {
          console.error("Alternative thumbnail generation also failed:", secondError)
          // Continue without thumbnail but log detailed error
          console.error("Thumbnail generation failed completely. Video path:", tempFilePath)
        }
      }
      
      let videoUrl: string
      let storageLocation: 'local' | 's3' = 'local'
      
      // Admin uploads MUST go to S3 only
      if (!useS3) {
        console.error("S3 not configured - admin uploads require S3")
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {})
        return NextResponse.json(
          { error: "S3 storage not configured. Please contact system administrator." },
          { status: 500 }
        )
      }
      
      // Upload to S3 - no fallback for admin uploads
      console.log("Uploading to S3...")
      try {
        // Pass file path directly - S3 lib will stream it
        const s3Key = await uploadVideoToS3(
          tempFilePath, // Pass file path for streaming
          fileName,
          fileType
        )
        videoUrl = s3Key
        storageLocation = 's3'
        console.log("S3 upload successful:", s3Key)
        
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {})
      } catch (s3Error) {
        console.error("S3 upload failed:", s3Error)
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {})
        return NextResponse.json(
          { error: "Failed to upload video to cloud storage. Please try again." },
          { status: 500 }
        )
      }
      
      const processingTime = Date.now() - startTime
      console.log(`Upload completed in ${processingTime}ms`)
      
      // Return success response with metadata
      return NextResponse.json({
        success: true,
        fileName: originalName,
        videoUrl,
        thumbnailUrl,
        size: fileSize,
        sizeMB: (fileSize / (1024 * 1024)).toFixed(2),
        duration: validation.metadata?.duration,
        dimensions: validation.metadata ? {
          width: validation.metadata.width,
          height: validation.metadata.height,
        } : null,
        storage: storageLocation,
        processingTime: `${processingTime}ms`,
        message: `Successfully uploaded ${(fileSize / (1024 * 1024)).toFixed(2)}MB video`,
      })
    } catch (error) {
      console.error("Video processing error:", error)
      
      // Clean up temp file on error
      await fs.unlink(tempFilePath).catch(() => {})
      
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to process video" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Stream upload error:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload video" },
      { status: 500 }
    )
  }
}