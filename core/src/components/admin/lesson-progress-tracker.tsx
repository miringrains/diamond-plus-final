"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

interface ProgressTrackerProps {
  lessonId: string
  duration?: number | null
  className?: string
}

export function LessonProgressTracker({ lessonId, duration, className }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<{
    watchTime: number
    completed: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(`/api/progress/${lessonId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.progress) {
            setProgress(data.progress)
          }
        }
      } catch (error) {
        console.error("Error fetching progress:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
    
    // Refetch progress every 30 seconds when the tab is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchProgress()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [lessonId])

  if (loading || !progress || !duration || progress.watchTime === 0) {
    return null
  }

  const percentage = Math.min((progress.watchTime / duration) * 100, 100)

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Progress: {Math.round(percentage)}%</span>
        {progress.completed && (
          <span className="text-success">✓ Completed</span>
        )}
      </div>
      <Progress value={percentage} className="h-1" />
    </div>
  )
}