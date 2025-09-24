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
import { Upload, Mic } from "lucide-react"

const podcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  episode_number: z.number().int().min(1).optional(),
  audio: z.instanceof(File).refine((file) => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    return validTypes.includes(file.type)
  }, "Please upload a valid audio file (MP3, WAV, or OGG)"),
})

type PodcastFormData = z.infer<typeof podcastSchema>

interface PodcastUploadFormProps {
  contentId: string
}

export function PodcastUploadForm({ contentId }: PodcastUploadFormProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm<PodcastFormData>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: "",
      description: "",
      episode_number: undefined,
    },
  })

  async function onSubmit(data: PodcastFormData) {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("file", data.audio)
      formData.append("contentId", contentId)
      formData.append("title", data.title)
      if (data.description) {
        formData.append("description", data.description)
      }
      if (data.episode_number) {
        formData.append("episodeNumber", data.episode_number.toString())
      }

      // Upload the podcast
      const uploadResponse = await fetch("/api/upload/podcast", {
        method: "POST",
        body: formData,
        // Note: Don't set Content-Type header, let browser set it with boundary
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text()
        throw new Error(error || "Failed to upload podcast")
      }

      const result = await uploadResponse.json()
      
      toast.success("Podcast uploaded successfully!")
      form.reset()
      router.refresh()
      
    } catch (error) {
      console.error("Error uploading podcast:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload podcast")
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
              <FormLabel>Episode Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter episode title" {...field} />
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
              <FormLabel>Episode Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter episode description"
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
          name="episode_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Episode Number</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="e.g., 1, 2, 3..."
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value ? parseInt(value) : undefined)
                  }}
                />
              </FormControl>
              <FormDescription>
                Optional: Used for ordering episodes
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="audio"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Audio File</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onChange(file)
                        }
                      }}
                      {...field}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <Mic className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {value && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Upload MP3, WAV, or OGG audio files (max 500MB)
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
              Upload Podcast
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
