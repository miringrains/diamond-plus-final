"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Headphones, Trash2, Loader2 } from "lucide-react"
import { AudioUploadDialog } from "@/components/dialogs/AudioUploadDialog"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchPodcasts()
  }, [])

  const fetchPodcasts = async () => {
    const { data, error } = await supabase
      .from('dp_podcasts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      toast.error("Failed to load podcasts")
    } else {
      setPodcasts(data || [])
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this podcast?")) return

    const { error } = await supabase
      .from('dp_podcasts')
      .delete()
      .eq('id', id)
    
    if (error) {
      toast.error("Failed to delete podcast")
    } else {
      toast.success("Podcast deleted")
      fetchPodcasts()
    }
  }

  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    fetchPodcasts()
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
          <h1 className="text-3xl font-bold tracking-tight">Podcasts</h1>
          <p className="text-muted-foreground">
            Manage audio files for The Diamond Standard Podcast
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Podcast
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {podcasts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No podcasts uploaded yet</p>
              <p className="text-sm text-muted-foreground">Click "Add Podcast" to get started</p>
            </CardContent>
          </Card>
        ) : (
          podcasts.map((podcast) => (
            <Card key={podcast.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="line-clamp-1">{podcast.title}</CardTitle>
                    {podcast.description && (
                      <CardDescription className="line-clamp-2">
                        {podcast.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(podcast.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{new Date(podcast.created_at).toLocaleDateString()}</span>
                  {podcast.mux_playback_id && (
                    <span className="text-xs text-green-600">Mux Ready</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AudioUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
