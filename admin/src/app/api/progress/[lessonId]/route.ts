import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { addSpanEvent } from "@/lib/telemetry"
import { assertLessonAccess } from "@/lib/lesson-access"

const updateProgressSchema = z.object({
  watchTime: z.number().int().min(0).max(36000), // Max 10 hours
  positionSeconds: z.number().int().min(0).max(36000).optional(),
  durationSeconds: z.number().int().min(0).max(36000).optional(),
  completed: z.boolean().optional()
})

// GET progress for a specific lesson
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth()
    const { lessonId } = await params
    
    if (!session) {
      console.error(`[Progress GET] Auth failed for lesson ${lessonId}`)
      console.log('[Progress GET] Headers:', {
        cookie: req.headers.get('cookie')?.substring(0, 100),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
      })
      addSpanEvent('auth.failed', {
        endpoint: 'progress.get',
        lessonId,
        hasAuthHeader: !!req.headers.get('authorization'),
        hasCookie: !!req.headers.get('cookie'),
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Note: lessonId is actually subLessonId in the new structure
    const progress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: lessonId
        }
      },
      include: {
        sub_lessons: {
          select: {
            id: true,
            title: true,
            duration: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      progress: progress || null
    })
  } catch (error) {
    console.error("Error fetching lesson progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    )
  }
}

// Update progress for a specific lesson
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth()
    
      if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

    const { lessonId } = await params
    const body = await req.json()
    const validatedData = updateProgressSchema.parse(body)

    // Verify lesson exists and user has access
    // Note: assertLessonAccess handles sub-lessons internally
    const access = await assertLessonAccess(session.user?.id, lessonId)
    
    if (!access.allowed) {
      const status = access.reason === 'not_found' ? 404 : 403
      const message = access.reason === 'not_found' ? "Lesson not found" : "Access denied"
      return NextResponse.json(
        { error: message },
        { status }
      )
    }
    
    const lesson = access.lesson!

    // Auto-complete if watch time is >= 90% of duration
    let shouldComplete = validatedData.completed
    const positionSeconds = validatedData.positionSeconds || validatedData.watchTime
    const durationSeconds = validatedData.durationSeconds || lesson.duration || 0
    
    if (!shouldComplete) {
      // Check both watchTime and positionSeconds for completion
      if (lesson.duration && validatedData.watchTime >= lesson.duration * 0.9) {
        shouldComplete = true
      } else if (positionSeconds && durationSeconds && positionSeconds >= durationSeconds * 0.9) {
        shouldComplete = true
      }
    }

    // Update or create progress
    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: lessonId
        }
      },
      update: {
        watchTime: Math.max(validatedData.watchTime, 0),
        positionSeconds: positionSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: shouldComplete,
        lastWatched: new Date()
      },
      create: {
        
        userId: session.user!.id,
        subLessonId: lessonId,
        watchTime: Math.max(validatedData.watchTime, 0),
        positionSeconds: positionSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: shouldComplete || false,
        lastWatched: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      progress
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating lesson progress:", error)
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    )
  }
}

// Update progress via POST (for navigator.sendBeacon compatibility)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lessonId } = await params
    
    // Parse body based on content type
    let body
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('text/plain')) {
      // Handle sendBeacon which sends text/plain
      const text = await req.text()
      try {
        body = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: "Invalid JSON in body" }, { status: 400 })
      }
    } else {
      body = await req.json()
    }
    
    // For beacon calls, we just need to update position
    const position = body.positionSeconds || body.position || 0
    const duration = body.durationSeconds || body.duration || 0
    
    // For now we'll try to get lesson duration from the sub-lesson record if exists
    const subLesson = await prisma.sub_lessons.findUnique({
      where: { id: lessonId },
      select: { duration: true }
    })
    
    // Check if we should mark as completed
    let completed = false
    if (subLesson?.duration && position >= subLesson.duration * 0.9) {
      completed = true
    }
    
    // Update progress
    await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: lessonId
        }
      },
      update: {
        positionSeconds: position,
        durationSeconds: duration || subLesson?.duration || 0,
        completed: completed || undefined,
        lastWatched: new Date()
      },
      create: {
        userId: session.user!.id,
        subLessonId: lessonId,
        positionSeconds: position,
        durationSeconds: duration || subLesson?.duration || 0,
        watchTime: position, // Use position as initial watch time
        completed: completed,
        lastWatched: new Date()
      }
    })
    
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error("[Progress POST] Error:", error)
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    )
  }
}