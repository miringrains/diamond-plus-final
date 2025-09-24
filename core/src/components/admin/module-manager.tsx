"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, GripVertical, Pencil, Trash2, Video } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { MuxAssetStatus } from "./mux-asset-status"

interface Module {
  id: string
  title: string
  description?: string | null
  order: number
  sub_lessons?: Array<{
    id: string
    title: string
    duration: number | null
    muxReadyAt: Date | null
    muxError: string | null
    thumbnailUrl: string | null
    muxAssetId?: string | null
    muxPlaybackId?: string | null
    muxPolicy?: string | null
  }>
}

interface ModuleManagerProps {
  courseId: string
  initialModules: Module[]
}

export function ModuleManager({ courseId, initialModules }: ModuleManagerProps) {
  const router = useRouter()
  const [modules, setModules] = useState(initialModules)
  const [isCreating, setIsCreating] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newModuleDescription, setNewModuleDescription] = useState("")

  const createModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error("Module title is required")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newModuleTitle,
          description: newModuleDescription || undefined
        })
      })

      if (!response.ok) {
        throw new Error("Failed to create module")
      }

      const newModule = await response.json()
      setModules([...modules, newModule])
      setNewModuleTitle("")
      setNewModuleDescription("")
      toast.success("Module created successfully")
      router.refresh()
    } catch (error) {
      console.error("Error creating module:", error)
      toast.error("Failed to create module")
    } finally {
      setIsCreating(false)
    }
  }

  const deleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module and all its sub-lessons?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete module")
      }

      setModules(modules.filter(m => m.id !== moduleId))
      toast.success("Module deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("Error deleting module:", error)
      toast.error("Failed to delete module")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Course Content</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Module</DialogTitle>
              <DialogDescription>
                Modules organize your sub-lessons into logical sections or chapters.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="module-title">Module Title</Label>
                <Input
                  id="module-title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g., Getting Started"
                />
              </div>
              <div>
                <Label htmlFor="module-description">Description (optional)</Label>
                <Textarea
                  id="module-description"
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="Brief description of what this module covers"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={createModule}
                disabled={isCreating || !newModuleTitle.trim()}
              >
                {isCreating ? "Creating..." : "Create Module"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No modules yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first module to start organizing your course content.
              </p>
            </CardContent>
          </Card>
        ) : (
          modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/modules/${module.id}`)}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Manage Lessons
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {/* TODO: Edit module */}}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteModule(module.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {module.sub_lessons && module.sub_lessons.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {module.sub_lessons.length} lesson{module.sub_lessons.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2">
                      {module.sub_lessons.slice(0, 3).map((subLesson) => (
                        <div key={subLesson.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{subLesson.title}</span>
                          </div>
                          {subLesson.muxAssetId && (
                            <MuxAssetStatus
                              muxAssetId={subLesson.muxAssetId}
                              muxPlaybackId={subLesson.muxPlaybackId}
                              muxPolicy={subLesson.muxPolicy}
                              muxReadyAt={subLesson.muxReadyAt}
                              muxError={subLesson.muxError}
                              className="scale-75"
                            />
                          )}
                        </div>
                      ))}
                      {module.sub_lessons.length > 3 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +{module.sub_lessons.length - 3} more lessons
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
