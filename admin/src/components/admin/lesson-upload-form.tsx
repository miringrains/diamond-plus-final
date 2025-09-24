"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Upload } from "lucide-react"

const lessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  video: z.instanceof(File).refine((file) => file.size > 0, "Video is required"),
})

type LessonFormData = z.infer<typeof lessonSchema>

export function LessonUploadForm({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
    },
  })

  async function onSubmit(data: LessonFormData) {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // First, upload the video
      const formData = new FormData()
      formData.append("file", data.video)

      const uploadResponse = await fetch("/api/upload/stream", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video")
      }

      const { fileName, thumbnailUrl } = await uploadResponse.json()
      setUploadProgress(50)

      // Then create the lesson
      const lessonResponse = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          // Keep legacy URL for fallback viewing while Mux encodes
          videoUrl: `/api/videos/${fileName}`,
          // Provide raw S3 key so the API can ingest to Mux
          s3Key: `videos/${fileName}`,
          useMux: true,
          muxPolicy: "public", // Default to public policy
          thumbnailUrl: thumbnailUrl || undefined,
        }),
      })

      if (!lessonResponse.ok) {
        throw new Error("Failed to create lesson")
      }

      setUploadProgress(100)
      toast.success("Lesson uploaded successfully!")
      router.refresh()
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload lesson")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
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
                  placeholder="e.g., Introduction to Diamond Grading"
                  className="bg-muted/50"
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
                  className="bg-muted/50 cursor-pointer"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onChange(file)
                  }}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Accepted formats: MP4, WebM, MOV
              </p>
            </FormItem>
          )}
        />

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        <Button
          type="submit"
                      className="w-full bg-accent hover:bg-[var(--accent-hover)] text-white"
          disabled={isUploading}
        >
          {isUploading ? (
            "Uploading..."
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Lesson
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}