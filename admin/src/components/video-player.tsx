"use client"

import React, { useEffect, useRef, useState } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import Hls from 'hls.js'
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface VideoPlayerProps {
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

export const VideoPlayer = React.forwardRef<Plyr, VideoPlayerProps>(({
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
  const [hasResumed, setHasResumed] = useState(false)
  const [metadataLoaded, setMetadataLoaded] = useState(false)
  
  // Expose the player instance through ref
  React.useImperativeHandle(ref, () => playerRef.current as Plyr)

  // Initialize player
  useEffect(() => {
    if (!videoRef.current) return

    const initializePlayer = () => {
      try {
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
        
        // Remove download button if disabled
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
          disableContextMenu: disableContextMenu
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
            setupPlayerEvents()
          }
        }
      } catch (err) {
        console.error('Player initialization error:', err)
        setError('Failed to initialize video player')
        setIsLoading(false)
      }
    }

    const setupPlayerEvents = () => {
      if (!playerRef.current || !videoRef.current) return

      // Listen for metadata to be loaded
      videoRef.current.addEventListener('loadedmetadata', () => {
        setMetadataLoaded(true)
      })

      // Player ready event
      playerRef.current.on('ready', () => {
        setIsLoading(false)
        onReady?.(playerRef.current!)
      })

      // Progress tracking - single source of truth
      if (onProgress) {
        playerRef.current.on('timeupdate', () => {
          if (playerRef.current) {
            onProgress(Math.floor(playerRef.current.currentTime))
          }
        })

        // Handle pause event for immediate progress save
        playerRef.current.on('pause', () => {
          if (playerRef.current) {
            onProgress(Math.floor(playerRef.current.currentTime))
          }
        })
      }

      // Completion tracking
      if (onComplete) {
        playerRef.current.on('ended', () => {
          onComplete()
        })
      }

      // Error handling
      playerRef.current.on('error', () => {
        setError('Failed to load video')
        setIsLoading(false)
      })
    }

    initializePlayer()

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [src, onProgress, onComplete, onReady])

  // Handle resume when metadata is loaded
  useEffect(() => {
    if (metadataLoaded && initialTime > 0 && !hasResumed && playerRef.current && videoRef.current) {
      const duration = videoRef.current.duration
      if (!isNaN(duration) && duration > 0) {
        // Clamp position to valid range (0 to duration - 2)
        const clampedTime = Math.max(0, Math.min(initialTime, duration - 2))
        playerRef.current.currentTime = clampedTime
        setHasResumed(true)
      }
    }
  }, [metadataLoaded, initialTime, hasResumed])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!playerRef.current) return

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
  }, [])

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading video...</p>
          </div>
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
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
})

VideoPlayer.displayName = "VideoPlayer"

// Loading skeleton for video player
export function VideoPlayerSkeleton({ className = "" }: { className?: string }) {
  return (
    <Skeleton className={`aspect-video w-full ${className}`} />
  )
}