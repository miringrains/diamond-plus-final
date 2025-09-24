"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Phone, Trash2, Loader2, Video } from "lucide-react"
import { VideoUploadDialog } from "@/components/dialogs/VideoUploadDialog"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"

export default function GroupCallsPage() {
  const [calls, setCalls] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    const { data, error } = await supabase
      .from('group_calls')
      .select('*')
      .order('call_date', { ascending: false })
    
    if (error) {
      toast.error("Failed to load group calls")
    } else {
      setCalls(data || [])
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group call?")) return

    const { error } = await supabase
      .from('group_calls')
      .delete()
      .eq('id', id)
    
    if (error) {
      toast.error("Failed to delete group call")
    } else {
      toast.success("Group call deleted")
      fetchCalls()
    }
  }

  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    fetchCalls()
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
          <h1 className="text-3xl font-bold tracking-tight">Group Calls</h1>
          <p className="text-muted-foreground">
            Manage videos for the Recent Group Calls section
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Group Call
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {calls.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No group calls uploaded yet</p>
              <p className="text-sm text-muted-foreground">Click "Add Group Call" to get started</p>
            </CardContent>
          </Card>
        ) : (
          calls.map((call) => (
            <Card key={call.id} className="overflow-hidden">
              <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-primary/5">
                {call.thumbnail_url ? (
                  <img
                    src={call.thumbnail_url}
                    alt={call.title}
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
                    <CardTitle className="line-clamp-1">{call.title}</CardTitle>
                    {call.description && (
                      <CardDescription className="line-clamp-2">
                        {call.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(call.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{new Date(call.call_date || call.created_at).toLocaleDateString()}</span>
                  {call.mux_playback_id && (
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
        title="Upload Group Call"
        description="Add a new group call recording"
        contentType="group"
      />
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
