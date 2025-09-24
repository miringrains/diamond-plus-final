/**
 * Client-side upload manager for handling large video uploads
 * with progress tracking and resumable capabilities
 */

import axios, { AxiosProgressEvent, CancelTokenSource } from 'axios'

export interface UploadTask {
  id: string
  fileName: string
  fileSize: number
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  error?: string
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  startedAt: Date
  completedAt?: Date
}

class UploadManager {
  private uploads: Map<string, UploadTask> = new Map()
  private cancelTokens: Map<string, CancelTokenSource> = new Map()
  private progressCallbacks: Map<string, (progress: number) => void> = new Map()
  private statusCallbacks: Map<string, (status: UploadTask['status']) => void> = new Map()

  /**
   * Start a new upload - returns task immediately and uploads in background
   */
  startUpload(
    file: File,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: UploadTask['status']) => void,
    onComplete?: (task: UploadTask) => void
  ): UploadTask {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    console.log('Starting upload for file:', file.name, 'Size:', file.size)
    
    // Create upload task
    const task: UploadTask = {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'pending',
      startedAt: new Date(),
    }
    
    this.uploads.set(uploadId, task)
    
    // Store callbacks
    if (onProgress) {
      this.progressCallbacks.set(uploadId, onProgress)
    }
    if (onStatusChange) {
      this.statusCallbacks.set(uploadId, onStatusChange)
    }
    
    // Start the actual upload in background
    this.performUpload(uploadId, file, task, onComplete)
    
    // Return task immediately
    return task
  }
  
  /**
   * Perform the actual upload
   */
  private async performUpload(
    uploadId: string,
    file: File,
    task: UploadTask,
    onComplete?: (task: UploadTask) => void
  ): Promise<void> {
    // Create cancel token
    const cancelToken = axios.CancelToken.source()
    this.cancelTokens.set(uploadId, cancelToken)
    
    // Update status to uploading
    this.updateTaskStatus(uploadId, 'uploading')
    
    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadId', uploadId)
      
      // Use streaming endpoint for all uploads to avoid memory issues
      const endpoint = '/api/upload/stream'
      
      console.log('Uploading to streaming endpoint:', endpoint)
      console.log('File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB')
      
      // Upload with progress tracking
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            console.log('Upload progress:', progress + '%')
            this.updateTaskProgress(uploadId, progress)
          }
        },
        cancelToken: cancelToken.token,
        // Increase timeout for large files
        timeout: 30 * 60 * 1000, // 30 minutes
      })
      
      // Update task with success
      const updatedTask = this.uploads.get(uploadId)
      if (updatedTask) {
        updatedTask.videoUrl = response.data.videoUrl
        updatedTask.thumbnailUrl = response.data.thumbnailUrl
        updatedTask.duration = response.data.duration
        updatedTask.completedAt = new Date()
        updatedTask.status = 'completed'
        this.uploads.set(uploadId, updatedTask)
        this.updateTaskStatus(uploadId, 'completed')
        
        // Store in localStorage for persistence
        this.saveToLocalStorage(updatedTask)
        
        // Call complete callback
        if (onComplete) {
          onComplete(updatedTask)
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      
      const updatedTask = this.uploads.get(uploadId)
      if (updatedTask) {
        if (axios.isCancel(error)) {
          updatedTask.status = 'cancelled'
          updatedTask.error = 'Upload cancelled'
        } else if (axios.isAxiosError(error)) {
          updatedTask.status = 'failed'
          updatedTask.error = error.response?.data?.error || error.message
        } else {
          updatedTask.status = 'failed'
          updatedTask.error = 'Unknown error occurred'
        }
        
        this.uploads.set(uploadId, updatedTask)
        this.updateTaskStatus(uploadId, updatedTask.status)
        
        // Call complete callback even on error
        if (onComplete) {
          onComplete(updatedTask)
        }
      }
    } finally {
      // Cleanup
      this.cancelTokens.delete(uploadId)
    }
  }
  
  /**
   * Legacy method for backward compatibility
   */
  async uploadVideo(
    file: File,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: UploadTask['status']) => void
  ): Promise<UploadTask> {
    return new Promise((resolve, reject) => {
      const task = this.startUpload(
        file,
        onProgress,
        onStatusChange,
        (completedTask) => {
          if (completedTask.status === 'completed') {
            resolve(completedTask)
          } else if (completedTask.status === 'failed' || completedTask.status === 'cancelled') {
            reject(new Error(completedTask.error || 'Upload failed'))
          }
        }
      )
      
      // If we need to return immediately for UI updates
      // Just return the initial task
      resolve(task)
    })
  }
  
  /**
   * Cancel an upload
   */
  cancelUpload(uploadId: string): void {
    const cancelToken = this.cancelTokens.get(uploadId)
    if (cancelToken) {
      cancelToken.cancel('Upload cancelled by user')
    }
  }
  
  /**
   * Get upload task by ID
   */
  getUpload(uploadId: string): UploadTask | undefined {
    return this.uploads.get(uploadId)
  }
  
  /**
   * Get all uploads
   */
  getAllUploads(): UploadTask[] {
    return Array.from(this.uploads.values())
  }
  
  /**
   * Update task progress
   */
  private updateTaskProgress(uploadId: string, progress: number): void {
    const task = this.uploads.get(uploadId)
    if (task) {
      task.progress = progress
      this.uploads.set(uploadId, task)
      
      // Call progress callback
      const callback = this.progressCallbacks.get(uploadId)
      if (callback) {
        callback(progress)
      }
      
      // Save to localStorage
      this.saveToLocalStorage(task)
    }
  }
  
  /**
   * Update task status
   */
  private updateTaskStatus(uploadId: string, status: UploadTask['status']): void {
    const task = this.uploads.get(uploadId)
    if (task) {
      task.status = status
      this.uploads.set(uploadId, task)
      
      // Call status callback
      const callback = this.statusCallbacks.get(uploadId)
      if (callback) {
        callback(status)
      }
      
      // Save to localStorage
      this.saveToLocalStorage(task)
    }
  }
  
  /**
   * Save upload task to localStorage for persistence
   */
  private saveToLocalStorage(task: UploadTask): void {
    try {
      const uploads = this.loadFromLocalStorage()
      uploads[task.id] = task
      localStorage.setItem('diamond-district-uploads', JSON.stringify(uploads))
    } catch (error) {
      console.error('Failed to save upload to localStorage:', error)
    }
  }
  
  /**
   * Load uploads from localStorage
   */
  private loadFromLocalStorage(): Record<string, UploadTask> {
    try {
      const stored = localStorage.getItem('diamond-district-uploads')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to load uploads from localStorage:', error)
      return {}
    }
  }
  
  /**
   * Restore uploads from localStorage on page load
   */
  restoreUploads(): UploadTask[] {
    const stored = this.loadFromLocalStorage()
    const uploads = Object.values(stored)
    
    // Add to memory
    uploads.forEach(upload => {
      this.uploads.set(upload.id, upload)
    })
    
    return uploads
  }
  
  /**
   * Clear completed uploads
   */
  clearCompleted(): void {
    const completed = Array.from(this.uploads.values())
      .filter(task => task.status === 'completed')
    
    completed.forEach(task => {
      this.uploads.delete(task.id)
      this.progressCallbacks.delete(task.id)
      this.statusCallbacks.delete(task.id)
    })
    
    // Update localStorage
    const remaining = Array.from(this.uploads.values())
    const stored: Record<string, UploadTask> = {}
    remaining.forEach(task => {
      stored[task.id] = task
    })
    localStorage.setItem('diamond-district-uploads', JSON.stringify(stored))
  }
  
  /**
   * Clear failed uploads
   */
  clearFailed(): void {
    const failed = Array.from(this.uploads.values())
      .filter(task => task.status === 'failed' || task.status === 'cancelled')
    
    failed.forEach(task => {
      this.uploads.delete(task.id)
      this.progressCallbacks.delete(task.id)
      this.statusCallbacks.delete(task.id)
    })
    
    // Update localStorage
    const remaining = Array.from(this.uploads.values())
    const stored: Record<string, UploadTask> = {}
    remaining.forEach(task => {
      stored[task.id] = task
    })
    localStorage.setItem('diamond-district-uploads', JSON.stringify(stored))
  }
  
  /**
   * Clear all uploads
   */
  clearAll(): void {
    this.uploads.clear()
    this.progressCallbacks.clear()
    this.statusCallbacks.clear()
    this.cancelTokens.forEach(token => token.cancel('Clearing all uploads'))
    this.cancelTokens.clear()
    localStorage.removeItem('diamond-district-uploads')
  }
  
  /**
   * Clear a specific upload by ID
   */
  clearUpload(uploadId: string): void {
    this.uploads.delete(uploadId)
    this.progressCallbacks.delete(uploadId)
    this.statusCallbacks.delete(uploadId)
    
    const cancelToken = this.cancelTokens.get(uploadId)
    if (cancelToken) {
      cancelToken.cancel('Upload cleared')
      this.cancelTokens.delete(uploadId)
    }
    
    // Update localStorage
    const remaining = Array.from(this.uploads.values())
    const stored: Record<string, UploadTask> = {}
    remaining.forEach(task => {
      stored[task.id] = task
    })
    if (remaining.length > 0) {
      localStorage.setItem('diamond-district-uploads', JSON.stringify(stored))
    } else {
      localStorage.removeItem('diamond-district-uploads')
    }
  }
}

// Export singleton instance
export const uploadManager = new UploadManager()