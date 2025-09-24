"use client"

import dynamic from "next/dynamic"
import { VideoPlayerSkeleton } from "./video-player-enhanced"
import { VideoPlayerErrorBoundary } from "./video-player-error-boundary"
import type Plyr from "plyr"

// Import the props type
interface VideoPlayerClientProps {
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
  lessonId?: string
}

// Lazy load the video player only on client - this is the single hydration boundary
const VideoPlayerEnhancedLazy = dynamic(
  () => import("./video-player-enhanced").then(mod => mod.VideoPlayerEnhanced),
  { 
    ssr: false,
    loading: () => <VideoPlayerSkeleton />
  }
)

export function VideoPlayerClient(props: VideoPlayerClientProps) {
  // Remove the extra isClient check - dynamic already handles this
  return (
    <VideoPlayerErrorBoundary 
      lessonId={props.lessonId} 
      className={props.className}
    >
      <VideoPlayerEnhancedLazy {...props} />
    </VideoPlayerErrorBoundary>
  )
}
