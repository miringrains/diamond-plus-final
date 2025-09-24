import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const syncSchema = z.object({
  lessonId: z.string(),
  position: z.number().min(0),
  state: z.enum(['playing', 'paused', 'stopped']).optional().default('playing'),
  deviceId: z.string().optional(),
  immediate: z.boolean().optional().default(false),
  playbackSpeed: z.number().optional().default(1.0),
  duration: z.number().optional()
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = syncSchema.parse(body)

    console.log(`[Sync] User ${session.user?.id} updating position: ${data.position}s for lesson ${data.lessonId} (${data.state})`)

    // Get or create progress record
    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: data.lessonId
        }
      },
      create: {
        userId: session.user?.id,
        subLessonId: data.lessonId,
        positionSeconds: data.position,
        durationSeconds: data.duration || 0,
        deviceId: data.deviceId,
        playbackState: data.state,
        playbackSpeed: data.playbackSpeed,
        lastHeartbeat: new Date(),
        lastWatched: new Date()
      },
      update: {
        positionSeconds: data.position,
        durationSeconds: data.duration || undefined,
        deviceId: data.deviceId,
        playbackState: data.state,
        playbackSpeed: data.playbackSpeed,
        lastHeartbeat: new Date(),
        lastWatched: new Date(),
        // Auto-complete if watching > 90% of video
        completed: data.duration && data.position > data.duration * 0.9 ? true : undefined
      }
    })

    // Store heartbeat for analytics (only if immediate or every 30 seconds)
    if (data.immediate || !progress.lastHeartbeat || 
        new Date().getTime() - progress.lastHeartbeat.getTime() > 30000) {
      await prisma.playback_heartbeats.create({
        data: {
          userId: session.user!.id,
          subLessonId: data.lessonId,
          positionSeconds: data.position,
          deviceId: data.deviceId
        }
      })
    }

    // Return current progress with conflict resolution info
    return NextResponse.json({
      success: true,
      progress: {
        positionSeconds: progress.positionSeconds,
        completed: progress.completed,
        lastWatched: progress.lastWatched,
        deviceId: progress.deviceId,
        playbackState: progress.playbackState
      }
    })
  } catch (error) {
    console.error("[Sync] Error updating progress:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to sync progress" }, { status: 500 })
  }
}

// Get sync status for conflict resolution
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get('lessonId')
    
    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID required" }, { status: 400 })
    }

    const progress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: lessonId
        }
      }
    })

    if (!progress) {
      return NextResponse.json({ progress: null })
    }

    return NextResponse.json({
      progress: {
        positionSeconds: progress.positionSeconds,
        completed: progress.completed,
        lastWatched: progress.lastWatched,
        deviceId: progress.deviceId,
        playbackState: progress.playbackState,
        playbackSpeed: progress.playbackSpeed
      }
    })
  } catch (error) {
    console.error("[Sync] Error fetching progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}
