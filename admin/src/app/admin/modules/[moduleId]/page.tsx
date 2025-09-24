import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SubLessonManager } from "@/components/admin/sub-lesson-manager"

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>
}) {
  const { moduleId } = await params
  const session = await auth()
  
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  const module = await prisma.modules.findUnique({
    where: { id: moduleId },
    include: {
      courses: true,
      sub_lessons: {
        orderBy: { order: "asc" }
      }
    }
  })

  if (!module) {
    notFound()
  }

  return (
    <>
      <Link 
        href={`/admin/courses/${module.courses.id}`} 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {module.courses.title}
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{module.title}</h1>
        {module.description && (
          <p className="text-muted-foreground mt-2">{module.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-4">
          Course: <Link href={`/admin/courses/${module.courses.id}`} className="hover:underline">
            {module.courses.title}
          </Link>
        </p>
      </div>

      <SubLessonManager 
        moduleId={module.id} 
        initialSubLessons={module.sub_lessons}
      />
    </>
  )
}
// Force dynamic rendering
export const dynamic = 'force-dynamic'
