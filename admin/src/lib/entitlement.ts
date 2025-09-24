import { prisma } from "@/lib/db"
import { tracer, spanAttrBase } from "@/lib/otel"
import { SpanKind } from '@opentelemetry/api'

export interface EntitlementResult {
  ok: boolean
  reason: string
  courseId?: string
}

/**
 * Check if a user can access a course
 * This is a read-only check for now - just logging, not enforcing
 */
export async function canAccessCourse({
  userId,
  courseSlug,
  userRole
}: {
  userId: string
  courseSlug: string
  userRole?: string
}): Promise<EntitlementResult> {
  const span = tracer.startSpan('entitlement.check', {
    kind: SpanKind.INTERNAL,
    attributes: {
      ...spanAttrBase({ userId, slug: courseSlug }),
      'user.role': userRole || 'USER'
    }
  })

  try {
    // First, check if course exists and get its ID
    const course = await prisma.courses.findUnique({
      where: { slug: courseSlug },
      select: {
        id: true,
        published: true,
        title: true
      }
    })

    if (!course) {
      span.setAttributes({
        'entitlement.result': 'deny',
        'entitlement.reason': 'course_not_found'
      })
      return {
        ok: false,
        reason: 'course_not_found'
      }
    }

    span.setAttributes({
      'course.id': course.id,
      'course.published': course.published,
      'course.title': course.title
    })

    // Admin can always access
    if (userRole === 'ADMIN') {
      span.setAttributes({
        'entitlement.result': 'allow',
        'entitlement.reason': 'admin_access',
        'user.is_admin': true
      })
      return {
        ok: true,
        reason: 'admin_access',
        courseId: course.id
      }
    }

    // Check if course is published
    if (!course.published) {
      span.setAttributes({
        'entitlement.result': 'deny',
        'entitlement.reason': 'course_unpublished'
      })
      return {
        ok: false,
        reason: 'course_unpublished',
        courseId: course.id
      }
    }

    // Simple Netflix-style access model:
    // - All logged-in users can access any published course
    // - Never use Progress as an access gate
    // - No enrollment system
    span.setAttributes({
      'user.enrolled': 'netflix_model',
      'access.model': 'all_published_courses_available',
      'user.logged_in': true
    })

    const result = {
      ok: true,
      reason: 'published_course_available',
      courseId: course.id
    }

    span.setAttributes({
      'entitlement.result': result.ok ? 'allow' : 'deny',
      'entitlement.reason': result.reason
    })

    return result

  } catch (error) {
    span.recordException(error as Error)
    span.setAttributes({
      'entitlement.result': 'error',
      'entitlement.error': (error as Error).message
    })
    return {
      ok: false,
      reason: 'error_checking_access'
    }
  } finally {
    span.end()
  }
}
