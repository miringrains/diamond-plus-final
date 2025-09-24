"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileVideo } from "lucide-react"
import { uploadManager, UploadTask } from "@/lib/upload-manager"

// Format file size for display
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  video: z.instanceof(File, { message: "Video file is required" })
    .refine((file) => file.size <= 5 * 1024 * 1024 * 1024, "Max file size is 5GB")
    .refine(
      (file) => ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type),
      "Only MP4, WebM, OGG, and MOV files are accepted"
    ),
})

type LessonFormData = z.infer<typeof lessonSchema>

interface UploadItemProps {
  task: UploadTask
  onCancel: (id: string) => void
  onClear: (id: string) => void
  onRetry?: (task: UploadTask) => void
}

function UploadItem({ task, onCancel, onClear, onRetry }: UploadItemProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileVideo className="h-4 w-4 text-muted-foreground" />
    }
  }
  
  const getStatusText = () => {
    switch (task.status) {
      case 'uploading':
        return `Uploading... ${task.progress}%`
      case 'completed':
        return 'Upload complete'
      case 'failed':
        return task.error || 'Upload failed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'Pending'
    }
  }
  
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm truncate max-w-xs">
            {task.fileName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {task.status === 'uploading' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(task.id)}
              title="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {(task.status === 'failed' || task.status === 'cancelled') && (
            <>
              {onRetry && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRetry(task)}
                  title="Retry upload"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onClear(task.id)}
                title="Remove from list"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {task.status === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onClear(task.id)}
              title="Remove from list"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{getStatusText()}</span>
          <span>{formatBytes(task.fileSize)}</span>
        </div>
        
        {task.status === 'uploading' && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function LessonUploadEnhanced({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [uploads, setUploads] = useState<UploadTask[]>([])
  const [isCreatingLesson, setIsCreatingLesson] = useState(false)
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null)
  
  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })
  
  // Restore uploads from localStorage on mount
  useEffect(() => {
    const restored = uploadManager.restoreUploads()
    setUploads(restored)
  }, [])
  
  async function onSubmit(data: LessonFormData) {
    console.log("Form submitted with data:", data)
    
    // Store form data for lesson creation
    const lessonTitle = data.title
    const lessonDescription = data.description
    
    try {
      // Start upload with real progress tracking - returns immediately
      const task = uploadManager.startUpload(
        data.video,
        (progress) => {
          console.log(`Upload progress: ${progress}%`)
          // Update progress in UI
          setUploads(prev => prev.map(u => 
            u.id === task.id ? { ...u, progress } : u
          ))
        },
        (status) => {
          console.log(`Upload status: ${status}`)
          // Update status in UI
          setUploads(prev => prev.map(u => 
            u.id === task.id ? { ...u, status } : u
          ))
        },
        async (completedTask) => {
          // This callback is called when upload completes
          console.log("Upload completed with status:", completedTask.status)
          
          if (completedTask.status === 'completed' && completedTask.videoUrl) {
            console.log("Creating lesson with video URL:", completedTask.videoUrl)
            setIsCreatingLesson(true)
            
            try {
              const lessonResponse = await fetch(`/api/admin/courses/${courseId}/lessons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: lessonTitle,  // Use stored values
                  description: lessonDescription,
                  // Pass both for safety during migration
                  videoUrl: completedTask.videoUrl,
                  s3Key: completedTask.videoUrl?.startsWith('videos/') ? completedTask.videoUrl : undefined,
                  useMux: true,
                  muxPolicy: "public", // Default to public policy
                  thumbnailUrl: completedTask.thumbnailUrl,
                  duration: completedTask.duration,
                }),
              })
              
              if (!lessonResponse.ok) {
                const error = await lessonResponse.text()
                throw new Error(`Failed to create lesson: ${error}`)
              }
              
              const lessonData = await lessonResponse.json()
              
              toast.success("Lesson created successfully! 🎉", {
                description: lessonData.muxAssetId 
                  ? `"${lessonTitle}" is now processing. The page will refresh when ready.`
                  : `"${lessonTitle}" has been added to the course.`,
                duration: 5000,
              })
              
              // Reset form immediately
              form.reset()
              
              // Force a hard refresh to update the lesson list
              router.refresh()
              
              // Also try to navigate to the same page to force re-render
              setTimeout(() => {
                router.push(`/admin/courses/${courseId}`)
              }, 100)
              
              // Clear completed upload from list after success
              setTimeout(() => {
                uploadManager.clearCompleted()
                setUploads(uploadManager.getAllUploads())
              }, 3000)
            } catch (error) {
              console.error("Error creating lesson:", error)
              toast.error(error instanceof Error ? error.message : "Failed to create lesson")
            } finally {
              setIsCreatingLesson(false)
            }
          } else if (completedTask.status === 'failed') {
            toast.error(completedTask.error || "Upload failed")
          }
        }
      )
      
      console.log("Upload task created:", task)
      setCurrentUploadId(task.id)
      
      // Add to uploads list immediately
      setUploads(prev => [...prev, task])
      
      // Clear form but keep upload running
      form.reset()
      toast.info("Upload started. You can leave this page - the upload will continue.")
      
    } catch (error) {
      console.error("Error starting upload:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start upload")
    }
  }
  
  function handleCancelUpload(uploadId: string) {
    uploadManager.cancelUpload(uploadId)
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, status: 'cancelled' } : u
    ))
  }
  
  function handleClearUpload(uploadId: string) {
    uploadManager.clearUpload(uploadId)
    setUploads(prev => prev.filter(u => u.id !== uploadId))
  }
  
  function handleClearFailed() {
    uploadManager.clearFailed()
    setUploads(prev => prev.filter(u => u.status !== 'failed' && u.status !== 'cancelled'))
  }
  
  function handleClearAll() {
    uploadManager.clearAll()
    setUploads([])
  }
  
  return (
    <div className="space-y-6">
      <div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Introduction to Real Estate"
                        className="bg-muted/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the lesson"
                        className="bg-muted/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="video"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Video File</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          className="bg-muted/50 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              console.log("File selected:", file.name, formatBytes(file.size))
                              onChange(file)
                              // Show file info
                              toast.info(`Selected: ${file.name} (${formatBytes(file.size)})`)
                            }
                          }}
                          {...field}
                        />
                        {value && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {value.name} ({formatBytes(value.size)})
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: MP4, WebM, OGG, MOV (max 5GB)
                    </p>
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={isCreatingLesson || !!currentUploadId}
              >
                {isCreatingLesson || currentUploadId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentUploadId ? "Uploading..." : "Creating Lesson..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video & Create Lesson
                  </>
                )}
              </Button>
            </form>
          </Form>
      </div>
      
      {/* Active Uploads */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Upload Queue</CardTitle>
                <CardDescription>
                  Your videos are uploading in the background. You can safely leave this page.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {uploads.some(u => u.status === 'failed' || u.status === 'cancelled') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearFailed}
                    className="w-full sm:w-auto"
                  >
                    Clear Failed ({uploads.filter(u => u.status === 'failed' || u.status === 'cancelled').length})
                  </Button>
                )}
                {uploads.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAll}
                    className="w-full sm:w-auto"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploads.map(task => (
              <UploadItem
                key={task.id}
                task={task}
                onCancel={handleCancelUpload}
                onClear={handleClearUpload}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}