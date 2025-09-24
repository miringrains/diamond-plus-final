import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"


export default async function AdminDashboard() {
  const session = await auth()
  
  // Double-check admin access (middleware should handle this, but extra safety)
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  // Get statistics
  const [userCount, courseCount, lessonCount] = await Promise.all([
    prisma.users.count({ where: { role: "USER" } }),
    prisma.courses.count(),
    prisma.sub_lessons.count(),
  ])

  const recentUsers = await prisma.users.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      ghlContactId: true,
      createdAt: true,
      emailVerified: true,
    },
  })

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8 md:mb-10">
        <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-sidebar border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sidebar-foreground/70">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sidebar-foreground">{userCount}</div>
            <p className="text-xs text-sidebar-foreground/70">
              Registered students
            </p>
          </CardContent>
        </Card>

        <Card className="bg-sidebar border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sidebar-foreground/70">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sidebar-foreground">{courseCount}</div>
            <p className="text-xs text-sidebar-foreground/70">
              Published courses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-sidebar border-sidebar-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sidebar-foreground/70">Total Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sidebar-foreground">{lessonCount}</div>
            <p className="text-xs text-sidebar-foreground/70">
              Video lessons
            </p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 md:mb-10">
        <Card className="bg-sidebar border-sidebar-border">
        <CardHeader>
          <CardTitle className="text-sidebar-foreground">Quick Actions</CardTitle>
          <CardDescription className="text-sidebar-foreground/70">Manage your course platform</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/admin/courses">
            <Button className="bg-primary text-primary-foreground transition-all duration-200 hover:opacity-90">
              Manage Courses
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 transition-all duration-200">
              View Users
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 transition-all duration-200">
              Settings
            </Button>
          </Link>
        </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <div className="mb-8 md:mb-10">
        <Card className="bg-sidebar border-sidebar-border">
        <CardHeader>
          <CardTitle className="text-sidebar-foreground">Recent Users</CardTitle>
          <CardDescription className="text-sidebar-foreground/70">Latest student registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentUsers.length === 0 ? (
              <p className="text-sidebar-foreground/70">No users registered yet</p>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-sidebar-border pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sidebar-foreground">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Unnamed User"}
                    </p>
                    <p className="text-sm text-sidebar-foreground/70">
                      {user.email}
                    </p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-sidebar-foreground/50">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      {user.emailVerified && (
                        <span className="text-xs text-green-400">
                          ✓ Verified
                        </span>
                      )}
                      {user.ghlContactId && (
                        <span className="text-xs text-primary">
                          GHL Synced
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-200">
                      View
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
