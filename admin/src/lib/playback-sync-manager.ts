import throttle from 'lodash.throttle'
import debounce from 'lodash.debounce'

interface SyncUpdate {
  lessonId: string
  position: number
  state: 'playing' | 'paused' | 'stopped'
  deviceId?: string
  immediate?: boolean
  playbackSpeed?: number
  duration?: number
}

interface SyncResponse {
  success: boolean
  progress: {
    positionSeconds: number
    completed: boolean
    lastWatched: string
    deviceId?: string
    playbackState: string
  }
}

export class PlaybackSyncManager {
  private deviceId: string
  private currentLessonId: string | null = null
  private lastSyncTime: number = 0
  private syncInProgress = false
  private updateQueue: SyncUpdate[] = []
  
  // Throttle regular updates to every 10 seconds
  private throttledSync: (update: SyncUpdate) => void
  
  // Debounce rapid seeks to 300ms
  private debouncedSeek: (update: SyncUpdate) => void

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    
    // Throttle regular playback updates
    this.throttledSync = throttle(this.performSync.bind(this), 10000, {
      leading: true,
      trailing: true
    })
    
    // Debounce seek updates
    this.debouncedSeek = debounce(this.performSync.bind(this), 300)
    
    // Listen for tab close to save position
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this))
      window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'unknown'
    
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      // Generate unique device ID
      deviceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('device_id', deviceId)
    }
    return deviceId
  }

  public setCurrentLesson(lessonId: string) {
    this.currentLessonId = lessonId
  }

  public async updatePosition(position: number, state: 'playing' | 'paused' | 'stopped', options: {
    immediate?: boolean
    duration?: number
    playbackSpeed?: number
  } = {}) {
    if (!this.currentLessonId) {
      console.warn('[PlaybackSync] No lesson ID set')
      return
    }

    const update: SyncUpdate = {
      lessonId: this.currentLessonId,
      position: Math.round(position),
      state,
      deviceId: this.deviceId,
      immediate: options.immediate,
      duration: options.duration,
      playbackSpeed: options.playbackSpeed
    }

    // Immediate sync for important events
    if (options.immediate || state === 'paused' || state === 'stopped') {
      console.log(`[PlaybackSync] Immediate sync: ${position}s (${state})`)
      await this.performSync(update)
    } else if (state === 'playing') {
      // Throttled sync during playback
      this.throttledSync(update)
    }
  }

  public async updateSeekPosition(position: number) {
    if (!this.currentLessonId) return

    const update: SyncUpdate = {
      lessonId: this.currentLessonId,
      position: Math.round(position),
      state: 'paused',
      deviceId: this.deviceId,
      immediate: false
    }

    // Debounce rapid seeks
    this.debouncedSeek(update)
  }

  private async performSync(update: SyncUpdate): Promise<void> {
    if (this.syncInProgress) {
      this.updateQueue.push(update)
      return
    }

    this.syncInProgress = true
    this.lastSyncTime = Date.now()

    try {
      const response = await fetch('/api/progress/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(update)
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }

      const data: SyncResponse = await response.json()
      console.log(`[PlaybackSync] Synced position: ${data.progress.positionSeconds}s`)

      // Process queued updates
      if (this.updateQueue.length > 0) {
        const nextUpdate = this.updateQueue.shift()
        if (nextUpdate) {
          await this.performSync(nextUpdate)
        }
      }
    } catch (error) {
      console.error('[PlaybackSync] Sync error:', error)
      // Retry after 5 seconds
      setTimeout(() => this.performSync(update), 5000)
    } finally {
      this.syncInProgress = false
    }
  }

  public async getServerPosition(lessonId: string): Promise<number | null> {
    try {
      const response = await fetch(`/api/progress/sync?lessonId=${lessonId}`, {
        credentials: 'include'
      })
      if (!response.ok) return null

      const data = await response.json()
      if (data.progress?.positionSeconds) {
        console.log(`[PlaybackSync] Server position: ${data.progress.positionSeconds}s`)
        return data.progress.positionSeconds
      }
      return null
    } catch (error) {
      console.error('[PlaybackSync] Failed to get server position:', error)
      return null
    }
  }

  private handleBeforeUnload = () => {
    // Save position immediately when leaving page
    if (this.currentLessonId) {
      const position = this.getLastKnownPosition()
      if (position !== null) {
        // Use sendBeacon for reliability
        const data = JSON.stringify({
          lessonId: this.currentLessonId,
          position,
          state: 'stopped',
          deviceId: this.deviceId,
          immediate: true
        })
        navigator.sendBeacon('/api/progress/sync', data)
      }
    }
  }

  private handleVisibilityChange = () => {
    if (document.hidden && this.currentLessonId) {
      // Save position when tab becomes hidden
      const position = this.getLastKnownPosition()
      if (position !== null) {
        this.updatePosition(position, 'paused', { immediate: true })
      }
    }
  }

  private getLastKnownPosition(): number | null {
    // This should be overridden by the video player to provide current position
    return null
  }

  public setPositionGetter(getter: () => number) {
    this.getLastKnownPosition = getter
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
      window.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
  }
}
