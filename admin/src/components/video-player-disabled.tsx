// This file temporarily disables the old video player components
// to ensure they're not used anywhere in the codebase

export function VideoPlayer() {
  throw new Error('VideoPlayer is disabled. Use VideoIsland instead.')
}

export function VideoPlayerClient() {
  throw new Error('VideoPlayerClient is disabled. Use VideoIsland instead.')
}

export function VideoPlayerEnhanced() {
  throw new Error('VideoPlayerEnhanced is disabled. Use VideoIsland instead.')
}
