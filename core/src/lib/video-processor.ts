/**
 * Video processing utilities for thumbnail generation and optimization
 */

import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  bitrate: number
  size: number
}

/**
 * Parse frame rate string (e.g., "30/1" or "30000/1001") to decimal
 */
function parseFrameRate(frameRate: string): number {
  const parts = frameRate.split('/')
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0])
    const denominator = parseFloat(parts[1])
    if (denominator !== 0) {
      return numerator / denominator
    }
  }
  return parseFloat(frameRate) || 0
}

export interface ThumbnailOptions {
  timestamp?: string | number // Time to extract thumbnail (e.g., '00:00:05' or 5)
  width?: number
  height?: number
  quality?: number
}

/**
 * Get video metadata using ffprobe
 */
export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: videoStream.avg_frame_rate ? parseFrameRate(videoStream.avg_frame_rate) : 0,
        codec: videoStream.codec_name || '',
        bitrate: typeof metadata.format.bit_rate === 'string' ? parseInt(metadata.format.bit_rate) : (metadata.format.bit_rate || 0),
        size: typeof metadata.format.size === 'string' ? parseInt(metadata.format.size) : (metadata.format.size || 0),
      })
    })
  })
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(
  videoPath: string,
  outputDir: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    timestamp = '00:00:01', // Default to 1 second
    width = 640,
    height = 360,
    quality = 80,
  } = options

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true })

  // Generate temporary filename for raw screenshot
  const tempFile = path.join(outputDir, `temp_${randomUUID()}.png`)
  const thumbnailFile = path.join(outputDir, `thumb_${randomUUID()}.jpg`)

  return new Promise((resolve, reject) => {
    // Extract frame from video
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [typeof timestamp === 'number' ? String(timestamp) : timestamp],
        filename: path.basename(tempFile),
        folder: outputDir,
        size: `${width}x${height}`,
      })
      .on('end', async () => {
        try {
          // Optimize the thumbnail using sharp
          await sharp(tempFile)
            .jpeg({ quality })
            .resize(width, height, { fit: 'cover' })
            .toFile(thumbnailFile)

          // Delete temp file
          await fs.unlink(tempFile).catch(() => {})

          resolve(thumbnailFile)
        } catch (error) {
          reject(error)
        }
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

/**
 * Generate multiple thumbnails at different timestamps
 */
export async function generateThumbnailSet(
  videoPath: string,
  outputDir: string,
  count: number = 3
): Promise<string[]> {
  try {
    const metadata = await getVideoMetadata(videoPath)
    const duration = metadata.duration

    if (duration === 0) {
      throw new Error('Video has no duration')
    }

    const thumbnails: string[] = []
    const interval = duration / (count + 1)

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i
      const thumb = await generateThumbnail(videoPath, outputDir, {
        timestamp,
        width: 640,
        height: 360,
        quality: 85,
      })
      thumbnails.push(thumb)
    }

    return thumbnails
  } catch (error) {
    console.error('Error generating thumbnail set:', error)
    throw error
  }
}

/**
 * Validate video file
 */
export async function validateVideo(filePath: string): Promise<{
  valid: boolean
  error?: string
  metadata?: VideoMetadata
}> {
  try {
    const metadata = await getVideoMetadata(filePath)

    // Check for minimum requirements
    if (metadata.duration < 1) {
      return { valid: false, error: 'Video is too short (less than 1 second)' }
    }

    if (metadata.duration > 7200) {
      return { valid: false, error: 'Video is too long (more than 2 hours)' }
    }

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Invalid video dimensions' }
    }

    if (metadata.width < 320 || metadata.height < 240) {
      return { valid: false, error: 'Video resolution is too low' }
    }

    return { valid: true, metadata }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate video',
    }
  }
}

/**
 * Calculate optimal streaming bitrate based on resolution
 */
export function getOptimalBitrate(width: number, height: number): {
  video: number
  audio: number
} {
  const pixels = width * height

  // Bitrate recommendations based on resolution
  if (pixels <= 307200) {
    // 480p and below
    return { video: 1000, audio: 128 }
  } else if (pixels <= 921600) {
    // 720p
    return { video: 2500, audio: 192 }
  } else if (pixels <= 2073600) {
    // 1080p
    return { video: 5000, audio: 256 }
  } else {
    // 4K and above
    return { video: 15000, audio: 320 }
  }
}

/**
 * Prepare video for HLS streaming (future enhancement)
 */
export async function convertToHLS(
  inputPath: string,
  outputDir: string,
  options: {
    segmentDuration?: number
    playlistName?: string
  } = {}
): Promise<string> {
  const {
    segmentDuration = 10,
    playlistName = 'playlist.m3u8',
  } = options

  await fs.mkdir(outputDir, { recursive: true })

  const outputPath = path.join(outputDir, playlistName)

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy',
        '-start_number 0',
        `-hls_time ${segmentDuration}`,
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run()
  })
}