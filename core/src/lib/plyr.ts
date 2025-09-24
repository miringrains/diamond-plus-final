import Plyr from 'plyr'

// Custom Plyr CSS variables for Diamond Plus theme
export const plyrCustomCSS = `
  .plyr {
    --plyr-color-main: #15AEE9; /* Electric cyan accent */
    --plyr-video-control-color: #F5F7FA;
    --plyr-video-control-color-hover: #F5F7FA;
    --plyr-video-control-background-hover: #0D9DD6;
    --plyr-video-progress-buffered-background: rgba(21, 174, 233, 0.25);
    --plyr-range-thumb-height: 14px;
    --plyr-control-icon-size: 18px;
    --plyr-font-size-base: 15px;
    --plyr-font-size-small: 13px;
    --plyr-font-size-large: 18px;
  }

  /* Dark mode adjustments */
  .dark .plyr {
    --plyr-video-background: #101115;
    --plyr-menu-background: #22242B;
    --plyr-menu-color: #F5F7FA;
  }

  /* Ensure proper z-index for fullscreen */
  .plyr--fullscreen {
    z-index: 10000;
  }

  /* Smooth transitions */
  .plyr__controls {
    transition: opacity 0.3s ease;
  }

  /* Better mobile controls */
  @media (max-width: 768px) {
    .plyr__controls {
      padding: 10px;
    }
    
    .plyr__control {
      padding: 8px;
    }
  }
`

// Default Plyr options for consistency
export const defaultPlyrOptions: Plyr.Options = {
  controls: [
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
  ],
  settings: ['captions', 'quality', 'speed'],
  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
  keyboard: { focused: true, global: false },
  tooltips: { controls: true, seek: true },
  fullscreen: { 
    enabled: true,
    fallback: true,
    iosNative: true 
  },
  storage: { enabled: true, key: 'plyr' },
  quality: {
    default: 720,
    options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
  }
}

// Utility to format time for display
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Calculate percentage watched
export function calculateWatchPercentage(watchTime: number, duration: number): number {
  if (!duration || duration === 0) return 0
  const percentage = (watchTime / duration) * 100
  return Math.min(Math.round(percentage), 100)
}

// Check if lesson should be marked as complete (90% watched)
export function shouldMarkComplete(watchTime: number, duration: number): boolean {
  if (!duration || duration === 0) return false
  return calculateWatchPercentage(watchTime, duration) >= 90
}