import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSignedVideoUrl, isS3Url, getS3KeyFromUrl } from "@/lib/s3"
import { assertLessonAccess } from "@/lib/lesson-access"
import { z } from "zod"

const requestSchema = z.object({
  lessonId: z.string(),
  videoUrl: z.string().url(),
  expirySeconds: z.number().int().min(300).max(86400).optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const body = await req.json()
    const { lessonId, videoUrl, expirySeconds = 3600 } = requestSchema.parse(body)
    
    // Verify user has access to this lesson
    const access = await assertLessonAccess(session.user?.id, lessonId)
    
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    
    // Check if it's an S3 URL
    if (!isS3Url(videoUrl)) {
      return NextResponse.json({ 
        error: "Not an S3 URL",
        signedUrl: videoUrl 
      }, { status: 200 })
    }
    
    // Get S3 key and generate signed URL
    const s3Key = getS3KeyFromUrl(videoUrl)
    const signedUrl = await getSignedVideoUrl(s3Key, expirySeconds)
    
    return NextResponse.json({ 
      signedUrl,
      expirySeconds 
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request", 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error("[Signed Video URL API] Error:", error)
    return NextResponse.json({ 
      error: "Failed to generate signed URL" 
    }, { status: 500 })
  }
}
