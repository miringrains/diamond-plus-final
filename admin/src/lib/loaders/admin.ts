import { prisma } from "@/lib/db"

export async function getRecentLessons(limit = 5) {
  try {
    const lessons = await prisma.sub_lessons.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        muxPlaybackId: true,
        duration: true,
        modules: {
          select: {
            title: true,
            courses: {
              select: { title: true }
            }
          }
        }
      }
    })

    return lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      moduleTitle: lesson.modules.title,
      courseTitle: lesson.modules.courses.title,
      createdAt: lesson.createdAt,
      hasVideo: !!lesson.muxPlaybackId,
      duration: lesson.duration
    }))
  } catch (error) {
    console.error("Failed to fetch recent lessons:", error)
    return []
  }
}

export async function getRecentPodcasts(limit = 5) {
  try {
    const podcasts = await prisma.podcasts.findMany({
      take: limit,
      orderBy: [
        { publishedAt: "desc" },
        { createdAt: "desc" }
      ],
      select: {
        id: true,
        title: true,
        duration: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        muxPlaybackId: true
      }
    })

    return podcasts.map(podcast => ({
      id: podcast.id,
      title: podcast.title,
      duration: podcast.duration,
      publishedAt: podcast.publishedAt || podcast.createdAt,
      status: podcast.published ? "published" : "draft",
      hasAudio: !!podcast.muxPlaybackId
    }))
  } catch (error) {
    console.error("Failed to fetch recent podcasts:", error)
    return []
  }
}

