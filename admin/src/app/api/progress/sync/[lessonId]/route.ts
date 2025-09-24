import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { addSpanEvent } from "@/lib/telemetry"
import { assertLessonAccess } from "@/lib/lesson-access"

const syncProgressSchema = z.object({
  localPosition: z.number().int().min(0).max(36000).optional(),
  localTimestamp: z.number().optional(), // Unix timestamp
  serverPosition: z.number().int().min(0).max(36000).optional(),
})

// Sync progress between local and server storage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lessonId } = await params
    const body = await req.json()
    const { localPosition, localTimestamp, serverPosition } = syncProgressSchema.parse(body)

    // Verify lesson access
    const access = await assertLessonAccess(session.user.id, lessonId)
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason === 'not_found' ? "Lesson not found" : "Access denied" },
        { status: access.reason === 'not_found' ? 404 : 403 }
      )
    }

    // Get current server progress
    const currentProgress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user.id,
          subLessonId: lessonId
        }
      }
    })

    // Determine the most recent position
    let syncedPosition = 0
    let source = 'none'

    if (currentProgress?.positionSeconds && localPosition) {
      // Compare server and local positions
      const serverTime = currentProgress.updatedAt.getTime()
      const localTime = localTimestamp || Date.now()
      
      // Use whichever is more recent
      if (localTime > serverTime) {
        syncedPosition = localPosition
        source = 'local'
      } else {
        syncedPosition = currentProgress.positionSeconds
        source = 'server'
      }
    } else if (currentProgress?.positionSeconds) {
      syncedPosition = currentProgress.positionSeconds
      source = 'server'
    } else if (localPosition) {
      syncedPosition = localPosition
      source = 'local'
    }

    // Clamp to lesson duration if available
    const lesson = access.lesson!
    if (lesson.duration && syncedPosition >= lesson.duration - 1) {
      syncedPosition = Math.max(0, lesson.duration - 1)
    }

    addSpanEvent('progress.sync', {
      lessonId,
      userId: session.user.id,
      localPosition,
      serverPosition: currentProgress?.positionSeconds,
      syncedPosition,
      source
    })

    return NextResponse.json({
      success: true,
      position: syncedPosition,
      source,
      serverUpdatedAt: currentProgress?.updatedAt || null
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error syncing progress:", error)
    return NextResponse.json(
      { error: "Failed to sync progress" },
      { status: 500 }
    )
  }
}
