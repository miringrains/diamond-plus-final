import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Video, Trash2 } from "lucide-react"
import { ModuleManager } from "@/components/admin/module-manager"

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const session = await auth()
  
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  const course = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          sub_lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              duration: true,
              muxReadyAt: true,
              muxError: true,
              thumbnailUrl: true,
              muxAssetId: true,
              muxPlaybackId: true,
              muxPolicy: true
            }
          }
        }
      }
    }
  })

  if (!course) {
    notFound()
  }

  return (
    <>
      <Link href="/admin/courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
      </Link>

      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground mt-2">{course.description}</p>
            <div className="flex items-center gap-4 mt-4">
              {course.published ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  Draft
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Slug: <code className="px-2 py-1 bg-muted rounded">{course.slug}</code>
              </span>
            </div>
          </div>
          <Link href={`/admin/courses/${course.id}/edit`}>
                          <Button className="bg-accent hover:bg-[var(--accent-hover)] text-white">
              Edit Course
            </Button>
          </Link>
        </div>
      </div>

      <ModuleManager courseId={course.id} initialModules={course.modules} />
    </>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
