"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, Pencil, Trash2, Clock, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { MuxAssetStatus } from "./mux-asset-status"
import { LessonUploadWithPolicy } from "./lesson-upload-with-policy"

interface SubLesson {
  id: string
  title: string
  description?: string | null
  duration: number | null
  order: number
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxPolicy?: string | null
  muxReadyAt?: Date | null
  muxError?: string | null
  thumbnailUrl?: string | null
}

interface SubLessonManagerProps {
  moduleId: string
  initialSubLessons: SubLesson[]
}

export function SubLessonManager({ moduleId, initialSubLessons }: SubLessonManagerProps) {
  const router = useRouter()
  const [subLessons, setSubLessons] = useState(initialSubLessons)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const deleteSubLesson = async (subLessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/sub-lessons/${subLessonId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete sub-lesson")
      }

      setSubLessons(subLessons.filter(sl => sl.id !== subLessonId))
      toast.success("Lesson deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("Error deleting sub-lesson:", error)
      toast.error("Failed to delete lesson")
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sub-Lessons</h2>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload New Lesson</DialogTitle>
            </DialogHeader>
            <LessonUploadWithPolicy 
              moduleId={moduleId}
              onSuccess={() => {
                setUploadDialogOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {subLessons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No lessons yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first lesson to this module.
              </p>
            </CardContent>
          </Card>
        ) : (
          subLessons.map((subLesson) => (
            <Card key={subLesson.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{subLesson.title}</CardTitle>
                      {subLesson.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {subLesson.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(subLesson.duration)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {/* TODO: Edit sub-lesson */}}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSubLesson(subLesson.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {subLesson.muxAssetId && (
                <CardContent>
                  <MuxAssetStatus
                    muxAssetId={subLesson.muxAssetId}
                    muxPlaybackId={subLesson.muxPlaybackId}
                    muxPolicy={subLesson.muxPolicy}
                    muxReadyAt={subLesson.muxReadyAt}
                    muxError={subLesson.muxError}
                  />
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
