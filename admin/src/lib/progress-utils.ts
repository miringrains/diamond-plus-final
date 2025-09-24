import { api } from "@/lib/api-client"
import { addSpanEvent } from "@/lib/telemetry"
import debounce from "lodash.debounce"

interface ProgressData {
  lessonId: string
  positionSeconds: number
  durationSeconds: number
  completed?: boolean
}

interface ResumePosition {
  position: number
  clamped: boolean
}

/**
 * Fetch resume position for a lesson
 * Returns clamped position to avoid seeking past end
 */
export async function fetchResumePosition(
  lessonId: string,
  maxDuration?: number
): Promise<ResumePosition | null> {
  try {
    addSpanEvent('progress.resume.fetch.start', { lessonId })
    
    const response = await api.get(`/api/progress/${lessonId}`)
    
    if (!response.ok) {
      addSpanEvent('progress.resume.fetch.failed', {
        lessonId,
        status: response.status
      })
      return null
    }
    
    const data = await response.json()
    const progress = data.progress
    
    if (!progress || !progress.positionSeconds) {
      addSpanEvent('progress.resume.fetch.empty', { lessonId })
      return null
    }
    
    let position = progress.positionSeconds
    let clamped = false
    
    // Clamp to max(position, duration - 1s) to avoid seeking to very end
    if (maxDuration && position >= maxDuration - 1) {
      position = Math.max(0, maxDuration - 1)
      clamped = true
    }
    
    addSpanEvent('progress.resume.fetch.success', {
      lessonId,
      originalPosition: progress.positionSeconds,
      clampedPosition: position,
      wasClamped: clamped
    })
    
    return { position, clamped }
    
  } catch (error) {
    addSpanEvent('progress.resume.fetch.error', {
      lessonId,
      error: (error as Error).message
    })
    return null
  }
}

/**
 * Create a debounced progress writer
 * - Debounces to 1 second
 * - Stops writes on pause/unmount
 * - Includes lesson identity in every request
 */
export function createProgressWriter(lessonId: string) {
  let isActive = true
  let lastWrite = 0
  
  const writeProgress = async (data: ProgressData) => {
    if (!isActive) return
    
    // Ensure we always include the lesson ID
    if (data.lessonId !== lessonId) {
      console.warn(`[Progress] Lesson ID mismatch: ${data.lessonId} !== ${lessonId}`)
      return
    }
    
    try {
      addSpanEvent('progress.write.start', {
        lessonId,
        position: data.positionSeconds,
        duration: data.durationSeconds,
        completed: data.completed || false
      })
      
      const response = await api.put(`/api/progress/${lessonId}`, {
        watchTime: data.positionSeconds,
        positionSeconds: data.positionSeconds,
        durationSeconds: data.durationSeconds,
        completed: data.completed
      })
      
      if (response.ok) {
        lastWrite = Date.now()
        addSpanEvent('progress.write.success', {
          lessonId,
          position: data.positionSeconds
        })
      } else {
        addSpanEvent('progress.write.failed', {
          lessonId,
          status: response.status
        })
      }
    } catch (error) {
      addSpanEvent('progress.write.error', {
        lessonId,
        error: (error as Error).message
      })
    }
  }
  
  // Debounced writer - 1 second delay
  const debouncedWrite = debounce(writeProgress, 1000, {
    leading: false,
    trailing: true,
    maxWait: 5000 // Force write at least every 5 seconds
  })
  
  return {
    write: (position: number, duration: number, completed = false) => {
      if (!isActive) return
      
      debouncedWrite({
        lessonId,
        positionSeconds: Math.floor(position),
        durationSeconds: Math.floor(duration),
        completed
      })
    },
    
    // Flush any pending writes (best effort)
    flush: async () => {
      debouncedWrite.flush()
      
      // Give the write a chance to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    },
    
    // Stop all writes and cancel pending
    stop: () => {
      isActive = false
      debouncedWrite.cancel()
      
      addSpanEvent('progress.writer.stopped', {
        lessonId,
        lastWriteAge: lastWrite ? Date.now() - lastWrite : 0
      })
    }
  }
}

/**
 * Handle progress on window unload (best effort)
 * Uses both beforeunload and visibilitychange for better coverage
 */
export function setupUnloadProgressHandler(
  lessonId: string,
  getCurrentProgress: () => { position: number; duration: number } | null
) {
  const handleUnload = () => {
    const progress = getCurrentProgress()
    if (!progress) return
    
    // Use sendBeacon for reliability
    const data = JSON.stringify({
      watchTime: Math.floor(progress.position),
      positionSeconds: Math.floor(progress.position),
      durationSeconds: Math.floor(progress.duration)
    })
    
    navigator.sendBeacon(`/api/progress/${lessonId}`, data)
    
    addSpanEvent('progress.unload.sent', {
      lessonId,
      position: progress.position,
      method: 'sendBeacon'
    })
  }
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleUnload()
    }
  }
  
  window.addEventListener('beforeunload', handleUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  return () => {
    window.removeEventListener('beforeunload', handleUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
