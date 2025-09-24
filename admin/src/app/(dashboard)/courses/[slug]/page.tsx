import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

import Link from "next/link"
import { PlayCircle, CheckCircle, Clock, ChevronRight } from "lucide-react"
import { formatTime } from "@/lib/plyr"
import { traceAsync, addSpanEvent } from "@/lib/telemetry"
import { spanAttrBase } from "@/lib/otel"
import { canAccessCourse } from "@/lib/entitlement"
import { cn } from "@/lib/utils"

interface CoursePageProps {
  params: Promise<{ slug: string }>
}

// Force dynamic rendering to prevent stale session caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params
  
  // First get session to have userId for base attrs
  let session = await auth()
  
  // Retry session fetch once if null (edge/server mismatch)
  if (!session) {
    console.log('[Course Page] Session null on first attempt, retrying...')
    session = await auth()
  }
  
  const baseAttrs = spanAttrBase({ 
    userId: session?.user?.id, 
    slug 
  })
  
  return traceAsync('course.page.load', async () => {
    // Add initial attributes
    addSpanEvent('page.start', { slug })
    
    // Check session
    addSpanEvent('session.check.begin', {})
    addSpanEvent('session.check.complete', {
      'session.present': !!session,
      'user.role': session?.user?.role || 'none'
    })
    
    if (!session || !session.user) {
      addSpanEvent('session.redirect', { to: '/login', reason: 'no_session' })
      redirect("/login")
    }
    
    // Check entitlement
    addSpanEvent('entitlement.begin', { ...baseAttrs })
    const entitlement = await canAccessCourse({
      userId: session.user.id,
      courseSlug: slug,
      userRole: session.user.role
    })
    
    addSpanEvent('entitlement.complete', {
      'entitlement.result': entitlement.ok ? 'allow' : 'deny',
      'entitlement.reason': entitlement.reason,
      'course.id': entitlement.courseId,
      ...baseAttrs
    })
    
    // For now, we're not enforcing entitlement, just logging
    // Later we would do: if (!entitlement.ok) { redirect("/dashboard") }
    
    // Add cache policy event
    addSpanEvent('cache.policy', {
      policy: 'dynamic',
      reason: 'session_dependent',
      ...baseAttrs
    })

  // Fetch course with modules
  const course = await prisma.courses.findUnique({
    where: { 
      slug,
      // Allow admins to see unpublished courses
      ...(session.user.role !== 'ADMIN' && { published: true })
    },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          sub_lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              videoUrl: true,
              duration: true,
              order: true,
              thumbnailUrl: true,
              muxPlaybackId: true,
              muxAssetId: true,
              muxPolicy: true,
              muxReadyAt: true,
              muxError: true,
              progress: {
                where: { userId: session.user.id },
                select: {
                  completed: true,
                  watchTime: true,
                  positionSeconds: true,
                  durationSeconds: true,
                  lastWatched: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!course) {
    notFound()
  }

  // Calculate course progress based on actual watch time
  const allSubLessons = course.modules.flatMap(module => module.sub_lessons)
  const totalSubLessons = allSubLessons.length
  
  let totalProgress = 0
  for (const subLesson of allSubLessons) {
    if (subLesson.progress && subLesson.progress.length > 0) {
      const progress = subLesson.progress[0]
      if (progress.completed) {
        totalProgress += 100
      } else if (subLesson.duration && subLesson.duration > 0) {
        // Use positionSeconds if available, otherwise watchTime
        const position = progress.positionSeconds ?? progress.watchTime ?? 0
        const percentage = Math.min((position / subLesson.duration) * 100, 100)
        totalProgress += percentage
      }
    }
  }
  
  const progressPercentage = totalSubLessons > 0 
    ? Math.round(totalProgress / totalSubLessons)
    : 0

  // Find next sub-lesson to watch
  let nextSubLesson = null
  let nextModule = null
  for (const module of course.modules) {
    const incompleteSubLesson = module.sub_lessons.find(
      sl => !sl.progress || sl.progress.length === 0 || !sl.progress[0]?.completed
    )
    if (incompleteSubLesson) {
      nextSubLesson = incompleteSubLesson
      nextModule = module
      break
    }
  }
  if (!nextSubLesson && course.modules.length > 0 && course.modules[0].sub_lessons.length > 0) {
    nextModule = course.modules[0]
    nextSubLesson = course.modules[0].sub_lessons[0]
  }

  // Calculate total course duration
  const totalDuration = allSubLessons.reduce(
    (sum, subLesson) => sum + (subLesson.duration || 0), 
    0
  )

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground">{course.title}</span>
      </nav>

      {/* Course Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">{course.title}</h1>
        {course.description && (
          <p className="mb-4 text-muted-foreground">{course.description}</p>
        )}
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlayCircle className="h-4 w-4" />
            <span>{totalSubLessons} lessons</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Progress value={progressPercentage} className="w-32 h-2" />
            <span className="text-muted-foreground">{progressPercentage}% complete</span>
          </div>
        </div>

        {/* Continue/Start Button */}
        {nextSubLesson && nextModule && (
          <Link href={`/courses/${course.slug}/modules/${nextModule.id}/sub-lessons/${nextSubLesson.id}`}>
            <Button 
              className="mt-4 bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90"
            >
              {progressPercentage > 0 ? "Continue Course" : "Start Course"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Video Lessons List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Video Lessons</h2>
        
        {course.modules.filter(m => m.sub_lessons.length > 0).map((module) => {
          return (
            <div key={module.id} className="space-y-4">
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {module.sub_lessons.map((lesson, index) => {
          const progress = lesson.progress && lesson.progress.length > 0 ? lesson.progress[0] : null
          const isCompleted = progress?.completed || false
          const position = progress?.positionSeconds ?? progress?.watchTime ?? 0
          const hasStarted = position > 0
          const watchPercentage = lesson.duration && position > 0
            ? Math.min(Math.round((position / lesson.duration) * 100), 100)
            : 0

          return (
            <Card 
              key={lesson.id} 
              className={cn(
                "overflow-hidden transition-all duration-200 hover:border-sidebar-border bg-sidebar border p-0 flex flex-col",
                isCompleted ? "border-green-500/50" : hasStarted ? "border-primary/30" : "border-sidebar-border"
              )}
            >
              {/* Video Thumbnail */}
              <div className="aspect-video relative overflow-hidden group bg-muted rounded-t-lg">
                {/* Use lesson thumbnail if available, otherwise course thumbnail as fallback */}
                {(lesson.thumbnailUrl || course.thumbnail) && (
                  <img 
                    src={lesson.thumbnailUrl || course.thumbnail || ''}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover ${lesson.thumbnailUrl ? '' : 'opacity-20'}`}
                  />
                )}
                {/* Lesson number overlay */}
                <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded z-10">
                  Lesson {index + 1}
                </div>

                {/* Status badges */}
                {isCompleted && (
                  <Badge className="absolute top-2 right-2 bg-green-500 text-white z-20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
                {!isCompleted && hasStarted && (
                  <Badge className="absolute top-2 right-2 bg-blue-500 text-white z-20">
                    <Clock className="h-3 w-3 mr-1" />
                    In Progress
                  </Badge>
                )}
                {/* Duration overlay */}
                {lesson.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded z-20">
                    {formatTime(lesson.duration)}
                  </div>
                )}
              </div>

              <CardHeader className="pb-3 bg-sidebar flex-grow">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sidebar-foreground/50">
                      Lesson {index + 1}
                    </span>
                  </div>
                  <CardTitle className="text-base line-clamp-2 text-sidebar-foreground">{lesson.title}</CardTitle>
                  {lesson.description && (
                    <CardDescription className="text-sm line-clamp-2 text-sidebar-foreground/70">
                      {lesson.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 pb-4 bg-sidebar mt-auto">
                {/* Progress bar for all lessons */}
                <div className="mb-3">
                  <Progress 
                    value={watchPercentage} 
                    className={cn("h-1.5", hasStarted ? "bg-white/10" : "bg-white/5")}
                  />
                  <p className="text-xs mt-1 text-sidebar-foreground/50">
                    {isCompleted ? "Completed" : hasStarted ? `${watchPercentage}% watched` : "Not started"}
                  </p>
                </div>

                <Link href={`/courses/${course.slug}/modules/${module.id}/sub-lessons/${lesson.id}`} className="block">
                  <Button 
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                    className={`w-full ${isCompleted 
                      ? "border-white/20 text-white hover:bg-white/10 transition-all duration-200" 
                      : "text-white transition-all duration-200 hover:opacity-90"}`
                    }
                    style={!isCompleted ? { backgroundColor: '#2483ff' } : {}}
                  >
                    {isCompleted ? "Review" : progress?.watchTime ? "Continue" : "Start"}
                    <PlayCircle className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  }, {
    ...baseAttrs,
    'course.slug': slug
  })
}