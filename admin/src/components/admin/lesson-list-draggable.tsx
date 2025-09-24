"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Video, Trash2, GripVertical, Edit2, Play, X } from "lucide-react"
import { toast } from "sonner"
import { formatTime } from "@/lib/plyr"
import { VideoPlayerWithNotes } from "@/components/admin/video-player-with-notes"
import { LessonProgressTracker } from "@/components/admin/lesson-progress-tracker"
import { MuxAssetStatus } from "@/components/admin/mux-asset-status"

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

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
}

interface SortableItemProps {
  lesson: Lesson
  index: number
  onDelete: (lesson: Lesson) => void
  onPreview: (lesson: Lesson) => void
  isDeleting: boolean
}

function SortableItem({ lesson, index, onDelete, onPreview, isDeleting }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
        isDragging ? "border-accent shadow-lg" : "hover:border-accent/50"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
      </div>
      
      {/* Thumbnail Preview */}
      <div className="relative w-24 h-16 rounded overflow-hidden bg-muted">
        {lesson.thumbnailUrl ? (
          <img 
            src={lesson.thumbnailUrl} 
            alt={lesson.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {lesson.videoUrl && (
          <button
            onClick={() => onPreview(lesson)}
            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Play className="h-8 w-8 text-white" />
          </button>
        )}
      </div>
      
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
        {/* Progress Bar */}
        <LessonProgressTracker 
          lessonId={lesson.id} 
          duration={lesson.duration} 
          className="mt-2"
        />
        {/* Mux Asset Status */}
        {lesson.muxAssetId && (
          <MuxAssetStatus
            muxAssetId={lesson.muxAssetId}
            muxPlaybackId={lesson.muxPlaybackId}
            muxPolicy={lesson.muxPolicy}
            muxReadyAt={lesson.muxReadyAt}
            muxError={lesson.muxError}
            className="mt-2"
          />
        )}
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
          disabled={isDeleting}
          onClick={() => onDelete(lesson)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function LessonListDraggable({ courseId, lessons: initialLessons }: LessonListProps) {
  const [lessons, setLessons] = useState(initialLessons)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  
  // Update local state when props change (after upload/refresh)
  useEffect(() => {
    setLessons(initialLessons)
  }, [initialLessons])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = lessons.findIndex((lesson) => lesson.id === active.id)
    const newIndex = lessons.findIndex((lesson) => lesson.id === over.id)

    const newLessons = arrayMove(lessons, oldIndex, newIndex)
    setLessons(newLessons)

    // Save new order to backend
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/lessons/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonIds: newLessons.map((l) => l.id),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reorder lessons")
      }

      toast.success("Lesson order updated!")
      router.refresh()
    } catch (error) {
      toast.error("Failed to save lesson order")
      // Revert to original order
      setLessons(initialLessons)
    } finally {
      setIsSaving(false)
    }
  }

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
      
      // Remove lesson from list
      setLessons(prev => prev.filter(l => l.id !== lesson.id))
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete lesson")
    } finally {
      setDeletingId(null)
    }
  }
  
  async function handlePreview(lesson: Lesson) {
    if (!lesson.videoUrl) return
    
    setLoadingPreview(true)
    setPreviewLesson(lesson)
    
    try {
      // Fetch preview URL from the API
      const response = await fetch('/api/admin/preview-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl: lesson.videoUrl }),
      })
      
      if (response.ok) {
        const { url } = await response.json()
        setPreviewUrl(url)
      } else {
        toast.error('Failed to load video preview')
        setPreviewLesson(null)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
      toast.error('Failed to load video preview')
      setPreviewLesson(null)
    } finally {
      setLoadingPreview(false)
    }
  }
  
  const handleClosePreview = () => {
    setPreviewLesson(null)
    setPreviewUrl(null)
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
      {isSaving && (
        <div className="text-sm text-muted-foreground text-center">
          Saving new order...
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <SortableItem
                key={lesson.id}
                lesson={lesson}
                index={index}
                onDelete={handleDelete}
                onPreview={handlePreview}
                isDeleting={deletingId === lesson.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Theater Mode Video Preview with Backdrop */}
      {previewLesson && (
        <div className="fixed inset-0 z-50">
          {/* Dimmed backdrop */}
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in-0"
            onClick={handleClosePreview}
          />
          
          {/* Theater content */}
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-7xl mx-auto animate-in fade-in-0 zoom-in-95">
              {/* Close button */}
              <Button
                onClick={handleClosePreview}
                className="absolute -top-12 right-0 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 h-auto backdrop-blur-sm"
                variant="ghost"
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* Video container with aspect ratio */}
              <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
                {/* Video header */}
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40">
                  <h2 className="text-2xl font-bold text-white">
                    {previewLesson.title}
                  </h2>
                  {previewLesson.description && (
                    <p className="text-white/80 mt-1 text-sm">
                      {previewLesson.description}
                    </p>
                  )}
                </div>
                
                {/* Video player with 16:9 aspect ratio */}
                <div className="relative aspect-video bg-black">
                  {loadingPreview ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      <p className="text-white mt-4">Loading video...</p>
                    </div>
                  ) : previewUrl ? (
                    <VideoPlayerWithNotes
                      src={previewUrl}
                      poster={previewLesson.thumbnailUrl || undefined}
                      title={previewLesson.title}
                      lessonId={previewLesson.id}
                      className="w-full h-full"
                      onClose={handleClosePreview}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white">Failed to load video</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}