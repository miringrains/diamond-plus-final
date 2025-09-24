"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Video, Trash2, GripVertical, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { formatTime } from "@/lib/plyr"

interface Lesson {
  id: string
  title: string
  description?: string | null
  duration?: number | null
  order: number
}

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
}

export function LessonList({ courseId, lessons: initialLessons }: LessonListProps) {
  const [lessons, setLessons] = useState(initialLessons)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete(lesson: Lesson) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${lesson.title}"? This cannot be undone.`
    )
    
    if (!confirmed) return
    
    setDeletingId(lesson.id)

    try {
      const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete lesson")
      }

      const result = await response.json()
      toast.success(result.message || "Lesson deleted successfully!")
      
      // Remove lesson from list and update order
      setLessons(prev => 
        prev
          .filter(l => l.id !== lesson.id)
          .map((l, index) => ({ ...l, order: index + 1 }))
      )
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete lesson")
    } finally {
      setDeletingId(null)
    }
  }

  if (lessons.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No lessons added yet. Upload your first video below.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson, index) => (
        <div
          key={lesson.id}
          className="flex items-center gap-4 p-4 border rounded-lg hover:border-accent/50 transition-colors"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
          <Video className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h4 className="font-medium">{lesson.title}</h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Lesson {index + 1}</span>
              {lesson.duration && (
                <span>• {formatTime(lesson.duration)}</span>
              )}
              {lesson.description && (
                <span className="truncate max-w-xs">• {lesson.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement edit functionality
                toast.info("Edit functionality coming soon!")
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              disabled={deletingId === lesson.id}
              onClick={() => handleDelete(lesson)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}