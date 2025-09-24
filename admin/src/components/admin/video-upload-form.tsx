"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Upload, Video } from "lucide-react"

const videoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
  video: z.instanceof(File).refine((file) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    return validTypes.includes(file.type)
  }, "Please upload a valid video file (MP4, MOV, AVI, or WebM)"),
})

type VideoFormData = z.infer<typeof videoSchema>

interface VideoUploadFormProps {
  contentId: string
}

export function VideoUploadForm({ contentId }: VideoUploadFormProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: "",
      description: "",
      order_index: 0,
    },
  })

  async function onSubmit(data: VideoFormData) {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("file", data.video)
      formData.append("contentId", contentId)
      formData.append("title", data.title)
      if (data.description) {
        formData.append("description", data.description)
      }
      if (data.order_index !== undefined) {
        formData.append("orderIndex", data.order_index.toString())
      }

      // Upload the video using Diamond Plus video endpoint
      const uploadResponse = await fetch("/api/upload/dp-video", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text()
        throw new Error(error || "Failed to upload video")
      }

      const result = await uploadResponse.json()
      
      toast.success("Video uploaded successfully!")
      form.reset()
      router.refresh()
      
    } catch (error) {
      console.error("Error uploading video:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload video")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter video title" {...field} />
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
              <FormLabel>Video Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter video description"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="order_index"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value ? parseInt(value) : 0)
                  }}
                />
              </FormControl>
              <FormDescription>
                Used for ordering videos (lower numbers appear first)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="video"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Video File</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onChange(file)
                        }
                      }}
                      {...field}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {value && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload MP4, MOV, AVI, or WebM video files (max 5GB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
