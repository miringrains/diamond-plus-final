"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import Hls from 'hls.js'
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface VideoPlayerEnhancedProps {
  src: string
  poster?: string
  title?: string
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  onReady?: (player: Plyr) => void
  initialTime?: number
  className?: string
  disableKeyboard?: boolean
  disableDownload?: boolean
  disableContextMenu?: boolean
}

export const VideoPlayerEnhanced = React.forwardRef<Plyr, VideoPlayerEnhancedProps>(({
  src,
  poster,
  title,
  onProgress,
  onComplete,
  onReady,
  initialTime = 0,
  className = "",
  disableKeyboard = false,
  disableDownload = false,
  disableContextMenu = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Plyr | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showResumeOverlay, setShowResumeOverlay] = useState(false)
  const resumeAttemptedRef = useRef(false)
  const callbacksRef = useRef({ onProgress, onComplete, onReady })
  
  // Update callbacks ref without triggering re-initialization
  useEffect(() => {
    callbacksRef.current = { onProgress, onComplete, onReady }
  }, [onProgress, onComplete, onReady])
  
  // Expose the player instance through ref
  React.useImperativeHandle(ref, () => playerRef.current as Plyr)

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Stable callback for progress updates
  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current && callbacksRef.current.onProgress) {
      callbacksRef.current.onProgress(Math.floor(playerRef.current.currentTime))
    }
  }, [])

  // Stable callback for completion
  const handleEnded = useCallback(() => {
    if (callbacksRef.current.onComplete) {
      callbacksRef.current.onComplete()
    }
  }, [])

  // Initialize player - only runs when src changes
  useEffect(() => {
    if (!videoRef.current || !src) return

    // Guard against double initialization
    if (videoRef.current.dataset._plyrInit === 'true') {
      console.log('[VideoPlayer] Player already initialized, skipping')
      return
    }

    console.log(`[VideoPlayer] Initializing with src: ${src}, initialTime: ${initialTime}`)
    
    // Reset resume flag when src changes
    resumeAttemptedRef.current = false

    const initializePlayer = () => {
      try {
        // Cleanup existing player
        if (playerRef.current) {
          playerRef.current.destroy()
          playerRef.current = null
        }
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
        
        // Mark as initialized to prevent double-init
        videoRef.current!.dataset._plyrInit = 'true'

        // Plyr options
        const controls = [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'captions',
          'settings',
          'pip',
          'airplay',
          'fullscreen'
        ]
        
        if (!disableDownload) {
          controls.push('download')
        }
        
        const options: Plyr.Options = {
          controls,
          settings: ['captions', 'quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          keyboard: disableKeyboard ? { focused: false, global: false } : { focused: true, global: false },
          tooltips: { controls: true, seek: true },
          fullscreen: { iosNative: true },
          disableContextMenu: disableContextMenu,
          autoplay: false, // Don't autoplay - let user resume manually
          autopause: true,
          clickToPlay: true
        }

        // Check if HLS is needed
        if (src.endsWith('.m3u8') || src.includes('master.m3u8')) {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
            })
            
            hlsRef.current = hls
            hls.loadSource(src)
            
            if (videoRef.current) {
              hls.attachMedia(videoRef.current)
              
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (videoRef.current) {
                  // Set initial time before Plyr initialization
                  if (initialTime > 0) {
                    videoRef.current.currentTime = initialTime
                    console.log(`[VideoPlayer] Set HLS video.currentTime to ${initialTime}s before Plyr init`)
                  }
                  
                  playerRef.current = new Plyr(videoRef.current, options)
                  setupPlayerEvents()
                  setIsLoading(false)
                }
              })
            }

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                setError(`Video loading error: ${data.type}`)
                setIsLoading(false)
              }
            })
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoRef.current.src = src
            
            // Set initial time before Plyr initialization
            if (initialTime > 0) {
              videoRef.current.currentTime = initialTime
              console.log(`[VideoPlayer] Set Safari HLS video.currentTime to ${initialTime}s before Plyr init`)
            }
            
            playerRef.current = new Plyr(videoRef.current, options)
            setupPlayerEvents()
          } else {
            setError('HLS is not supported in this browser')
            setIsLoading(false)
          }
        } else {
          // Regular video file
          if (videoRef.current) {
            videoRef.current.src = src
            
            playerRef.current = new Plyr(videoRef.current, options)
            
            // Force initial time after Plyr initialization
            if (initialTime > 0) {
              // Wait for next tick to ensure Plyr is fully initialized
              setTimeout(() => {
                if (playerRef.current && videoRef.current) {
                  console.log(`[VideoPlayer] Forcing initial seek to ${initialTime}s after Plyr init`)
                  playerRef.current.currentTime = initialTime
                  playerRef.current.pause()
                  setShowResumeOverlay(true)
                }
              }, 0)
            }
            
            setupPlayerEvents()
          }
        }
      } catch (err) {
        console.error('Player initialization error:', err)
        setError('Failed to initialize video player')
        setIsLoading(false)
      }
    }

    // Store event handlers for cleanup
    let handleLoadedMetadata: (() => void) | null = null
    let handleCanPlay: (() => void) | null = null
    
    const setupPlayerEvents = () => {
      if (!playerRef.current || !videoRef.current) return

      const video = videoRef.current
      const player = playerRef.current

      // Resume position when metadata loads
      handleLoadedMetadata = () => {
        console.log(`[VideoPlayer] loadedmetadata fired. InitialTime: ${initialTime}, Duration: ${video.duration}, Attempted: ${resumeAttemptedRef.current}`)
        
        // Only attempt resume if we have valid conditions
        if (!resumeAttemptedRef.current && initialTime > 0 && !isNaN(video.duration) && video.duration > 0) {
          resumeAttemptedRef.current = true
          
          // Don't try to seek past the video duration
          const maxSeekTime = Math.max(0, video.duration - 0.1) // Leave 0.1s buffer
          const clampedTime = Math.min(initialTime, maxSeekTime)
          
          // Skip if the seek position is too close to the end (within 0.5s)
          if (video.duration - clampedTime < 0.5) {
            console.log(`[VideoPlayer] Skipping seek - too close to end (duration: ${video.duration}s, seek: ${clampedTime}s)`)
            return
          }
          
          console.log(`[VideoPlayer] Attempting to seek to ${clampedTime}s (video duration: ${video.duration}s)`)
          
          // Check player is still valid
          if (!playerRef.current) {
            console.log(`[VideoPlayer] Player not ready, will retry later`)
            resumeAttemptedRef.current = false // Allow retry
            return
          }
          
          try {
            // Seek to position and ensure video is paused
            playerRef.current.currentTime = clampedTime
            playerRef.current.pause()
          } catch (e) {
            console.error(`[VideoPlayer] Error seeking:`, e)
            resumeAttemptedRef.current = false // Allow retry
            return
          }
          
          // Force a second attempt after a small delay to ensure it sticks
          setTimeout(() => {
            if (playerRef.current && playerRef.current.currentTime < clampedTime - 1) {
              console.log(`[VideoPlayer] Resume didn't stick, trying again. Current: ${playerRef.current.currentTime}s`)
              playerRef.current.currentTime = clampedTime
              playerRef.current.pause()
            }
          }, 100)
          
          // Show resume overlay only if we successfully set the position
          setTimeout(() => {
            if (playerRef.current && Math.abs(playerRef.current.currentTime - clampedTime) < 1) {
              setShowResumeOverlay(true)
            }
          }, 200)
          
          // Show the big play button to indicate resume point
          if (player.elements && player.elements.buttons && player.elements.buttons.play) {
            const playButtons = Array.isArray(player.elements.buttons.play) 
              ? player.elements.buttons.play 
              : [player.elements.buttons.play]
            playButtons.forEach((button: HTMLElement) => {
              button.setAttribute('data-plyr', 'play')
            })
          }
          
          console.log(`[VideoPlayer] Resume setup complete at ${clampedTime}s`)
        } else {
          console.log(`[VideoPlayer] Not resuming. Conditions not met.`)
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      
      // Backup: also try on canplay event
      handleCanPlay = () => {
        if (!resumeAttemptedRef.current && initialTime > 0 && playerRef.current && handleLoadedMetadata) {
          console.log(`[VideoPlayer] canplay fired, checking if we need to resume`)
          handleLoadedMetadata()
        }
      }
      video.addEventListener('canplay', handleCanPlay)

      // Player ready event
      player.on('ready', () => {
        console.log(`[VideoPlayer] Player ready. Current time: ${player.currentTime}s`)
        setIsLoading(false)
        if (callbacksRef.current.onReady) {
          callbacksRef.current.onReady(player)
        }
        
        // Try to resume if metadata already loaded
        if (!resumeAttemptedRef.current && initialTime > 0 && !isNaN(video.duration) && handleLoadedMetadata) {
          console.log(`[VideoPlayer] Trying resume in ready event`)
          handleLoadedMetadata()
        }
        
        // Ensure video doesn't autoplay if we have a resume position
        if (initialTime > 0) {
          player.pause()
        }
      })

      // Progress tracking
      player.on('timeupdate', handleTimeUpdate)
      player.on('pause', handleTimeUpdate)

      // Hide resume overlay when playing
      player.on('play', () => {
        setShowResumeOverlay(false)
      })

      // Completion tracking
      player.on('ended', handleEnded)

      // Error handling
      player.on('error', () => {
        setError('Failed to load video')
        setIsLoading(false)
      })
    }

    initializePlayer()

    // Cleanup
    return () => {
      // Copy refs to avoid issues with changed values
      const video = videoRef.current
      const hls = hlsRef.current
      const player = playerRef.current
      
      // Remove event listeners if video element exists and handlers exist
      if (video) {
        // Clear init flag to allow re-initialization
        delete video.dataset._plyrInit
        
        if (handleLoadedMetadata) {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }
        if (handleCanPlay) {
          video.removeEventListener('canplay', handleCanPlay)
        }
      }
      
      if (hls) {
        hls.destroy()
      }
      if (player) {
        player.destroy()
      }
      
      // Reset refs
      hlsRef.current = null
      playerRef.current = null
      resumeAttemptedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, disableDownload, disableKeyboard, disableContextMenu, handleTimeUpdate, handleEnded])

  // Update resume position when it changes (without reinitializing player)
  useEffect(() => {
    if (playerRef.current && videoRef.current && !resumeAttemptedRef.current && initialTime > 0) {
      const video = videoRef.current
      if (!isNaN(video.duration) && video.duration > 0) {
        resumeAttemptedRef.current = true
        const clampedTime = Math.max(0, Math.min(initialTime, video.duration - 2))
        playerRef.current.currentTime = clampedTime
      }
    }
  }, [initialTime])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (disableKeyboard) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!playerRef.current) return

      // Don't handle if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          playerRef.current.togglePlay()
          break
        case 'f':
          e.preventDefault()
          playerRef.current.fullscreen.toggle()
          break
        case 'ArrowLeft':
          e.preventDefault()
          playerRef.current.rewind(10)
          break
        case 'ArrowRight':
          e.preventDefault()
          playerRef.current.forward(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          playerRef.current.increaseVolume(0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          playerRef.current.decreaseVolume(0.1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [disableKeyboard])

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`relative ${className}`} suppressHydrationWarning={true}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80" suppressHydrationWarning={true}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading video...</p>
          </div>
        </div>
      )}
      
      {showResumeOverlay && initialTime > 0 && (
        <div className="absolute top-4 left-4 z-20 bg-black/80 text-white px-4 py-2 rounded-lg animate-in fade-in duration-300" suppressHydrationWarning={true}>
          <p className="text-sm font-medium" suppressHydrationWarning={true}>Resume from {formatTime(initialTime)}</p>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="plyr__video-embed w-full"
        poster={poster}
        title={title}
        crossOrigin="anonymous"
        playsInline
        controls
        controlsList={disableDownload ? "nodownload noremoteplayback" : undefined}
        onContextMenu={disableContextMenu ? (e) => e.preventDefault() : undefined}
        suppressHydrationWarning={true}
      >
        <span suppressHydrationWarning={true}>Your browser does not support the video tag.</span>
      </video>
    </div>
  )
})

VideoPlayerEnhanced.displayName = "VideoPlayerEnhanced"

// Loading skeleton for video player
export function VideoPlayerSkeleton({ className = "" }: { className?: string }) {
  return (
    <Skeleton className={`aspect-video w-full ${className}`} />
  )
}
