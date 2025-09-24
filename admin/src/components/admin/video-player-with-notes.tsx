"use client"

import { useState, useEffect, useRef } from "react"
import { VideoPlayer } from "@/components/video-player"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StickyNote, X, Save, ChevronRight, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type Plyr from "plyr"

interface VideoPlayerWithNotesProps {
  src: string
  poster?: string
  title?: string
  lessonId: string
  className?: string
  onClose?: () => void
}

export function VideoPlayerWithNotes({
  src,
  poster,
  title,
  lessonId,
  className,
  onClose,
}: VideoPlayerWithNotesProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [savedNotes, setSavedNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [initialTime, setInitialTime] = useState(0)
  const [progress, setProgress] = useState<{
    watchTime: number
    completed: boolean
  } | null>(null)
  
  const playerRef = useRef<Plyr | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef(0)

  // Fetch existing progress and notes
  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(`/api/progress/${lessonId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.progress) {
            setProgress(data.progress)
            setInitialTime(data.progress.watchTime || 0)
            setNotes(data.progress.notes || "")
            setSavedNotes(data.progress.notes || "")
          }
        }
      } catch (error) {
        console.error("Error fetching progress:", error)
      }
    }
    
    fetchProgress()
  }, [lessonId])

  // Save progress periodically
  const saveProgress = async (currentTime: number, completed: boolean = false) => {
    try {
      const response = await fetch(`/api/progress/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchTime: Math.floor(currentTime),
          completed,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to save progress")
      }
      
      lastSaveTimeRef.current = currentTime
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  // Save notes
  const saveNotes = async () => {
    if (notes === savedNotes) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/progress/${lessonId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to save notes")
      }
      
      setSavedNotes(notes)
      toast.success("Notes saved!")
    } catch (error) {
      console.error("Error saving notes:", error)
      toast.error("Failed to save notes")
    } finally {
      setSaving(false)
    }
  }

  // Handle player ready
  const handleReady = (player: Plyr) => {
    playerRef.current = player
    
    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      try {
        if (playerRef.current && !playerRef.current.paused) {
          const currentTime = playerRef.current.currentTime
          
          // Save every 10 seconds
          if (Math.abs(currentTime - lastSaveTimeRef.current) >= 10) {
            console.log(`Saving progress: ${Math.floor(currentTime)}s`)
            saveProgress(currentTime)
          }
        }
      } catch (error) {
        console.error("Error in progress interval:", error)
      }
    }, 1000)
  }

  // Handle progress updates
  const handleProgress = (seconds: number) => {
    // Update local progress state
    if (progress) {
      setProgress(prev => prev ? { ...prev, watchTime: seconds } : null)
    }
  }

  // Handle completion
  const handleComplete = () => {
    if (playerRef.current) {
      saveProgress(playerRef.current.currentTime, true)
      toast.success("Lesson completed! 🎉")
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      // Save final progress on unmount - check if player exists and is valid
      try {
        if (playerRef.current && typeof playerRef.current.currentTime === 'number') {
          const currentTime = playerRef.current.currentTime
          if (currentTime > 0) {
            // Use navigator.sendBeacon for reliable cleanup saves
            const blob = new Blob(
              [JSON.stringify({
                watchTime: Math.floor(currentTime),
                completed: false,
              })],
              { type: 'application/json' }
            )
            navigator.sendBeacon(`/api/progress/${lessonId}`, blob)
          }
        }
      } catch (error) {
        // Silently handle errors during cleanup
        console.log("Cleanup save skipped:", error)
      }
    }
  }, [lessonId])

  // Auto-save notes when they change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== savedNotes && notes.length > 0) {
        saveNotes()
      }
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [notes])

  return (
    <div className={cn("relative w-full h-full flex", className)}>
      {/* Video Player Section */}
      <div className={cn("flex-1 transition-all duration-300", showNotes && "mr-96")}>
        <VideoPlayer
          src={src}
          poster={poster}
          title={title}
          initialTime={initialTime}
          onReady={handleReady}
          onProgress={handleProgress}
          onComplete={handleComplete}
          className="w-full h-full"
          disableKeyboard={showNotes}
        />
      </div>

      {/* Notes Panel Toggle */}
      <Button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setShowNotes(!showNotes)
        }}
        className="absolute top-4 right-4 z-40 bg-black/50 hover:bg-black/70 text-white"
        size="sm"
        variant="ghost"
      >
        {showNotes ? (
          <>
            <ChevronRight className="h-4 w-4 mr-1" />
            Hide Notes
          </>
        ) : (
          <>
            <StickyNote className="h-4 w-4 mr-1" />
            Show Notes
          </>
        )}
      </Button>

      {/* Notes Panel */}
      <div
        className={cn(
          "absolute top-0 right-0 w-96 h-full bg-card border-l transition-transform duration-300",
          showNotes ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Card className="h-full rounded-none border-0">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <CardTitle className="text-lg">Lesson Notes</CardTitle>
            <div className="flex items-center gap-2">
              {notes !== savedNotes && (
                <Button
                  onClick={saveNotes}
                  size="sm"
                  variant="outline"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
              <Button
                onClick={() => setShowNotes(false)}
                size="sm"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-[calc(100%-80px)]">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                // Prevent video player from intercepting keyboard events
                e.stopPropagation()
              }}
              onKeyUp={(e) => {
                e.stopPropagation()
              }}
              onKeyPress={(e) => {
                e.stopPropagation()
              }}
              placeholder="Take notes while watching..."
              className="h-full resize-none bg-card-subtle focus:ring-2 focus:ring-primary"
              spellCheck
            />
            {notes !== savedNotes && (
              <p className="text-xs text-muted-foreground mt-2">
                Auto-saving in 2 seconds...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}