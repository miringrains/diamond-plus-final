'use client'

// Import the HLS Audio Player that matches our design system perfectly
import { HLSAudioPlayer } from './hls-audio-player'

interface PodcastPlayerProps {
  episodeNumber: number
  title: string
  description: string
  muxPlaybackId: string
  duration: number // in seconds
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
}

// Use the HLS Audio Player that integrates with our design system
export function PodcastPlayer(props: PodcastPlayerProps) {
  return <HLSAudioPlayer {...props} />
}

// Alternative: If you want to use Podlove player instead, uncomment the line below:
// export { PodlovePlayer as PodcastPlayer } from './podlove-player'

// Alternative: If you want to use the original MuxPlayer, uncomment below:
// export { MuxAudioPlayer as PodcastPlayer } from './mux-audio-player'