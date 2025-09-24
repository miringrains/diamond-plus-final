import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"
import { prisma } from "@/lib/db"
import { getSignedVideoUrl, isS3Url, getS3KeyFromUrl } from "@/lib/s3"

export async function POST(req: NextRequest) {
  try {
    // Check authentication - must be admin
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    
    const { videoUrl } = await req.json()
    
    if (!videoUrl) {
      return new NextResponse("Video URL required", { status: 400 })
    }
    
    // If it's an S3 URL, generate a signed URL
    if (isS3Url(videoUrl)) {
      const s3Key = getS3KeyFromUrl(videoUrl)
      const signedUrl = await getSignedVideoUrl(s3Key, 7200) // 2 hour expiry for preview
      return NextResponse.json({ url: signedUrl })
    }
    
    // For local videos, extract filename
    const filename = videoUrl.split('/').pop() || videoUrl
    
    // Check if file exists locally
    const videoPath = path.join(process.cwd(), "public", "videos", filename)
    try {
      await fs.access(videoPath)
      // Return the API endpoint URL that will serve the video
      return NextResponse.json({ url: `/api/videos/${filename}` })
    } catch {
      return new NextResponse("Video not found", { status: 404 })
    }
    
  } catch (error) {
    console.error("Error generating preview URL:", error)
    return NextResponse.json(
      { error: "Failed to generate preview URL" },
      { status: 500 }
    )
  }
}