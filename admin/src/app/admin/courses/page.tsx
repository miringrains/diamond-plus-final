import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function AdminCoursesPage() {
  const session = await auth()
  
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  const courses = await prisma.courses.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { modules: true }
      }
    }
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Courses</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your course content
          </p>
        </div>
        <Link href="/admin/courses/new">
          <Button className="bg-accent hover:bg-[var(--accent-hover)] text-white w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No courses created yet</p>
            <Link href="/admin/courses/new">
              <Button>Create Your First Course</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:border-accent/50 transition-colors">
              <CardHeader>
                <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {course._count.modules} modules
                    </span>
                    {course.published ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/courses/${course.id}`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                    <Link href={`/admin/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    {course.published && (
                      <Link href={`/courses/${course.slug}`}>
                        <Button variant="ghost" size="sm">Preview</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
