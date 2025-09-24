import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, FileText, PlayCircle, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"


// Force dynamic rendering to ensure fresh progress data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  // Get user's progress
  const progress = await prisma.progress.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      sub_lessons: {
        select: {
          id: true,
          title: true,
          duration: true,
          muxPlaybackId: true,
          thumbnailUrl: true,
          modules: {
            include: {
              courses: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                }
              },
            }
          },
        },
      },
    },
    orderBy: {
      lastWatched: "desc",
    },
    take: 5,
  })

  // Get available courses
  const courses = await prisma.courses.findMany({
    where: {
      published: true,
    },
    include: {
      modules: {
        include: {
          sub_lessons: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  })

  // Calculate progress for each course
  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const allSubLessons = course.modules.flatMap(m => m.sub_lessons)
      const totalLessons = allSubLessons.length
      
      const completedLessons = await prisma.progress.count({
        where: {
          userId: session.user!.id,
          sub_lessons: {
            modules: {
              courseId: course.id,
            },
          },
          completed: true,
        },
      })

      return {
        ...course,
        totalLessons,
        completedLessons,
        progressPercentage: totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
      }
    })
  )

  // Calculate user statistics
  const totalProgress = await prisma.progress.count({
    where: { userId: session.user.id }
  })
  
  const completedLessonsTotal = await prisma.progress.count({
    where: { 
      userId: session.user.id,
      completed: true
    }
  })

  const totalWatchTime = await prisma.progress.aggregate({
    where: { userId: session.user.id },
    _sum: { watchTime: true }
  })

  const totalWatchTimeSeconds = totalWatchTime._sum.watchTime || 0
  const watchTimeHours = Math.floor(totalWatchTimeSeconds / 3600)
  const watchTimeMinutes = Math.floor((totalWatchTimeSeconds % 3600) / 60)
  const learningStreak = progress.length > 0 ? 7 : 0 // Simplified for now

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-medium text-foreground">Dashboard</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Manage your courses and track your learning progress
        </p>
      </div>
          
      {/* Statistics Module */}
      <div className="mb-8 md:mb-10">
        <div className="rounded-lg p-6 bg-muted/50 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Lessons Started</div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{totalProgress}</div>
              <div className="text-xs mt-1 text-muted-foreground/70">Total lessons accessed</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Lessons Completed</div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{completedLessonsTotal}</div>
              <div className="text-xs mt-1 text-muted-foreground/70">Finished lessons</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Watch Time</div>
              <div className="text-2xl font-semibold mt-2 text-foreground">
                {watchTimeHours > 0 
                  ? `${watchTimeHours}h ${watchTimeMinutes > 0 ? `${watchTimeMinutes}m` : ''}`
                  : `${watchTimeMinutes}m`
                }
              </div>
              <div className="text-xs mt-1 text-muted-foreground/70">Total time watched</div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Learning Streak</div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{learningStreak}</div>
              <div className="text-xs mt-1 text-muted-foreground/70">Days in a row</div>
            </div>
          </div>
        </div>
      </div>



      {/* Your Learning Path - Course Collections */}
      {coursesWithProgress.length > 0 && (
        <div className="mb-8 md:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-medium text-foreground">Your Learning Path</h2>
              <p className="text-sm mt-1 text-muted-foreground">Complete courses to master real estate sales</p>
            </div>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
              Browse All Courses
            </Link>
          </div>
          <div className="space-y-6">
            {coursesWithProgress.map((course) => (
              <div key={course.id} className="rounded-xl overflow-hidden bg-card border border-border shadow-sm">
                <div className="md:flex">
                  {/* Course Thumbnail - 50% width */}
                  <div className="md:w-1/2">
                    <div className="aspect-video h-full relative" style={{ backgroundColor: '#F6F7F9' }}>
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto mb-2" style={{ color: '#9ca3af' }} />
                            <div className="text-xs" style={{ color: '#9ca3af' }}>Course</div>
                          </div>
                        </div>
                      )}
                      {/* Large status badge */}
                      {course.progressPercentage === 100 && (
                        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium text-sm">
                          ✓ Completed
                        </div>
                      )}
                      {course.progressPercentage > 0 && course.progressPercentage < 100 && (
                        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium text-sm">
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Course Details - 50% width */}
                  <div className="flex-1 p-6 md:p-8">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e121b' }}>{course.title}</h3>
                      {course.description && (
                        <p className="text-sm" style={{ color: '#6b7280' }}>{course.description}</p>
                      )}
                    </div>
                    
                    {/* Course Structure */}
                    <div className="flex flex-wrap gap-6 mb-6">
                      <div>
                        <div className="text-2xl font-semibold" style={{ color: '#0e121b' }}>{course.totalLessons}</div>
                        <div className="text-sm" style={{ color: '#6b7280' }}>Video Lessons</div>
                      </div>
                      <div>
                        <div className="text-2xl font-semibold" style={{ color: course.completedLessons > 0 ? '#22c55e' : '#0e121b' }}>
                          {course.completedLessons}/{course.totalLessons}
                        </div>
                        <div className="text-sm" style={{ color: '#6b7280' }}>Completed</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span style={{ color: '#6b7280' }}>Overall Progress</span>
                        <span style={{ color: '#0e121b', fontWeight: '500' }}>{course.progressPercentage}%</span>
                      </div>
                      <Progress 
                        value={course.progressPercentage} 
                        className="h-3" 
                        style={{ backgroundColor: '#F6F7F9' }}
                      />
                    </div>
                    
                    {/* Action Button */}
                    <Link href={`/courses/${course.slug}`}>
                      <Button 
                        className="font-medium px-8 py-2.5 text-base" 
                        style={{ backgroundColor: '#176FFF', borderRadius: '8px' }}
                      >
                        {course.progressPercentage === 100 ? 'Review Course' : course.progressPercentage > 0 ? 'Continue Learning' : 'Start Course'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Video Lessons */}
      {progress.length > 0 && (
        <div className="mb-8 md:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-medium text-foreground">Continue Watching</h2>
              <p className="text-sm mt-1 text-muted-foreground">Pick up where you left off</p>
            </div>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
              View All Lessons
            </Link>
          </div>
          <div className="rounded-lg p-6 bg-muted/50 border border-border">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {progress.map((item) => (
                <Card key={item.id} className="overflow-hidden border-0" style={{ backgroundColor: '#1F1F23' }}>
                  {/* Video Thumbnail */}
                  <div className="aspect-video relative" style={{ backgroundColor: '#000000' }}>
                    {item.sub_lessons.thumbnailUrl ? (
                      <img 
                        src={item.sub_lessons.thumbnailUrl}
                        alt={item.sub_lessons.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-12 w-12" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </div>
                    )}
                    {/* Status badge */}
                    {item.completed && (
                      <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {!item.completed && item.watchTime > 0 && (
                      <Badge className="absolute top-2 right-2 bg-blue-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    )}
                    {/* Duration overlay */}
                    {item.sub_lessons.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(item.sub_lessons.duration / 60)}:{(item.sub_lessons.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Video Lesson
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-medium text-white line-clamp-2">{item.sub_lessons.title}</CardTitle>
                    <CardDescription>
                      <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        From: {item.sub_lessons.modules.courses.title}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Progress 
                      value={item.completed ? 100 : item.sub_lessons.duration ? Math.min(Math.round((item.watchTime / item.sub_lessons.duration) * 100), 100) : 0} 
                      className="h-1.5" 
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    />
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {item.completed ? "Completed" : item.watchTime > 0 ? `${Math.min(Math.round((item.watchTime / (item.sub_lessons.duration || 1)) * 100), 100)}% watched` : "Just started"}
                    </p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Link href={`/courses/${item.sub_lessons.modules.courses.slug}/modules/${item.sub_lessons.modules.id}/sub-lessons/${item.sub_lessons.id}`} className="w-full">
                      <Button 
                        className="w-full text-white font-medium px-6" 
                        style={{ backgroundColor: '#176FFF', borderRadius: '6px' }}
                      >
                        {item.completed ? "Review" : "Continue"}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}