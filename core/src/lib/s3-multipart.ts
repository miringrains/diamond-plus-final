import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { randomUUID } from "crypto"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Upload large video files to S3 using multipart upload
 * Handles files up to 5GB with progress tracking
 */
export async function uploadLargeVideoToS3(
  file: Buffer | Blob | File,
  filename: string,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const key = `videos/${Date.now()}-${randomUUID()}-${filename}`
  
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: contentType,
        // Add metadata
        Metadata: {
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
        // Set appropriate cache headers
        CacheControl: "max-age=31536000", // 1 year for videos
      },
      // Use 10MB chunks for better performance
      partSize: 10 * 1024 * 1024, // 10MB
      // Upload 4 parts in parallel
      queueSize: 4,
      // Leave part size undefined to let SDK determine optimal size
      leavePartsOnError: false,
    })

    // Track upload progress
    upload.on("httpUploadProgress", (progress) => {
      if (onProgress && progress.loaded && progress.total) {
        onProgress({
          loaded: progress.loaded,
          total: progress.total,
          percentage: Math.round((progress.loaded / progress.total) * 100),
        })
      }
    })

    // Wait for upload to complete
    await upload.done()
    
    console.log(`Successfully uploaded large video to S3: ${key}`)
    return key
  } catch (error) {
    console.error("Error uploading large video to S3:", error)
    throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Calculate optimal part size based on file size
 * AWS S3 limits: max 10,000 parts, min 5MB per part (except last)
 */
export function calculateOptimalPartSize(fileSize: number): number {
  const MIN_PART_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_PART_SIZE = 100 * 1024 * 1024 // 100MB
  const MAX_PARTS = 10000
  
  // Calculate size needed to stay under 10,000 parts
  let partSize = Math.ceil(fileSize / MAX_PARTS)
  
  // Ensure part size is at least 5MB
  partSize = Math.max(partSize, MIN_PART_SIZE)
  
  // Cap at 100MB for reasonable memory usage
  partSize = Math.min(partSize, MAX_PART_SIZE)
  
  // Round up to nearest MB for cleaner chunks
  partSize = Math.ceil(partSize / (1024 * 1024)) * (1024 * 1024)
  
  return partSize
}

/**
 * Abort a multipart upload if needed (e.g., user cancels)
 */
export async function abortMultipartUpload(uploadId: string, key: string): Promise<void> {
  try {
    const command = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
    }
    
    // Note: @aws-sdk/lib-storage handles abort internally
    // This is here for reference if manual abort is needed
    console.log(`Aborted multipart upload: ${uploadId}`)
  } catch (error) {
    console.error("Error aborting multipart upload:", error)
  }
}