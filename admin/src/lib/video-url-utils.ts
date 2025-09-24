import { addSpanEvent } from "@/lib/telemetry"

interface VideoUrlResult {
  url: string
  isS3: boolean
  error?: string
}

/**
 * Get a signed video URL with deterministic retry logic
 * - Try once to get signed URL
 * - If 403/expired, retry exactly once with longer expiry
 * - Never loop, always resolve
 */
export async function getSignedVideoUrl(
  lessonId: string,
  videoUrl: string
): Promise<VideoUrlResult> {
  // Handle absolute URLs
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    // Check if it's an S3 URL by looking for common S3 patterns
    const isS3 = videoUrl.includes('.s3.') || 
                 videoUrl.includes('s3.amazonaws.com') ||
                 videoUrl.includes('.digitaloceanspaces.com')
    
    if (!isS3) {
      // Direct URL, no signing needed
      return { url: videoUrl, isS3: false }
    }
    
    // S3 URL, needs signing - call our API
    addSpanEvent('video.s3.sign.start', {
      lessonId,
      originalUrl: videoUrl
    })
    
    try {
      // Call our API to get a signed URL
      const response = await fetch('/api/signed-video-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          videoUrl,
          expirySeconds: 3600 // 1 hour default
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      addSpanEvent('video.s3.sign.success', {
        lessonId,
        attempt: 1
      })
      
      return { url: data.signedUrl, isS3: true }
      
    } catch (error) {
      const errorMessage = (error as Error).message
      const isExpired = errorMessage.includes('403') || 
                       errorMessage.includes('401')
      
      addSpanEvent('video.s3.sign.failed', {
        lessonId,
        attempt: 1,
        error: errorMessage,
        isExpired
      })
      
      if (isExpired) {
        // Retry exactly once with longer expiry (2 hours)
        try {
          const response = await fetch('/api/signed-video-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              lessonId,
              videoUrl,
              expirySeconds: 7200 // 2 hours
            }),
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          
          const data = await response.json()
          
          addSpanEvent('video.s3.sign.retry.success', {
            lessonId,
            attempt: 2,
            expirySeconds: 7200
          })
          
          return { url: data.signedUrl, isS3: true }
          
        } catch (retryError) {
          addSpanEvent('video.s3.sign.retry.failed', {
            lessonId,
            attempt: 2,
            error: (retryError as Error).message
          })
          
          return {
            url: '',
            isS3: true,
            error: 'Failed to access video. Please try refreshing the page.'
          }
        }
      }
      
      // Non-expiry error, don't retry
      return {
        url: '',
        isS3: true,
        error: 'Video temporarily unavailable'
      }
    }
  }
  
  // Local file reference - convert to API URL
  const filename = videoUrl.split('/').pop() || videoUrl
  return {
    url: `/api/videos/${filename}`,
    isS3: false
  }
}

/**
 * Clear any cached signed URLs for a lesson
 * Called on unmount to prevent cross-lesson URL reuse
 */
export function clearSignedUrl(lessonId: string) {
  // In this implementation, we don't cache URLs
  // But this function exists for future optimization
  addSpanEvent('video.url.cleared', { lessonId })
}
