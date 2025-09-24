"use client"

import { useEffect, useRef, useState } from "react"
import MuxPlayer from "@mux/mux-player-react"
import type { MuxPlayerRefAttributes } from "@mux/mux-player-react"
import { addSpanEvent } from "@/lib/telemetry"
import { useSession } from "next-auth/react"

interface MuxPlayerIslandProps {
  lessonId: string
  playbackId: string  // Mux playback ID instead of video URL
  title: string
  initialTime?: number
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  className?: string
  // Premium features
  enableCaptions?: boolean
  enableHotkeys?: boolean
  enableAirplay?: boolean
  enableChromecast?: boolean
  thumbnailTime?: number  // Poster frame time
}

/**
 * MuxPlayerIsland - Mux Player with DOM isolation
 * 
 * Key features:
 * - Resume "just works" - Mux handles it server-side
 * - Automatic quality switching
 * - Built-in analytics
 * - No need for HLS.js
 */
export function MuxPlayerIsland({
  lessonId,
  playbackId,
  title,
  initialTime = 0,
  onProgress,
  onComplete,
  className = "",
  enableCaptions = true,
  enableHotkeys = true,
  enableAirplay = true,
  enableChromecast = true,
  thumbnailTime = 0
}: MuxPlayerIslandProps) {
  const playerRef = useRef<MuxPlayerRefAttributes>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const progressIntervalRef = useRef<number | null>(null)
  const lastProgressRef = useRef<number>(0)
  const { data: session } = useSession()

  // Cleanup function
  const cleanup = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // Set up progress tracking
  useEffect(() => {
    if (!onProgress || !playerRef.current) return

    const updateProgress = () => {
      const player = playerRef.current
      if (player && !player.paused) {
        const currentTime = Math.floor(player.currentTime)
        if (currentTime !== lastProgressRef.current) {
          lastProgressRef.current = currentTime
          onProgress(currentTime)
        }
      }
    }

    progressIntervalRef.current = window.setInterval(updateProgress, 1000)

    return cleanup
  }, [onProgress])

  // Handle completion
  const handleEnded = () => {
    console.log(`[MuxPlayer] Video ended`)
    onComplete?.()
    
    addSpanEvent('video.complete.mux', {
      lessonId,
      playbackId
    })
  }

  // Handle errors
  const handleError = (event: any) => {
    console.error('[MuxPlayer] Error:', event)
    const message = event?.detail?.message || 'Video playback error'
    setError(message)
    
    addSpanEvent('video.error.mux', {
      lessonId,
      error: message,
      playbackId
    })
  }

  if (error) {
    return (
      <div className={`${className} bg-destructive/10 rounded-lg flex items-center justify-center`}>
        <div className="text-center p-8">
          <p className="text-destructive font-semibold text-lg mb-2">Video Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} relative`}>
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        title={title}
        
        // Premium resume features
        startTime={initialTime}
        
        // Metadata for Mux Data analytics
        metadata={{
          video_id: lessonId,
          video_title: title,
          viewer_user_id: session?.user?.id || 'anonymous',
          page_type: 'lesson',
          experiment: 'mux-premium', // Track this test
        }}
        
        // Mux Data - enhanced analytics
        envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY} // You'll add this to .env
        
        // Events
        onEnded={handleEnded}
        onError={handleError}
        onPlay={() => setHasInteracted(true)}
        
        // Premium UI features
        theme="minimal" // Clean, modern theme
        primaryColor="#3b82f6" // Your brand blue
        secondaryColor="#1e40af" // Darker blue
        
        // Poster/thumbnail
        poster={thumbnailTime ? `${thumbnailTime}` : undefined}
        
        // Advanced features
        streamType="on-demand"
        crossOrigin="anonymous"
        hotkeys={enableHotkeys ? 'noarrows' : 'none'} // Space, f, m, c, k
        nohotkeys={!enableHotkeys}
        
        // Device features
        // @ts-ignore - Props might not be in current types
        // airplay={enableAirplay}
        // castButton={enableChromecast}
        
        // Captions/subtitles
        defaultShowCaptions={enableCaptions}
        
        // Preload for better resume
        preload="metadata"
        
        // Custom controls config
        forwardSeekOffset={10}
        backwardSeekOffset={10}
        defaultHiddenCaptions={!enableCaptions}
        
        // Quality menu
        disableTracksMenu={false}
        
        // Playback rates
        playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]}
        
        // Analytics beacons
        beaconCollectionDomain={process.env.NEXT_PUBLIC_MUX_BEACON_DOMAIN}
      />
      
      {/* Premium: Chapter markers could go here */}
      {/* Premium: Interactive transcripts could go here */}
    </div>
  )
}

/**
 * Client-only wrapper to prevent SSR
 */
export default function MuxPlayerWrapper(props: MuxPlayerIslandProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`${props.className} bg-muted rounded-lg flex items-center justify-center`}>
        <div className="text-muted-foreground">Loading video...</div>
      </div>
    )
  }

  return <MuxPlayerIsland {...props} />
}
