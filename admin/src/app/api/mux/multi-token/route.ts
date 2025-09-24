import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createPlaybackToken, isSignedPlaybackEnabled } from "@/lib/mux"
import { z } from "zod"
import { assertLessonAccess } from "@/lib/lesson-access"
import { prisma } from "@/lib/db"

const requestSchema = z.object({
  playbackId: z.string().min(1),
  lessonId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const params = requestSchema.parse(body)

    // Verify user has access to this lesson
    const access = await assertLessonAccess(session.user.id, params.lessonId)
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if signed playback is enabled
    if (!isSignedPlaybackEnabled()) {
      return NextResponse.json({ 
        error: "Signed playback is not enabled" 
      }, { status: 400 })
    }

    // Verify the sub-lesson has the correct playback ID and policy
    const lesson = await prisma.sub_lessons.findUnique({
      where: { id: params.lessonId },
      select: { 
        muxPlaybackId: true, 
        muxPolicy: true,
        muxReadyAt: true 
      }
    })

    if (!lesson || lesson.muxPlaybackId !== params.playbackId) {
      return NextResponse.json({ 
        error: "Invalid playback ID for this lesson" 
      }, { status: 400 })
    }

    if (lesson.muxPolicy !== "signed") {
      return NextResponse.json({ 
        error: "This lesson does not require signed playback" 
      }, { status: 400 })
    }

    if (!lesson.muxReadyAt) {
      return NextResponse.json({ 
        error: "Video is still processing" 
      }, { status: 425 })
    }

    // Create signed tokens for all resource types
    const videoToken = createPlaybackToken(params.playbackId, {
      type: "video",
      viewerId: session.user.id
    })

    const storyboardToken = createPlaybackToken(params.playbackId, {
      type: "storyboard",
      viewerId: session.user.id
    })

    const thumbnailToken = createPlaybackToken(params.playbackId, {
      type: "thumbnail",
      viewerId: session.user.id
    })

    const ttl = parseInt(process.env.MUX_SIGNED_TTL_SECONDS || "3600", 10)

    return NextResponse.json({ 
      tokens: {
        playback: videoToken,
        storyboard: storyboardToken,
        thumbnail: thumbnailToken
      },
      expiresIn: ttl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
    })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ 
        error: "Invalid request parameters" 
      }, { status: 400 })
    }
    
    console.error("[Mux Multi-Token] Error:", error)
    return NextResponse.json({ 
      error: "Failed to create playback tokens" 
    }, { status: 500 })
  }
}
