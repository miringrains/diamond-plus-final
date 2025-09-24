import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { addSpanEvent } from "@/lib/telemetry"

export type AccessDeniedReason = 
  | 'no_session'
  | 'not_enrolled' 
  | 'unpublished'
  | 'not_found'

export interface LessonAccessResult {
  allowed: boolean
  reason?: AccessDeniedReason
  lesson?: {
    id: string
    title: string
    videoUrl: string | null
    duration: number | null
    courseId: string
    coursePublished: boolean
  }
}

/**
 * Unified access control for lessons - used by both page and API routes
 * Ensures consistent allow/deny across the system
 */
export async function assertLessonAccess(
  userId: string | undefined,
  lessonId: string
): Promise<LessonAccessResult> {
  // No session = no access
  if (!userId) {
    addSpanEvent('lesson.access.denied', { 
      lessonId, 
      reason: 'no_session' 
    })
    return { allowed: false, reason: 'no_session' }
  }

  // Get user to check role
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) {
    addSpanEvent('lesson.access.denied', { 
      lessonId, 
      reason: 'no_session',
      detail: 'user_not_found' 
    })
    return { allowed: false, reason: 'no_session' }
  }

  // Fetch sub-lesson with module and course info
  const lesson = await prisma.sub_lessons.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      duration: true,
      modules: {
        select: {
          courses: {
            select: {
              id: true,
              published: true
            }
          }
        }
      }
    }
  })

  if (!lesson) {
    addSpanEvent('lesson.access.denied', { 
      lessonId, 
      userId,
      reason: 'not_found' 
    })
    return { allowed: false, reason: 'not_found' }
  }

  // Admins can always access
  if (user.role === 'ADMIN') {
    addSpanEvent('lesson.access.allowed', { 
      lessonId, 
      userId,
      reason: 'admin_access' 
    })
    return { 
      allowed: true, 
      lesson: {
        id: lesson.id,
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        duration: lesson.duration,
        courseId: lesson.modules.courses.id,
        coursePublished: lesson.modules.courses.published
      }
    }
  }

  // For regular users, course must be published
  if (!lesson.modules.courses.published) {
    addSpanEvent('lesson.access.denied', { 
      lessonId, 
      userId,
      reason: 'unpublished' 
    })
    return { allowed: false, reason: 'unpublished' }
  }

  // Netflix model - all published courses available to logged-in users
  addSpanEvent('lesson.access.allowed', { 
    lessonId, 
    userId,
    reason: 'published_course' 
  })
  
  return { 
    allowed: true,
    lesson: {
      id: lesson.id,
      title: lesson.title, 
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      courseId: lesson.modules.courses.id,
      coursePublished: lesson.modules.courses.published
    }
  }
}
