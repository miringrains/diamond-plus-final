"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen, Trash2, Loader2, Video } from "lucide-react"
import { VideoUploadDialog } from "@/components/dialogs/VideoUploadDialog"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

export default function WelcomeCoursePage() {
  const [videos, setVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('welcome_course_videos')
      .select('*')
      .order('order', { ascending: true })
    
    if (error) {
      toast.error("Failed to load videos")
    } else {
      setVideos(data || [])
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return

    const { error } = await supabase
      .from('welcome_course_videos')
      .delete()
      .eq('id', id)
    
    if (error) {
      toast.error("Failed to delete video")
    } else {
      toast.success("Video deleted")
      fetchVideos()
    }
  }

  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    fetchVideos()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Course Videos</h1>
          <p className="text-muted-foreground">
            Manage videos for the Welcome Course section
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Video
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No videos uploaded yet</p>
              <p className="text-sm text-muted-foreground">Click "Add Video" to get started</p>
            </CardContent>
          </Card>
        ) : (
          videos.map((video, index) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-primary/5">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="h-16 w-16 text-primary/40" />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="line-clamp-1">
                      {index + 1}. {video.title}
                    </CardTitle>
                    {video.description && (
                      <CardDescription className="line-clamp-2">
                        {video.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(video.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Module {video.order || index + 1}</span>
                  {video.mux_playback_id && (
                    <span className="text-xs text-green-600">Mux Ready</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <VideoUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={handleUploadComplete}
        uploadEndpoint="/api/simple-upload"
        title="Upload Welcome Course Video"
        description="Add a new video to the Welcome Course"
        additionalFields={["order"]}
        contentType="welcome"
      />
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
