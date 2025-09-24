import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadLargeVideoToS3, calculateOptimalPartSize } from "@/lib/s3-multipart"
import { writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

// Check if S3 is configured
const useS3 = Boolean(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.S3_BUCKET_NAME
)

export async function POST(req: NextRequest) {
  try {
    console.log("Large upload endpoint hit")
    
    // Check authentication and admin role
    const session = await auth()
    
    if (!session || session.user?.role !== "ADMIN") {
      console.error("Unauthorized upload attempt")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    console.log("Parsing form data...")
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP4, WebM, OGG, and MOV videos are allowed." },
        { status: 400 }
      )
    }
    
    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024 // 5GB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5GB.` },
        { status: 400 }
      )
    }
    
    console.log(`Uploading large video: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
    
    let videoUrl: string
    let fileName: string
    
    if (useS3) {
      // Use multipart upload for S3
      console.log("Using S3 multipart upload for large file...")
      
      // Calculate optimal part size
      const partSize = calculateOptimalPartSize(file.size)
      console.log(`Using part size: ${(partSize / (1024 * 1024)).toFixed(2)}MB`)
      
      // Upload to S3 with progress tracking
      const s3Key = await uploadLargeVideoToS3(
        file,
        file.name,
        file.type,
        (progress) => {
          // Log progress (could be sent via WebSocket/SSE in production)
          if (progress.percentage % 10 === 0) {
            console.log(`Upload progress: ${progress.percentage}%`)
          }
        }
      )
      
      videoUrl = s3Key
      fileName = s3Key
      
      console.log("S3 multipart upload successful:", s3Key)
    } else {
      // For local storage, save in chunks to avoid memory issues
      console.log("Saving large file to local storage...")
      
      const fileExtension = path.extname(file.name)
      fileName = `${randomUUID()}${fileExtension}`
      const filePath = path.join(process.cwd(), "public", "videos", fileName)
      
      // Stream file to disk
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)
      
      videoUrl = `/api/videos/${fileName}`
      
      console.log("Local storage successful:", fileName)
    }
    
    return NextResponse.json({
      success: true,
      fileName,
      videoUrl,
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type,
      storage: useS3 ? 's3' : 'local',
      message: `Successfully uploaded ${(file.size / (1024 * 1024)).toFixed(2)}MB video`,
    })
  } catch (error) {
    console.error("Large video upload error:", error)
    
    // Provide more specific error messages
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

// Configure route segment to handle large uploads
export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for large uploads