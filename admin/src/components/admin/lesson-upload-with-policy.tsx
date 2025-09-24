"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, Shield, Globe, Info, AlertCircle } from "lucide-react"
import { uploadManager } from "@/lib/upload-manager"

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  video: z.instanceof(File, { message: "Video file is required" })
    .refine((file) => file.size <= 5 * 1024 * 1024 * 1024, "Max file size is 5GB")
    .refine(
      (file) => ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type),
      "Only MP4, WebM, OGG, and MOV files are accepted"
    ),
  useMux: z.boolean(),
  muxPolicy: z.enum(["public", "signed"]),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
})

type LessonFormData = z.infer<typeof lessonSchema>

interface LessonUploadWithPolicyProps {
  courseId?: string
  moduleId?: string
  onSuccess?: () => void
}

export function LessonUploadWithPolicy({ courseId, moduleId, onSuccess }: LessonUploadWithPolicyProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      useMux: true,
      muxPolicy: "public",
      thumbnailUrl: "",
    },
  })

  const watchUseMux = form.watch("useMux")
  const watchMuxPolicy = form.watch("muxPolicy")

  async function onSubmit(data: LessonFormData) {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Start upload with callbacks
      const task = uploadManager.startUpload(
        data.video,
        (progress) => {
          setUploadProgress(progress)
        },
        (status) => {
          if (status === 'failed') {
            setIsUploading(false)
            toast.error("Upload failed")
          }
        },
        (completedTask) => {
          // Create the lesson with the uploaded video
          createLesson({
            ...data,
            videoUrl: completedTask.videoUrl!,
            s3Key: completedTask.videoUrl?.startsWith('videos/') ? completedTask.videoUrl : undefined,
            thumbnailUrl: data.thumbnailUrl || completedTask.thumbnailUrl,
            duration: completedTask.duration,
          })
        }
      )

      if (!task) {
        throw new Error("Failed to start upload")
      }
    } catch (error) {
      setIsUploading(false)
      toast.error(error instanceof Error ? error.message : "Failed to upload lesson")
    }
  }

  async function createLesson(lessonData: any) {
    try {
      // Use the appropriate endpoint based on what's provided
      const endpoint = moduleId 
        ? `/api/admin/modules/${moduleId}/sub-lessons`
        : `/api/admin/courses/${courseId}/lessons`
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lessonData.title,
          description: lessonData.description,
          videoUrl: lessonData.videoUrl,
          s3Key: lessonData.s3Key,
          useMux: lessonData.useMux,
          muxPolicy: lessonData.muxPolicy,
          thumbnailUrl: lessonData.thumbnailUrl,
          duration: lessonData.duration,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create lesson")
      }

      toast.success("Lesson created successfully!")
      router.refresh()
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast.error("Failed to create lesson")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Lesson</CardTitle>
        <CardDescription>
          Upload a video and configure playback settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Introduction to Diamond Grading"
                      disabled={isUploading}
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
                    <Textarea
                      placeholder="Brief description of the lesson content..."
                      disabled={isUploading}
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
                    <Input
                      type="file"
                      accept="video/*"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onChange(file)
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    MP4, WebM, OGG, or MOV. Max size: 5GB
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border rounded-lg p-4">
              <FormField
                control={form.control}
                name="useMux"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Use Mux Video Platform</FormLabel>
                      <FormDescription>
                        Enable advanced video features like adaptive streaming
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isUploading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchUseMux && (
                <FormField
                  control={form.control}
                  name="muxPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playback Security</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isUploading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select playback policy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span>Public</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="signed">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span>Signed (Secure)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "public" ? (
                          <span className="flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Anyone with the link can view the video
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Shield className="h-3 w-3" />
                            Requires authentication token, expires after 1 hour
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., https://example.com/lesson-thumbnail.jpg"
                      disabled={isUploading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to use auto-generated thumbnail from video
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>Uploading... {uploadProgress}%</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Lesson
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
