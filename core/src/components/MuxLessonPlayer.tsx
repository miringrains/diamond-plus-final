"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type { MuxPlayerRefAttributes } from "@mux/mux-player-react"
import { addSpanEvent } from "@/lib/telemetry"
import { useSupabaseAuth } from "@/components/providers"
import debounce from "lodash/debounce"

interface MuxLessonPlayerProps {
  lessonId: string
  playbackId: string
  title: string
  startTimeSec?: number
  className?: string
  // Signed playback
  initialToken?: string
  requiresToken?: boolean
  // Callbacks
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  // Premium features
  enableCaptions?: boolean
  enableHotkeys?: boolean
  enableAirplay?: boolean
  enableChromecast?: boolean
  thumbnailTime?: number
}

// Local storage key for progress
const getProgressKey = (lessonId: string) => `lesson-progress-${lessonId}`

export function MuxLessonPlayer({
  lessonId,
  playbackId,
  title,
  startTimeSec = 0,
  className = "",
  initialToken,
  requiresToken = false,
  onProgress,
  onComplete,
  enableCaptions = true,
  enableHotkeys = true,
  enableAirplay = true,
  enableChromecast = true,
  thumbnailTime = 0
}: MuxLessonPlayerProps) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | undefined>(initialToken)
  const [isRefreshingToken, setIsRefreshingToken] = useState(false)
  const { user } = useSupabaseAuth()
  const lastProgressRef = useRef<number>(0)
  const progressWriteRef = useRef<number | null>(null)

  // Get initial time from localStorage if available and higher than server
  const getInitialTime = () => {
    if (typeof window === "undefined") return startTimeSec
    
    try {
      const stored = localStorage.getItem(getProgressKey(lessonId))
      if (stored) {
        const { position } = JSON.parse(stored)
        // Use the higher value between server and local
        return Math.max(position || 0, startTimeSec)
      }
    } catch (e) {
      console.error("[MuxPlayer] Failed to read local progress:", e)
    }
    
    return startTimeSec
  }

  const [currentTime, setCurrentTime] = useState(getInitialTime())

  // Refresh token when needed
  const refreshToken = useCallback(async () => {
    if (!requiresToken || isRefreshingToken) return
    
    setIsRefreshingToken(true)
    try {
      const response = await fetch(
        `/api/mux/playback-token?playbackId=${playbackId}&lessonId=${lessonId}`
      )
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`)
      }
      
      const data = await response.json()
      setToken(data.token)
      
      // Schedule next refresh before expiry
      const refreshIn = (data.expiresIn - 60) * 1000 // Refresh 1 minute before expiry
      setTimeout(refreshToken, Math.max(refreshIn, 30000)) // Min 30 seconds
      
      addSpanEvent("mux.token.refreshed", { lessonId, playbackId })
    } catch (err) {
      console.error("[MuxPlayer] Token refresh failed:", err)
      setError("Failed to refresh playback token")
    } finally {
      setIsRefreshingToken(false)
    }
  }, [requiresToken, isRefreshingToken, playbackId, lessonId])

  // Initial token setup and refresh scheduling
  useEffect(() => {
    if (requiresToken && !initialToken) {
      refreshToken()
    } else if (requiresToken && initialToken) {
      // Schedule refresh for initial token
      const refreshIn = 3540000 // 59 minutes (assuming 1 hour token)
      setTimeout(refreshToken, refreshIn)
    }
  }, [requiresToken, initialToken, refreshToken])

  // Save progress to localStorage
  const saveLocalProgress = useCallback((position: number) => {
    try {
      localStorage.setItem(getProgressKey(lessonId), JSON.stringify({
        position,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error("[MuxPlayer] Failed to save local progress:", e)
    }
  }, [lessonId])

  // Debounced progress save to server
  const saveServerProgress = useCallback(
    debounce(async (position: number) => {
      try {
        await fetch(`/api/progress/${lessonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionSeconds: Math.floor(position) })
        })
      } catch (e) {
        console.error("[MuxPlayer] Failed to save server progress:", e)
      }
    }, 2000),
    [lessonId]
  )

  // Handle time updates
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const position = player.currentTime
    setCurrentTime(position)

    // Only update if position changed significantly (1 second)
    if (Math.abs(position - lastProgressRef.current) >= 1) {
      lastProgressRef.current = position
      
      // Save to localStorage immediately
      saveLocalProgress(position)
      
      // Debounced save to server
      saveServerProgress(position)
      
      // Callback to parent
      onProgress?.(Math.floor(position))
    }
  }, [saveLocalProgress, saveServerProgress, onProgress])

  // Flush progress on unmount or visibility change
  const flushProgress = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const position = Math.floor(player.currentTime)
    
    // Cancel any pending debounced saves
    saveServerProgress.cancel()
    
    // Send final progress synchronously
    const data = JSON.stringify({ positionSeconds: position })
    navigator.sendBeacon(`/api/progress/${lessonId}`, data)
    
    addSpanEvent("mux.progress.flushed", { lessonId, position })
  }, [lessonId, saveServerProgress])

  // Setup visibility change and unmount handlers
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushProgress()
      }
    }

    const handlePageHide = () => {
      flushProgress()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      flushProgress()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [flushProgress])

  // Handle errors
  const handleError = useCallback((event: any) => {
    const error = event?.detail?.error
    console.error("[MuxPlayer] Error:", error)
    
    // Check if it's a 403 (token expired)
    if (error?.code === 403 && requiresToken) {
      console.log("[MuxPlayer] Token expired, refreshing...")
      refreshToken()
    } else {
      setError(error?.message || "Playback error occurred")
      addSpanEvent("mux.error", {
        lessonId,
        playbackId,
        error: error?.message || "Unknown error"
      })
    }
  }, [lessonId, playbackId, requiresToken, refreshToken])

  // Handle completion
  const handleEnded = useCallback(() => {
    console.log("[MuxPlayer] Video ended")
    flushProgress()
    onComplete?.()
    
    addSpanEvent("mux.complete", {
      lessonId,
      playbackId
    })
  }, [lessonId, playbackId, flushProgress, onComplete])

  if (error) {
    return (
      <div className={`${className} bg-destructive/10 rounded-lg flex items-center justify-center`}>
        <div className="text-center p-8">
          <p className="text-destructive font-semibold mb-2">Playback Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          {requiresToken && (
            <button
              onClick={() => {
                setError(null)
                refreshToken()
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        tokens={requiresToken && token ? { playback: token } : undefined}
        metadata={{
          video_id: lessonId,
          video_title: title,
          viewer_user_id: user?.id || "anonymous"
        }}
        streamType="on-demand"
        startTime={currentTime}
        autoPlay={false}
        thumbnailTime={thumbnailTime}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        // Features
        hotkeys={enableHotkeys ? "noarrows" : "none"}
        captions={enableCaptions}
        airplay={enableAirplay}
        // @ts-ignore - Mux types might be outdated
        castReceiver={enableChromecast}
        // Styling
        accentColor="#FF0000"
        primaryColor="#FFFFFF"
        secondaryColor="#000000"
      />
    </div>
  )
}
