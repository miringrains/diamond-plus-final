"use client"

import { useEffect, useRef, useState } from "react"
import Plyr from "plyr"
import Hls from "hls.js"
import "plyr/dist/plyr.css"
import { addSpanEvent } from "@/lib/telemetry"
import { resumeVideo, createResumeFallback } from "@/lib/reliable-video-resume"

interface VideoIslandProps {
  lessonId: string
  videoUrl: string
  title: string
  initialTime?: number
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  className?: string
}

/**
 * VideoIsland - DOM-isolated video player component
 * 
 * This component creates a separate DOM subtree for the video player,
 * preventing React reconciliation from causing DOM mutations that lead
 * to 419 errors and insertBefore issues.
 * 
 * Key patterns:
 * - Never SSR the video element
 * - Create player in a DOM island outside React's control
 * - Proper cleanup on unmount and page navigation
 * - Handle BFCache (back/forward cache) properly
 */
export function VideoIsland({
  lessonId,
  videoUrl,
  title,
  initialTime = 0,
  onProgress,
  onComplete,
  className = ""
}: VideoIslandProps) {
  const containerIdRef = useRef(`video-island-${lessonId}`)
  const playerRef = useRef<Plyr | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const progressIntervalRef = useRef<number | null>(null)
  const lastProgressRef = useRef<number>(0)

  // Cleanup function
  const cleanup = () => {
    console.log(`[VideoIsland] Cleaning up for lesson ${lessonId}`)
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Abort any in-flight operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Destroy HLS
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy()
      } catch (e) {
        console.warn('[VideoIsland] Error destroying HLS:', e)
      }
      hlsRef.current = null
    }

    // Destroy Plyr
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
      } catch (e) {
        console.warn('[VideoIsland] Error destroying Plyr:', e)
      }
      playerRef.current = null
    }

    // Remove video element
    if (videoRef.current) {
      try {
        // Stop all media tracks
        if (videoRef.current.srcObject && 'getTracks' in videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop())
        }
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current)
        }
      } catch (e) {
        console.warn('[VideoIsland] Error removing video element:', e)
      }
      videoRef.current = null
    }

    // Mark container as uninitialized
    const container = document.getElementById(containerIdRef.current)
    if (container) {
      container.dataset.initialized = "false"
      // Use textContent instead of innerHTML to avoid parsing
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }

    setIsInitialized(false)
  }

  // Initialize player
  const initializePlayer = async () => {
    const container = document.getElementById(containerIdRef.current)
    if (!container || container.dataset.initialized === "true") {
      console.log(`[VideoIsland] Container already initialized or not found`)
      return
    }

    try {
      // Create abort controller for this initialization
      abortControllerRef.current = new AbortController()
      const { signal } = abortControllerRef.current

      // Mark as initialized
      container.dataset.initialized = "true"
      setIsInitialized(true)

      // Create video element (never in SSR)
      const video = document.createElement("video")
      video.className = "plyr__video-embed w-full h-full"
      video.setAttribute("playsinline", "")
      video.setAttribute("crossorigin", "anonymous")
      videoRef.current = video
      container.appendChild(video)

      // Check if HLS is needed
      const isHLS = videoUrl.includes(".m3u8")
      
      if (isHLS && Hls.isSupported()) {
        console.log(`[VideoIsland] Initializing HLS for ${videoUrl}`)
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30
        })
        hlsRef.current = hls
        
        hls.loadSource(videoUrl)
        hls.attachMedia(video)
        
        // Wait for manifest to be parsed
        await new Promise<void>((resolve, reject) => {
          const onManifestParsed = () => {
            hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed)
            hls.off(Hls.Events.ERROR, onError)
            resolve()
          }
          const onError = (_: any, data: any) => {
            if (data.fatal) {
              hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed)
              hls.off(Hls.Events.ERROR, onError)
              reject(new Error(data.details))
            }
          }
          
          if (signal.aborted) {
            reject(new Error("Aborted"))
            return
          }
          
          hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed)
          hls.on(Hls.Events.ERROR, onError)
        })
      } else {
        // Regular video
        video.src = videoUrl
      }

      // Initialize Plyr
      const player = new Plyr(video, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'fullscreen'
        ],
        settings: ['captions', 'quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        keyboard: { focused: true, global: false }
      })
      playerRef.current = player

      // Wait for player ready
      await new Promise<void>((resolve) => {
        const onReady = () => {
          player.off('ready', onReady)
          resolve()
        }
        player.on('ready', onReady)
      })

      if (signal.aborted) {
        throw new Error("Aborted")
      }

      // Resume at initial time using reliable method
      if (initialTime > 0) {
        resumeVideo({
          player,
          targetTime: initialTime,
          onFallback: () => {
            // If automatic resume fails, show user button
            console.log('[VideoIsland] Auto-resume failed, showing fallback button')
            createResumeFallback(container, initialTime, () => {
              player.currentTime = initialTime
            })
          }
        }).then(success => {
          if (success) {
            addSpanEvent('video.resume.success', {
              lessonId,
              targetTime: initialTime,
              actualTime: player.currentTime
            })
          } else {
            addSpanEvent('video.resume.failed', {
              lessonId,
              targetTime: initialTime,
              reason: 'seek_failed'
            })
          }
        })
      }

      // Set up progress tracking
      if (onProgress) {
        progressIntervalRef.current = window.setInterval(() => {
          if (player.playing && player.currentTime !== lastProgressRef.current) {
            lastProgressRef.current = Math.floor(player.currentTime)
            onProgress(lastProgressRef.current)
          }
        }, 1000)
      }

      // Handle completion
      if (onComplete) {
        player.on('ended', onComplete)
      }

      // Error handling
      player.on('error', (event: any) => {
        console.error('[VideoIsland] Player error:', event)
        setError('Failed to load video')
      })

      addSpanEvent('video.island.initialized', {
        lessonId,
        isHLS,
        initialTime,
        videoUrl: videoUrl.substring(0, 50) + '...'
      })

    } catch (err) {
      console.error('[VideoIsland] Failed to initialize:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize player')
      cleanup()
    }
  }

  // Handle page visibility for BFCache
  useEffect(() => {
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[VideoIsland] Page hidden (BFCache), cleaning up')
        cleanup()
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !isInitialized) {
        console.log('[VideoIsland] Page shown (BFCache), reinitializing')
        initializePlayer()
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [lessonId, videoUrl, isInitialized])

  // Main initialization effect
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initializePlayer()
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      cleanup()
    }
  }, [lessonId, videoUrl])

  // Render only the container - no React-controlled video elements
  return (
    <div className={className}>
      <div 
        id={containerIdRef.current}
        key={`island-${lessonId}`}
        data-lesson-id={lessonId}
        data-initialized="false"
        className="w-full h-full bg-black rounded-lg overflow-hidden relative"
        suppressHydrationWarning
      >
        {/* Player will be mounted here by the island code */}
        {!isInitialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white">Loading video...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-red-500 text-center p-4">
              <p className="font-semibold">Video Error</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
