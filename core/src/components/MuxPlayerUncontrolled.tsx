"use client"

import { useEffect, useRef, useCallback } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type { MuxPlayerRefAttributes } from "@mux/mux-player-react"
import { addSpanEvent } from "@/lib/telemetry"
import { useSupabaseAuth } from "@/components/providers"
import debounce from "lodash/debounce"

interface MuxPlayerUncontrolledProps {
  lessonId: string
  playbackId: string
  title: string
  startTimeSec?: number
  className?: string
  // Signed playback
  initialToken?: string
  requiresToken?: boolean
  // Callbacks - write only, no state binding
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  // Optional thumbnail time
  thumbnailTime?: number
  // Lesson type
  isSubLesson?: boolean
}

// Local storage key for progress
const getProgressKey = (lessonId: string) => `lesson-progress-${lessonId}`

export default function MuxPlayerUncontrolled({
  lessonId,
  playbackId,
  title,
  startTimeSec = 0,
  className = "",
  initialToken,
  requiresToken = false,
  onProgress,
  onComplete,
  thumbnailTime = 0,
  isSubLesson = false
}: MuxPlayerUncontrolledProps) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null)
  const { user } = useSupabaseAuth()
  
  // All state is kept in refs to prevent re-renders
  const hasAppliedStartTimeRef = useRef(false)
  const lastProgressRef = useRef<number>(0)
  const tokenRef = useRef<string | undefined>(initialToken)
  const isPlayingRef = useRef(false)
  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get initial time from localStorage only once
  const getInitialTime = () => {
    if (typeof window === "undefined") return startTimeSec
    
    try {
      const stored = localStorage.getItem(getProgressKey(lessonId))
      if (stored) {
        const { position } = JSON.parse(stored)
        return Math.max(position || 0, startTimeSec)
      }
    } catch (e) {
      console.error("[MuxPlayer] Failed to read local progress:", e)
    }
    
    return startTimeSec
  }
  
  // Store initial time in a ref - never changes
  const initialStartTimeRef = useRef(getInitialTime())
  
  // Token refresh - doesn't trigger re-renders
  const refreshToken = useCallback(async () => {
    if (!requiresToken) return
    
    try {
      const response = await fetch('/api/mux/playback-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbackId,
          lessonId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`)
      }
      
      const data = await response.json()
      tokenRef.current = data.token
      
      // Update player directly without re-render
      const player = playerRef.current
      if (player) {
        // @ts-ignore - Direct property access
        player.tokens = { playback: data.token }
      }
      
      // Schedule next refresh
      const refreshIn = (data.expiresIn - 60) * 1000
      setTimeout(refreshToken, Math.max(refreshIn, 30000))
      
      console.log("[MuxPlayer] Token refreshed successfully")
    } catch (err) {
      console.error("[MuxPlayer] Token refresh failed:", err)
    }
  }, [requiresToken, playbackId, lessonId])
  
  // Save to localStorage - no state updates
  const saveLocalProgress = useCallback((position: number) => {
    try {
      localStorage.setItem(getProgressKey(lessonId), JSON.stringify({
        position: Math.floor(position),
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error("[MuxPlayer] Failed to save local progress:", e)
    }
  }, [lessonId])
  
  // Progress save to server - write only, no state
  const saveServerProgress = useCallback(async (position: number) => {
    try {
      const endpoint = isSubLesson ? `/api/progress/sub-lessons/${lessonId}` : `/api/progress/${lessonId}`
      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionSeconds: Math.floor(position) })
      })
    } catch (e) {
      console.error("[MuxPlayer] Failed to save server progress:", e)
    }
  }, [lessonId, isSubLesson])
  
  // Debounced progress save - using timer ref
  const scheduleProgressSave = useCallback((position: number) => {
    // Clear existing timer
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current)
    }
    
    // Schedule new save
    progressSaveTimerRef.current = setTimeout(() => {
      saveServerProgress(position)
    }, 15000) // 15 seconds
  }, [saveServerProgress])
  
  // Handle time updates - no state updates
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    
    const position = player.currentTime
    
    // Only process if changed significantly
    if (Math.abs(position - lastProgressRef.current) >= 1) {
      lastProgressRef.current = position
      
      // Save to localStorage
      saveLocalProgress(position)
      
      // Schedule server save if no parent handler
      if (!onProgress) {
        scheduleProgressSave(position)
      } else {
        // Parent handles saving
        onProgress(Math.floor(position))
      }
    }
  }, [saveLocalProgress, scheduleProgressSave, onProgress])
  
  // Apply start time once on metadata load
  const handleLoadedMetadata = useCallback(() => {
    const player = playerRef.current
    if (!player || hasAppliedStartTimeRef.current) return
    
    // Apply start time exactly once
    if (initialStartTimeRef.current > 0) {
      player.currentTime = initialStartTimeRef.current
      console.log(`[MuxPlayer] Applied start time: ${initialStartTimeRef.current}s`)
    }
    
    hasAppliedStartTimeRef.current = true
  }, [])
  
  // Handle play/pause - no state updates
  const handlePlay = useCallback(() => {
    isPlayingRef.current = true
    console.log("[MuxPlayer] Playing")
    addSpanEvent("mux.play", { lessonId, playbackId })
  }, [lessonId, playbackId])
  
  const handlePause = useCallback(() => {
    isPlayingRef.current = false
    console.log("[MuxPlayer] Paused")
    
    // Flush any pending saves immediately
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current)
      const player = playerRef.current
      if (player) {
        saveServerProgress(Math.floor(player.currentTime))
      }
    }
    
    addSpanEvent("mux.pause", { lessonId, playbackId })
  }, [lessonId, playbackId, saveServerProgress])
  
  const handleEnded = useCallback(() => {
    console.log("[MuxPlayer] Ended")
    
    // Save final progress
    const player = playerRef.current
    if (player) {
      const position = Math.floor(player.currentTime)
      saveLocalProgress(position)
      saveServerProgress(position)
    }
    
    onComplete?.()
    addSpanEvent("mux.complete", { lessonId, playbackId })
  }, [lessonId, playbackId, saveLocalProgress, saveServerProgress, onComplete])
  
  const handleError = useCallback((event: any) => {
    const error = event?.detail?.error || event?.error
    console.error("[MuxPlayer] Error:", error)
    
    // Token expired - refresh without re-render
    if (error?.code === 403 && requiresToken) {
      console.log("[MuxPlayer] Token expired, refreshing...")
      refreshToken()
    }
    
    addSpanEvent("mux.error", {
      lessonId,
      playbackId,
      error: error?.message || "Unknown error"
    })
  }, [lessonId, playbackId, requiresToken, refreshToken])
  
  // Setup token refresh on mount
  useEffect(() => {
    if (requiresToken) {
      if (!initialToken) {
        refreshToken()
      } else {
        // Schedule refresh for initial token
        setTimeout(refreshToken, 3540000) // 59 minutes
      }
    }
  }, []) // Empty deps - only run once
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending saves
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current)
      }
      
      // Send final progress
      const player = playerRef.current
      if (player && !player.paused) {
        const position = Math.floor(player.currentTime)
        const endpoint = isSubLesson ? `/api/progress/sub-lessons/${lessonId}` : `/api/progress/${lessonId}`
        navigator.sendBeacon(endpoint, JSON.stringify({ positionSeconds: position }))
      }
    }
  }, [lessonId, isSubLesson])
  
  // Tab visibility handling - no state updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      const player = playerRef.current
      if (!player) return
      
      if (document.hidden) {
        // Going hidden - save state
        if (!player.paused) {
          isPlayingRef.current = true
        }
        
        // Flush progress
        if (progressSaveTimerRef.current) {
          clearTimeout(progressSaveTimerRef.current)
          saveServerProgress(Math.floor(player.currentTime))
        }
      } else {
        // Becoming visible - resume if was playing
        if (isPlayingRef.current && player.paused) {
          player.play().catch(e => {
            console.warn('[MuxPlayer] Failed to auto-resume:', e)
          })
        }
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [saveServerProgress])
  
  // Generate thumbnail URL
  const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${thumbnailTime}`
  
  // All props are stable - no conditional props, no state-derived props
  return (
    <div 
      className={className}
      style={{
        // @ts-ignore - CSS variables
        '--media-primary-color': '#17ADE9',
        '--media-secondary-color': '#ffffff',
        '--media-control-background': 'rgba(0, 0, 0, 0.7)',
        '--media-control-hover-background': 'rgba(0, 0, 0, 0.8)',
        '--media-font-family': 'inherit',
        '--media-time-range-track-height': '4px',
        '--media-time-range-thumb-width': '14px',
        '--media-time-range-thumb-height': '14px',
        '--media-control-height': '44px',
        '--media-preview-thumbnail-border': '2px solid #17ADE9',
      } as React.CSSProperties}
    >
      <MuxPlayer
        key={lessonId} // Stable key
        ref={playerRef}
        playbackId={playbackId}
        tokens={requiresToken && tokenRef.current ? { playback: tokenRef.current } : undefined}
        metadata={{
          video_id: lessonId,
          video_title: title,
          viewer_user_id: user?.id || "anonymous"
        }}
        streamType="on-demand"
        autoPlay={false}
        poster={posterUrl}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        // Player features - all stable
        forwardSeekOffset={10}
        backwardSeekOffset={10}
        playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 2]}
        crossOrigin="anonymous"
        playsInline
      />
    </div>
  )
}
