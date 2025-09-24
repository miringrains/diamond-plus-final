"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type { MuxPlayerRefAttributes } from "@mux/mux-player-react"
import { addSpanEvent } from "@/lib/telemetry"
// Removed NextAuth import - auth handled server-side
// Removed debounce - using timer refs instead

interface MuxPlayerEnhancedProps {
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
  // Optional thumbnail time
  thumbnailTime?: number
  // Lesson type
  isSubLesson?: boolean
}

// Local storage key for progress
const getProgressKey = (lessonId: string) => `lesson-progress-${lessonId}`

export function MuxPlayerEnhanced({
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
  isSubLesson = true
}: MuxPlayerEnhancedProps) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  // Auth session handled server-side
  
  // All dynamic state in refs to prevent re-renders
  const tokenRef = useRef<string | undefined>(initialToken)
  const tokensRef = useRef<any>({})
  const lastProgressRef = useRef<number>(0)
  const hasAppliedStartTimeRef = useRef(false)
  const retryCountRef = useRef(0)
  const wasPlayingRef = useRef(false)
  const progressSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tokenRetryCountRef = useRef(0)
  const tokenTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Store initial time in a ref - never changes during playback
  const initialStartTimeRef = useRef(getInitialTime())

  // Token refresh with retry logic
  const refreshToken = useCallback(async (retryCount = 0) => {
    if (!requiresToken) return
    
    // Set loading state on first attempt
    if (retryCount === 0) {
      setTokenLoading(true)
      tokenRetryCountRef.current = 0
      
      // Set a timeout to show error if token fetch takes too long
      if (tokenTimeoutRef.current) {
        clearTimeout(tokenTimeoutRef.current)
      }
      tokenTimeoutRef.current = setTimeout(() => {
        if (!tokensRef.current.playback) {
          setError("Unable to load video. Please refresh the page.")
          setTokenLoading(false)
        }
      }, 15000) // 15 second timeout
    }
    
    try {
      const response = await fetch('/api/mux/multi-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbackId,
          lessonId
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Store all tokens
      tokensRef.current = data.tokens
      tokenRef.current = data.tokens.playback
      
      // Clear timeout and loading state
      if (tokenTimeoutRef.current) {
        clearTimeout(tokenTimeoutRef.current)
      }
      setTokenLoading(false)
      setError(null)
      
      // Debug log the tokens
      console.log("[MuxPlayer] Tokens refreshed:", {
        playbackId,
        hasPlayback: !!data.tokens.playback,
        hasStoryboard: !!data.tokens.storyboard,
        hasThumbnail: !!data.tokens.thumbnail,
        expiresIn: data.expiresIn
      })
      
      // Update player directly without re-render
      const player = playerRef.current
      if (player) {
        // @ts-ignore - Direct property access
        player.tokens = data.tokens
      }
      
      // Schedule next refresh
      const refreshIn = (data.expiresIn - 60) * 1000
      setTimeout(() => refreshToken(0), Math.max(refreshIn, 30000))
    } catch (err: any) {
      console.error("[MuxPlayer] Token refresh failed:", err)
      
      // Retry with exponential backoff
      if (retryCount < 3) {
        tokenRetryCountRef.current = retryCount + 1
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000)
        console.log(`[MuxPlayer] Retrying token fetch in ${retryDelay}ms (attempt ${retryCount + 1}/3)`)
        setTimeout(() => refreshToken(retryCount + 1), retryDelay)
      } else {
        // All retries failed
        setError(err.message.includes('403') ? 
          "Access denied. Please check your permissions." : 
          "Unable to load video. Please try again."
        )
        setTokenLoading(false)
        if (tokenTimeoutRef.current) {
          clearTimeout(tokenTimeoutRef.current)
        }
      }
    }
  }, [requiresToken, playbackId, lessonId])

  // Store previous playbackId to detect changes
  const prevPlaybackIdRef = useRef(playbackId)
  
  // Initial token setup and refresh scheduling
  useEffect(() => {
    // Check if playbackId changed
    if (prevPlaybackIdRef.current !== playbackId) {
      console.log("[MuxPlayer] PlaybackId changed!", {
        old: prevPlaybackIdRef.current,
        new: playbackId
      })
      prevPlaybackIdRef.current = playbackId
    }
    
    console.log("[MuxPlayer] Initial setup:", {
      requiresToken,
      hasInitialToken: !!initialToken,
      playbackId,
      tokenPreview: initialToken ? initialToken.substring(0, 50) + '...' : 'none'
    })
    
    if (requiresToken && !initialToken) {
      refreshToken(0)
    } else if (requiresToken && initialToken) {
      // Initial token is just playback, we need all tokens
      tokenRef.current = initialToken
      // Immediately fetch all token types
      refreshToken(0)
    }
  }, [requiresToken, initialToken, refreshToken, playbackId])

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

  // Progress save to server - no debounce, using timer instead
  const saveServerProgress = useCallback(async (position: number) => {
    try {
      const player = playerRef.current
      const duration = player ? Math.floor(player.duration || 0) : 0
      const completed = duration > 0 && position >= duration * 0.9
      
      const endpoint = isSubLesson ? `/api/progress/sub-lessons/${lessonId}` : `/api/progress/${lessonId}`
      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          positionSeconds: Math.floor(position),
          durationSeconds: duration,
          watchTime: Math.floor(position), // For backwards compatibility
          completed
        })
      })
    } catch (e) {
      console.error("[MuxPlayer] Failed to save server progress:", e)
    }
  }, [lessonId, isSubLesson])
  
  // Schedule progress save using timer ref
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

  // Handle time updates - less aggressive to avoid player interference
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current
    if (!player || isSeekingRef.current) return // Don't update while seeking

    const position = player.currentTime

    // Only update if position changed significantly (5 seconds)
    if (Math.abs(position - lastProgressRef.current) >= 5) {
      lastProgressRef.current = position
      
      // Save to localStorage with a small delay to batch updates
      setTimeout(() => saveLocalProgress(position), 100)
      
      // If parent is handling progress, let it handle server saves
      if (onProgress) {
        onProgress(Math.floor(position))
      } else {
        // Otherwise, schedule server save internally
        scheduleProgressSave(position)
      }
    }
  }, [saveLocalProgress, scheduleProgressSave, onProgress])

  // Flush progress on unmount or visibility change
  const flushProgress = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const position = Math.floor(player.currentTime)
    const duration = Math.floor(player.duration || 0)
    
    // Clear any pending saves
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current)
    }
    
    // Calculate if completed (watched 90% or more)
    const completed = duration > 0 && position >= duration * 0.9
    
    // Prepare full progress data
    const progressData = { 
      positionSeconds: position,
      durationSeconds: duration,
      watchTime: position, // For backwards compatibility
      completed
    }
    
    // Send final progress synchronously
    const endpoint = isSubLesson ? `/api/progress/sub-lessons/${lessonId}` : `/api/progress/${lessonId}`
    
    // Try sendBeacon first
    const sent = navigator.sendBeacon(endpoint, JSON.stringify(progressData))

    
    // If beacon fails, try synchronous XHR as fallback
    if (!sent) {
      try {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', endpoint, false) // false = synchronous
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(JSON.stringify(progressData))

      } catch (e) {
        console.error('[MuxPlayer] Fallback sync XHR failed:', e)
      }
    }
    
    // Also save to localStorage for immediate UI updates
    saveLocalProgress(position)
  }, [lessonId, isSubLesson, saveLocalProgress])

  // Setup visibility change and unmount handlers
  useEffect(() => {
    const handleVisibilityChange = () => {
      const player = playerRef.current
      if (document.hidden) {
        // Save play state before hiding
        if (player && !player.paused) {
          wasPlayingRef.current = true
        }
        flushProgress()
      } else {
        // Resume if was playing before
        if (player && wasPlayingRef.current && player.paused) {
          console.log('[MuxPlayer] Resuming playback after tab restore')
          player.play().catch(e => {
            console.warn('[MuxPlayer] Failed to auto-resume:', e)
          })
          wasPlayingRef.current = false
        }
      }
    }

    const handlePageHide = () => {
      flushProgress()
    }
    
    const handleBeforeUnload = () => {
      flushProgress()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      flushProgress()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [flushProgress])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current)
      }
      if (tokenTimeoutRef.current) {
        clearTimeout(tokenTimeoutRef.current)
      }
    }
  }, [])

  // Handle player ready - apply resume time exactly once
  const handleLoadedMetadata = useCallback(() => {
    const player = playerRef.current
    if (!player || hasAppliedStartTimeRef.current) return
    
    // Apply start time exactly once after metadata loads
    if (initialStartTimeRef.current > 0) {
      // Mark as applied immediately to prevent race conditions
      hasAppliedStartTimeRef.current = true
      
      // Use requestAnimationFrame for better timing with HLS
      requestAnimationFrame(() => {
        if (player && player.readyState >= 1) {
          player.currentTime = initialStartTimeRef.current

        }
      })
    }
  }, [])

  // Handle errors with retry logic
  const handleError = useCallback((event: any) => {
    const error = event?.detail?.error || event?.error || event
    console.error("[MuxPlayer] Error event:", {
      error,
      detail: event?.detail,
      type: event?.type,
      currentToken: tokenRef.current ? 'present' : 'missing',
      playbackId,
      requiresToken
    })
    
    // Check if it's a 403 (token expired)
    if ((error?.code === 403 || error?.message?.includes('403')) && requiresToken) {
      console.log("[MuxPlayer] Token expired/invalid, refreshing...")
      refreshToken(0)
    }
    // Check for invalid playback URL error
    else if (error?.message?.includes('Invalid playback URL')) {
      console.error("[MuxPlayer] Invalid playback URL - token/policy mismatch", {
        requiresToken,
        hasToken: !!tokenRef.current,
        playbackId,
        error: error.message
      })
      setError("Video configuration error. The video may not be set up for the expected playback mode.")
    } 
    // Check for network errors and retry
    else if (error?.code === 'NETWORK_ERROR' || error?.code === 2 || error?.code === 3) {
      retryCountRef.current++
      if (retryCountRef.current < 3) {
        console.log(`[MuxPlayer] Network error, retrying (${retryCountRef.current}/3)...`)
        setTimeout(() => {
          const player = playerRef.current
          if (player) {
            player.load()
          }
        }, 1000 * retryCountRef.current) // Exponential backoff
      } else {
        setError("Network error - please check your connection")
        retryCountRef.current = 0
      }
    } else {
      setError(error?.message || "Playback error occurred")
      addSpanEvent("mux.error", {
        lessonId,
        playbackId,
        error: error?.message || "Unknown error"
      })
    }
  }, [lessonId, playbackId, requiresToken, refreshToken])

  // Track seeking state
  const isSeekingRef = useRef(false)
  
  // Handle play event
  const handlePlay = useCallback(() => {
    console.log("[MuxPlayer] Video playing")
    wasPlayingRef.current = true
    retryCountRef.current = 0 // Reset retry count on successful play
    addSpanEvent("mux.play", { lessonId, playbackId })
  }, [lessonId, playbackId])

  // Handle pause event
  const handlePause = useCallback(() => {
    console.log("[MuxPlayer] Video paused")
    wasPlayingRef.current = false
    
    // Flush any pending saves immediately (unless seeking)
    if (progressSaveTimerRef.current && !isSeekingRef.current) {
      clearTimeout(progressSaveTimerRef.current)
      const player = playerRef.current
      if (player) {
        saveServerProgress(Math.floor(player.currentTime))
      }
    }
    
    addSpanEvent("mux.pause", { lessonId, playbackId })
  }, [lessonId, playbackId, saveServerProgress])
  
  // Handle seeking
  const handleSeeking = useCallback(() => {
    isSeekingRef.current = true
    console.log("[MuxPlayer] Seeking started")
  }, [])
  
  const handleSeeked = useCallback(() => {
    isSeekingRef.current = false
    console.log("[MuxPlayer] Seeking completed")
    // Save new position after seek completes
    const player = playerRef.current
    if (player) {
      const position = Math.floor(player.currentTime)
      lastProgressRef.current = position
      saveLocalProgress(position)
      addSpanEvent("mux.seeked", { lessonId, position })
    }
  }, [lessonId, saveLocalProgress])

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
                tokenRetryCountRef.current = 0
                refreshToken(0)
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

  // Generate thumbnail URL
  const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${thumbnailTime}`
  
  // Debug current state
  console.log('[MuxPlayer] Render state:', {
    playbackId,
    requiresToken,
    hasToken: !!tokenRef.current,
    tokenLength: tokenRef.current?.length,
    tokenPreview: tokenRef.current ? tokenRef.current.substring(0, 50) + '...' : 'none'
  })
  
  // Don't render player if token is required but not available yet
  if (requiresToken && !tokensRef.current.playback && !error) {
    console.log('[MuxPlayer] Waiting for tokens...', {
      requiresToken,
      hasTokens: !!tokensRef.current.playback,
      initialToken: !!initialToken,
      tokenLoading,
      error
    })
    return (
      <div className={className}>
        <div className="w-full h-full bg-black rounded-lg flex items-center justify-center">
          <div className="text-white flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <div>Loading secure video...</div>
            {tokenRetryCountRef.current > 0 && (
              <div className="text-sm text-gray-400">
                Retry attempt {tokenRetryCountRef.current}/3
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black shadow-2xl ${className}`}>
      <MuxPlayer
        key={lessonId}
        ref={playerRef}
        playbackId={playbackId}
        tokens={requiresToken && tokensRef.current.playback ? tokensRef.current : undefined}
        metadata={{
          videoId: lessonId,
          videoTitle: title,
          viewerUserId: "admin"
        }}
        streamType="on-demand"
        autoPlay={false}
        poster={posterUrl}
        preload="auto"
        accentColor="#3b82f6"
        primaryColor="#ffffff"
        secondaryColor="rgba(0, 0, 0, 0.7)"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={(e) => {
          console.log('[MuxPlayer] Pause event triggered', {
            currentTime: playerRef.current?.currentTime,
            paused: playerRef.current?.paused,
            readyState: playerRef.current?.readyState,
            event: e
          });
          handlePause();
        }}
        onEnded={handleEnded}
        onError={handleError}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onWaiting={() => console.warn('[MuxPlayer] Video buffering/waiting')}
        onStalled={() => console.warn('[MuxPlayer] Video stalled')}
        // Player features
        forwardSeekOffset={10}
        backwardSeekOffset={10}
        playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 2]}
        crossOrigin="anonymous"
        playsInline
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}
