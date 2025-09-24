/**
 * Simple, reliable video resume based on what actually works in production
 * 
 * Key insights:
 * 1. Don't fight the browser - work with it
 * 2. Use Plyr's own events, not the video element's
 * 3. Single attempt with user interaction fallback
 */

import type Plyr from 'plyr'

interface ResumeOptions {
  player: Plyr
  targetTime: number
  onFallback?: () => void
}

export async function resumeVideo({ player, targetTime, onFallback }: ResumeOptions): Promise<boolean> {
  // Don't try to resume at 0 or very close to the end
  const duration = player.duration
  if (targetTime < 1 || (duration && targetTime >= duration - 1)) {
    return false
  }

  console.log(`[Resume] Attempting to resume at ${targetTime}s`)

  // Simple approach that actually works
  return new Promise((resolve) => {
    let attempted = false
    
    const attemptSeek = () => {
      if (attempted || !player.duration) return
      attempted = true
      
      // Just do it - no complex checks
      console.log(`[Resume] Setting currentTime to ${targetTime}`)
      player.currentTime = targetTime
      
      // Give it a moment to settle
      setTimeout(() => {
        const actualTime = player.currentTime
        const success = Math.abs(actualTime - targetTime) < 1
        console.log(`[Resume] Result - Target: ${targetTime}s, Actual: ${actualTime}s, Success: ${success}`)
        
        if (!success && onFallback) {
          onFallback()
        }
        
        resolve(success)
      }, 500)
    }
    
    // The key: Use Plyr's 'loadeddata' event, not 'ready'
    if (player.duration > 0) {
      // Already has duration, seek now
      attemptSeek()
    } else {
      // Wait for loadeddata which fires when duration is known
      player.once('loadeddata', () => {
        // Small delay to let Plyr finish its internal setup
        setTimeout(attemptSeek, 100)
      })
      
      // Fallback timeout
      setTimeout(() => {
        if (!attempted) {
          console.log('[Resume] Timeout - showing fallback')
          onFallback?.()
          resolve(false)
        }
      }, 5000)
    }
  })
}

/**
 * User interaction fallback - show a "Continue where you left off?" button
 */
export function createResumeFallback(container: HTMLElement, time: number, onResume: () => void) {
  const button = document.createElement('button')
  button.className = 'absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50'
  button.innerHTML = `Continue from ${formatTime(time)}`
  button.onclick = () => {
    onResume()
    button.remove()
  }
  
  container.appendChild(button)
  
  // Auto-hide after 10 seconds
  setTimeout(() => button.remove(), 10000)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
