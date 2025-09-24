import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"

interface LessonPageProps {
  params: Promise<{ id: string }>
}

// This page exists for backwards compatibility
// It redirects old lesson URLs to the new sub-lesson structure
export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params
  
  // Find the sub-lesson and get its module/course info
  const subLesson = await prisma.sub_lessons.findUnique({
    where: { id },
    include: {
      modules: {
        include: {
          courses: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  })
  
  if (!subLesson) {
    // If not found, redirect to dashboard
    redirect("/dashboard")
  }
  
  // Redirect to the new URL structure
  redirect(`/courses/${subLesson.modules.courses.slug}/modules/${subLesson.modules.id}/sub-lessons/${subLesson.id}`)
}