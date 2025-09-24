"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LessonListDraggable } from "./lesson-list-draggable"

interface Lesson {
  id: string
  title: string
  description?: string | null
  duration?: number | null
  order: number
  videoUrl?: string
  thumbnailUrl?: string | null
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxPolicy?: string | null
  muxReadyAt?: Date | null
  muxError?: string | null
  progress?: {
    watchTime: number
    completed: boolean
  } | null
}

interface LessonListWithPollingProps {
  courseId: string
  initialLessons: Lesson[]
}

export function LessonListWithPolling({ courseId, initialLessons }: LessonListWithPollingProps) {
  const [lessons, setLessons] = useState(initialLessons)
  const router = useRouter()

  useEffect(() => {
    // Check if any lessons are still processing
    const hasProcessingLessons = lessons.some(
      lesson => lesson.muxAssetId && !lesson.muxReadyAt && !lesson.muxError
    )

    if (!hasProcessingLessons) return

    // Poll for updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/courses/${courseId}`, {
          cache: 'no-cache'
        })
        
        if (!response.ok) return

        const data = await response.json()
        
        // Check if any lesson status changed
        const updatedLessons = data.lessons || []
        const hasChanges = updatedLessons.some((updated: Lesson) => {
          const current = lessons.find(l => l.id === updated.id)
          if (!current) return false
          
          return (
            (current.muxReadyAt !== updated.muxReadyAt) ||
            (current.muxError !== updated.muxError)
          )
        })

        if (hasChanges) {
          // Refresh the page to get latest data
          router.refresh()
        }
      } catch (error) {
        console.error('[LessonList] Failed to poll status:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [courseId, lessons, router])

  return <LessonListDraggable courseId={courseId} lessons={lessons} />
}
