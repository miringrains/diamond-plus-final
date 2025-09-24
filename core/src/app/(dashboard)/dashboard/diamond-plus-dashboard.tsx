import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Award, BookOpen, Briefcase, Home, Megaphone, TrendingUp, Users, Brain } from "lucide-react"
import Link from "next/link"

// Map module names to icons
const moduleIcons: Record<string, any> = {
  'Foundation': Home,
  'Lead Generation': Users,
  'Sales Mastery': TrendingUp,
  'Listing Presentations': Briefcase,
  'Marketing': Megaphone,
  'Negotiation': Award,
  'Systems & Scaling': BookOpen,
  'Mindset & Growth': Brain,
}

export default async function DiamondPlusDashboard() {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  // Get all modules with their lessons
  const modules = await prisma.modules.findMany({
    include: {
      sub_lessons: {
        select: {
          id: true,
        },
      },
      courses: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  })

  // Get user's progress for each module
  const modulesWithProgress = await Promise.all(
    modules.map(async (module) => {
      const totalLessons = module.sub_lessons.length
      
      const completedLessons = await prisma.progress.count({
        where: {
          userId: session.user!.id,
          sub_lessons: {
            moduleId: module.id,
          },
          completed: true,
        },
      })

      const progressPercentage = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0

      return {
        ...module,
        totalLessons,
        completedLessons,
        progressPercentage,
      }
    })
  )

  // Get welcome course videos
  const welcomeCourseVideos = await prisma.welcome_course_videos.findMany({
    where: {
      published: true,
    },
    orderBy: {
      order: 'asc',
    },
    take: 3,
  })

  // Get recent podcasts
  const recentPodcasts = await prisma.podcasts.findMany({
    where: {
      published: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: 3,
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session.user.name || 'Agent'}!</h1>
        <p className="text-muted-foreground">Continue your journey to real estate mastery with Diamond Plus</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Progress</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                modulesWithProgress.reduce((acc, m) => acc + m.progressPercentage, 0) / 
                modulesWithProgress.length
              )}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall completion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modulesWithProgress.reduce((acc, m) => acc + m.completedLessons, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {modulesWithProgress.reduce((acc, m) => acc + m.totalLessons, 0)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules Started</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {modulesWithProgress.filter(m => m.progressPercentage > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {modulesWithProgress.length} modules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Course Videos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Welcome Course</h2>
          <Button variant="outline" asChild>
            <Link href="/welcome-course">View All</Link>
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">
          Start your journey with our comprehensive introduction modules
        </p>
        
        {welcomeCourseVideos.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {welcomeCourseVideos.slice(0, 3).map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                  {video.description && (
                    <CardDescription className="line-clamp-2">
                      {video.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>Module {video.order}</span>
                    {video.duration && (
                      <span>{Math.floor(video.duration / 60)} minutes</span>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/welcome-course/${video.id}`}>
                      Watch Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Welcome course coming soon</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Training Modules */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Training Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modulesWithProgress.map((module) => {
            const Icon = moduleIcons[module.title] || BookOpen
            return (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {module.completedLessons}/{module.totalLessons} lessons
                    </span>
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={module.progressPercentage} className="mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {module.progressPercentage}% complete
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/courses/diamond-plus-training`}>
                      {module.progressPercentage > 0 ? 'Continue' : 'Start'} Module
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Podcasts */}
      {recentPodcasts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Latest Podcasts</h2>
            <Button variant="outline" asChild>
              <Link href="/podcasts">View All</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recentPodcasts.map((podcast) => (
              <Card key={podcast.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{podcast.title}</CardTitle>
                  {podcast.description && (
                    <CardDescription className="line-clamp-3">
                      {podcast.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/podcasts">Listen Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
