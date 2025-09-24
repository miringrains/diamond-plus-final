import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { uploadVideoToS3 } from "@/lib/s3"

// Check if S3 is configured
const useS3 = Boolean(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.S3_BUCKET_NAME
)

export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await auth()
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/ogg"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP4, WebM, and OGG videos are allowed." },
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
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    let videoUrl: string
    let fileName: string
    
    if (useS3) {
      // Upload to S3
      console.log("Uploading to S3...")
      const s3Key = await uploadVideoToS3(buffer, file.name, file.type)
      
      // Store the S3 key as the videoUrl
      videoUrl = s3Key
      fileName = s3Key
      
      console.log("Upload to S3 successful:", s3Key)
    } else {
      // Fallback to local storage
      console.log("Uploading to local storage...")
      const fileExtension = path.extname(file.name)
      fileName = `${randomUUID()}${fileExtension}`
      const filePath = path.join(process.cwd(), "public", "videos", fileName)
      
      // Save file locally
      await writeFile(filePath, buffer)
      
      // Return the API URL for accessing the video
      videoUrl = `/api/videos/${fileName}`
      
      console.log("Local upload successful:", fileName)
    }
    
    return NextResponse.json({
      success: true,
      fileName,
      videoUrl,
      size: file.size,
      type: file.type,
      storage: useS3 ? 's3' : 'local',
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    )
  }
}

// Configure Next.js to handle large file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5gb",
    },
  },
}