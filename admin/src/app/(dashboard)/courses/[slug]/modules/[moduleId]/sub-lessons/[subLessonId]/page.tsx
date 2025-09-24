import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import SubLessonViewWrapper from "./SubLessonViewWrapper"

interface PageProps {
  params: Promise<{
    slug: string
    moduleId: string
    subLessonId: string
  }>
}

export default async function SubLessonPage({ params }: PageProps) {
  const { slug, moduleId, subLessonId } = await params
  const session = await auth()
  
  if (!session || !session.user) {
    notFound()
  }

  // Fetch sub-lesson with all related data
  const subLesson = await prisma.sub_lessons.findUnique({
    where: {
      id: subLessonId,
    },
    include: {
      modules: {
        include: {
          courses: true,
        },
      },
    },
  })

  if (!subLesson || subLesson.modules.courses.slug !== slug) {
    notFound()
  }

  // Fetch all modules for the course navigation
  const allModules = await prisma.modules.findMany({
    where: {
      courseId: subLesson.modules.courseId,
    },
    include: {
      sub_lessons: {
        orderBy: {
          order: 'asc',
        },
        include: {
          progress: {
            where: {
              userId: session.user.id,
            },
            select: {
              completed: true,
              watchTime: true,
              positionSeconds: true,
              durationSeconds: true,
            },
          },
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  })

  // Fetch user's progress for this sub-lesson
  const progress = await prisma.progress.findUnique({
    where: {
      userId_subLessonId: {
        userId: session.user.id,
        subLessonId: subLessonId,
      },
    },
  })

  // Find previous and next sub-lessons
  const currentSubLessonIndex = allModules
    .flatMap(m => m.sub_lessons)
    .findIndex(sl => sl.id === subLessonId)
  
  const allSubLessons = allModules.flatMap(m => m.sub_lessons)
  const previousSubLesson = currentSubLessonIndex > 0 ? allSubLessons[currentSubLessonIndex - 1] : null
  const nextSubLesson = currentSubLessonIndex < allSubLessons.length - 1 ? allSubLessons[currentSubLessonIndex + 1] : null

  return (
    <SubLessonViewWrapper
      subLesson={subLesson}
      module={subLesson.modules}
      course={subLesson.modules.courses}
      allModules={allModules}
      initialProgress={progress ? {
        watchTime: progress.watchTime,
        positionSeconds: progress.positionSeconds || 0,
        completed: progress.completed,
        notes: progress.notes || "",
        lastWatched: progress.lastWatched
      } : null}
      previousSubLesson={previousSubLesson}
      nextSubLesson={nextSubLesson}
    />
  )
}