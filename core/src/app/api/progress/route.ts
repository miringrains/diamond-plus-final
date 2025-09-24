import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { traceAsync, addSpanEvent } from "@/lib/telemetry"
import { spanAttrBase } from "@/lib/otel"

// Validation schema
const progressSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  watchTime: z.number().int().min(0).max(36000), // Max 10 hours
  positionSeconds: z.number().int().min(0).max(36000).optional(),
  durationSeconds: z.number().int().min(0).max(36000).optional(),
  completed: z.boolean().optional()
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const baseAttrs = spanAttrBase({ userId: session?.user?.id })
  
  return traceAsync('api.progress', async () => {
    try {
      addSpanEvent('auth.check', {
        'session.present': !!session,
        'guard.result': session ? 'allow' : 'deny',
        ...baseAttrs
      })
      
      if (!session || !session.user) {
        addSpanEvent('auth.failed', {
          reason: 'no_session',
          ...baseAttrs
        })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await req.json()
      const validatedData = progressSchema.parse(body)
      const { lessonId, watchTime, positionSeconds, durationSeconds, completed } = validatedData
      
      // Add telemetry attributes
      addSpanEvent('progress.data_received', {
        lessonId,
        watchTime,
        positionSeconds,
        durationSeconds,
        completed
      })

    // Verify sub-lesson exists and user has access
    const subLesson = await prisma.sub_lessons.findUnique({
      where: { id: lessonId },
      include: {
        modules: {
          include: {
            courses: {
              select: { published: true }
            }
          }
        }
      }
    })

    if (!subLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if course is published or user is admin
    if (!subLesson.modules.courses.published && session.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Auto-complete if position is >= 90% of duration
    let shouldComplete = completed
    if (!shouldComplete && positionSeconds && durationSeconds && positionSeconds >= durationSeconds * 0.9) {
      shouldComplete = true
      addSpanEvent('progress.auto_complete_triggered', {
        lessonId,
        positionSeconds,
        durationSeconds,
        percentage: (positionSeconds / durationSeconds) * 100
      })
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user!.id,
          subLessonId: lessonId
        }
      },
      update: {
        watchTime: watchTime,
        positionSeconds: positionSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: shouldComplete !== undefined ? shouldComplete : undefined,
        lastWatched: new Date()
      },
      create: {
        userId: session.user?.id,
        subLessonId: lessonId,
        watchTime: watchTime,
        positionSeconds: positionSeconds || 0,
        durationSeconds: durationSeconds || 0,
        completed: shouldComplete || false,
        lastWatched: new Date()
      }
    })
    
      addSpanEvent('progress.saved_successfully', {
        lessonId,
        userId: session.user?.id,
        completed: shouldComplete,
        watchTime
      })

      return NextResponse.json({ ok: true })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid data", details: error.issues },
          { status: 400 }
        )
      }
      console.error("[Progress API] Error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }, {
    'http.method': 'POST',
    'http.route': '/api/progress',
    'user.id': req.headers.get('x-user-id') || 'unknown'
  })
}