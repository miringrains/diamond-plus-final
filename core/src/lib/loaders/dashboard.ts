import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

interface WelcomeLesson {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  progress: number
  isStartHere?: boolean
  isNextUp?: boolean
  muxPlaybackId?: string
}

export async function getWelcomeLessons(): Promise<WelcomeLesson[]> {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  try {
    // Get Diamond Plus module content
    const modules = await prisma.dp_content.findMany({
      where: {
        type: 'module',
        is_published: true
      },
      include: {
        dp_videos: {
          include: {
            dp_progress: {
              where: {
                user_id: session.user.id
              },
              take: 1
            }
          },
          orderBy: {
            order_index: 'asc'
          }
        }
      },
      orderBy: {
        order_index: 'asc'
      }
    })

    // Collect all videos from all modules
    const allLessons: WelcomeLesson[] = []
    let firstIncompleteFound = false

    modules.forEach((module) => {
      module.dp_videos.forEach((video, videoIndex) => {
        const userProgress = video.dp_progress?.[0]
        const progressPercentage = userProgress?.completed 
          ? 100 
          : userProgress?.progress_seconds && video.duration
            ? Math.round((userProgress.progress_seconds / video.duration) * 100)
            : 0
        const isComplete = progressPercentage === 100

        // Mark first video as "Start Here" if no progress anywhere
        const isStartHere = allLessons.length === 0 && allLessons.every(l => l.progress === 0)
        
        // Mark first incomplete video as "Next Up"
        const isNextUp = !isComplete && !firstIncompleteFound && allLessons.some(l => l.progress > 0)
        if (isNextUp) {
          firstIncompleteFound = true
        }

        allLessons.push({
          id: video.id,
          title: video.title,
          description: module.title, // Use module title as description
          thumbnailUrl: video.thumbnail_url || module.thumbnail_url || null,
          progress: progressPercentage,
          isStartHere,
          isNextUp,
          muxPlaybackId: video.mux_playback_id || undefined
        })
      })
    })

    // Take only first 8 videos for the welcome rail
    return allLessons.slice(0, 8)
  } catch (error) {
    console.error("Error fetching welcome lessons:", error)
    return []
  }
}

interface RecentPodcast {
  id: string
  title: string
  description: string
  duration: number
  episodeNumber: number
  publishedAt: Date
  muxPlaybackId: string
}

export async function getRecentPodcasts(): Promise<RecentPodcast[]> {
  try {
    const podcasts = await prisma.dp_content.findMany({
      where: {
        type: 'podcast',
        is_published: true
      },
      include: {
        dp_podcasts: {
          orderBy: {
            published_at: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    })

    return podcasts
      .filter(content => content.dp_podcasts.length > 0)
      .map((content) => {
        const podcast = content.dp_podcasts[0]
        return {
          id: podcast.id,
          title: podcast.title,
          description: podcast.description || content.description || '',
          duration: podcast.duration || 0,
          episodeNumber: podcast.episode_number || 1,
          publishedAt: podcast.published_at || content.created_at,
          muxPlaybackId: podcast.mux_playback_id || ''
        }
      })
  } catch (error) {
    console.error("Error fetching recent podcasts:", error)
    return []
  }
}
