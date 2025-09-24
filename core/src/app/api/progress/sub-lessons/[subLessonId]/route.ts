import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { addSpanEvent } from "@/lib/telemetry"
import { assertSubLessonAccess } from "@/lib/sub-lesson-access"

const updateProgressSchema = z.object({
  watchTime: z.number().int().min(0).max(36000).optional(), // Max 10 hours
  positionSeconds: z.number().int().min(0).max(36000).optional(),
  durationSeconds: z.number().int().min(0).max(36000).optional(),
  completed: z.boolean().optional()
})

// GET progress for a specific sub-lesson
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subLessonId: string }> }
) {
  try {
    const session = await auth()
    const { subLessonId } = await params
    
    if (!session) {
      console.error(`[Progress GET] Auth failed for sub-lesson ${subLessonId}`)
      console.log('[Progress GET] Headers:', {
        cookie: req.headers.get('cookie')?.substring(0, 100),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
      })
      addSpanEvent('auth.failed', {
        endpoint: 'progress.get',
        subLessonId,
        hasAuthHeader: !!req.headers.get('authorization'),
        hasCookie: !!req.headers.get('cookie'),
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const progress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId
        }
      },
      include: {
        sub_lessons: {
          select: {
            id: true,
            duration: true
          }
        }
      }
    })

    if (!progress) {
      return NextResponse.json({
        watchTime: 0,
        positionSeconds: 0,
        durationSeconds: 0,
        completed: false,
        lastWatched: null
      })
    }

    return NextResponse.json({
      watchTime: progress.watchTime,
      positionSeconds: progress.positionSeconds || 0,
      durationSeconds: progress.durationSeconds || progress.sub_lessons?.duration || 0,
      completed: progress.completed,
      lastWatched: progress.lastWatched,
      notes: progress.notes
    })
  } catch (error) {
    console.error("[Progress GET] Error:", error)
    addSpanEvent('progress.get.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subLessonId: (await params).subLessonId,
    })
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    )
  }
}

// Update progress (supports both PUT and POST for beacon)
async function updateProgress(
  req: NextRequest,
  params: { subLessonId: string }
) {
  try {
    const session = await auth()
    if (!session) {
      console.error(`[Progress UPDATE] Auth failed for sub-lesson ${params.subLessonId}`)
      console.log('[Progress UPDATE] Headers:', {
        cookie: req.headers.get('cookie')?.substring(0, 100),
        contentType: req.headers.get('content-type'),
        origin: req.headers.get('origin'),
        method: req.method
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse body based on content type
    let body
    const contentType = req.headers.get('content-type') || ''
    

    
    if (contentType.includes('text/plain') || req.method === 'POST') {
      // Handle sendBeacon which sends as POST with text/plain or application/x-www-form-urlencoded
      const text = await req.text()
      try {
        body = JSON.parse(text)
      } catch {
        console.error('[Progress UPDATE] Failed to parse beacon body:', text.substring(0, 100))
        return NextResponse.json({ error: "Invalid JSON in body" }, { status: 400 })
      }
    } else {
      body = await req.json()
    }
    
    const data = updateProgressSchema.parse(body)
    
    // Verify access to the sub-lesson
    const access = await assertSubLessonAccess(session.user?.id, params.subLessonId)
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Use positionSeconds as watchTime if provided
    const watchTime = data.positionSeconds ?? data.watchTime ?? 0

    // Check if should mark as completed
    const shouldComplete = data.completed || 
      (data.durationSeconds && watchTime >= data.durationSeconds * 0.9) || false
    


    // Get existing progress to prevent overwriting with older data
    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: params.subLessonId
        }
      }
    })
    
    // Only update if the new position is greater than existing (or if no existing progress)
    const shouldUpdate = !existingProgress || 
      (data.positionSeconds !== undefined && data.positionSeconds >= (existingProgress.positionSeconds || 0)) ||
      shouldComplete // Always update if marking as completed
    
    if (!shouldUpdate) {

      return NextResponse.json({
        success: true,
        progress: {
          watchTime: existingProgress!.watchTime,
          positionSeconds: existingProgress!.positionSeconds,
          completed: existingProgress!.completed
        }
      })
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: params.subLessonId
        }
      },
      create: {
        userId: session.user!.id,
        subLessonId: params.subLessonId,
        watchTime,
        positionSeconds: data.positionSeconds,
        durationSeconds: data.durationSeconds,
        completed: shouldComplete,
        lastWatched: new Date()
      },
      update: {
        watchTime,
        positionSeconds: data.positionSeconds,
        durationSeconds: data.durationSeconds,
        completed: shouldComplete || existingProgress?.completed || false, // Don't unmark completed
        lastWatched: new Date()
      }
    })

    addSpanEvent('progress.updated', {
      subLessonId: params.subLessonId,
      userId: session.user!.id,
      watchTime,
      completed: shouldComplete,
      method: req.method
    })
    
    console.log('[Progress UPDATE] Success:', {
      subLessonId: params.subLessonId,
      positionSeconds: progress.positionSeconds,
      watchTime: progress.watchTime,
      completed: progress.completed,
      method: req.method
    })

    return NextResponse.json({
      success: true,
      progress: {
        watchTime: progress.watchTime,
        positionSeconds: progress.positionSeconds,
        completed: progress.completed
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("[Progress UPDATE] Error:", error)
    addSpanEvent('progress.update.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subLessonId: params.subLessonId,
    })
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ subLessonId: string }> }
) {
  const params = await props.params
  return updateProgress(req, params)
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ subLessonId: string }> }
) {
  const params = await props.params
  return updateProgress(req, params)
}
