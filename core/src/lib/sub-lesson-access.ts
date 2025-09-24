import { prisma } from "@/lib/db"

export interface SubLessonAccessResult {
  allowed: boolean
  subLesson?: {
    id: string
    title: string
    videoUrl: string
    duration: number | null
    moduleId: string
    coursePublished: boolean
  }
}

export async function assertSubLessonAccess(
  userId: string | undefined | null,
  subLessonId: string
): Promise<SubLessonAccessResult> {
  if (!userId) {
    return { allowed: false }
  }

  const subLesson = await prisma.sub_lessons.findUnique({
    where: { id: subLessonId },
    include: {
      modules: {
        include: {
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

  if (!subLesson) {
    return { allowed: false }
  }

  // For now, allow access if the course is published
  // In the future, add purchase/enrollment checks here
  if (!subLesson.modules.courses.published) {
    return { allowed: false }
  }

  return {
    allowed: true,
    subLesson: {
      id: subLesson.id,
      title: subLesson.title,
      videoUrl: subLesson.videoUrl,
      duration: subLesson.duration,
      moduleId: subLesson.modules.id,
      coursePublished: subLesson.modules.courses.published
    }
  }
}
