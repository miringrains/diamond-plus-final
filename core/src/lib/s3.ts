import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Upload } from "@aws-sdk/lib-storage"
import { createReadStream } from "fs"
import { Readable } from "stream"
import { traceAsync, addSpanEvent } from "@/lib/telemetry"
import { tracer } from "@/lib/otel"
import { SpanKind } from '@opentelemetry/api'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function uploadVideoToS3(
  file: Buffer | string | Readable,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `videos/${Date.now()}-${filename}`
  
  // Determine the body based on input type
  let body: Buffer | Readable
  if (typeof file === 'string') {
    // File path - create read stream
    body = createReadStream(file)
  } else {
    body = file
  }
  
  // For large files, use multipart upload
  if (body instanceof Buffer && body.length > 100 * 1024 * 1024) {
    // Use multipart for files > 100MB
    return uploadLargeVideoToS3(body, filename, contentType)
  }
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
    // Add metadata
    Metadata: {
      originalName: filename,
      uploadDate: new Date().toISOString(),
    },
  })
  
  await s3Client.send(command)
  return key
}

/**
 * Upload large videos using multipart upload for better performance
 */
export async function uploadLargeVideoToS3(
  file: Buffer | string | Readable,
  filename: string,
  contentType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  const key = `videos/${Date.now()}-${filename}`
  
  // Determine the body based on input type
  let body: Buffer | Readable
  if (typeof file === 'string') {
    // File path - create read stream
    body = createReadStream(file)
  } else {
    body = file
  }
  
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        originalName: filename,
        uploadDate: new Date().toISOString(),
      },
      CacheControl: "max-age=31536000", // 1 year
    },
    partSize: 10 * 1024 * 1024, // 10MB chunks
    queueSize: 4, // Upload 4 parts in parallel
    leavePartsOnError: false,
  })
  
  if (onProgress) {
    upload.on("httpUploadProgress", (progress) => {
      if (progress.loaded && progress.total) {
        onProgress(progress.loaded, progress.total)
      }
    })
  }
  
  await upload.done()
  return key
}

export async function getSignedVideoUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const span = tracer.startSpan('video.signUrl', {
    kind: SpanKind.CLIENT,
    attributes: {
      'video.key': key,
      'video.filename': key.split('/').pop() || key,
      'expiresSec': expiresIn,
      's3.bucket': process.env.S3_BUCKET_NAME
    }
  })
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    })
    
    let url: string
    let urlType: string
    
    // Use CloudFront if available
    if (process.env.CLOUDFRONT_DOMAIN) {
      // For CloudFront, you'd typically use signed cookies or signed URLs
      // This is a simplified version - you may need CloudFront key pairs for private content
      url = `${process.env.CLOUDFRONT_DOMAIN}/${key}`
      urlType = 'cloudfront'
    } else {
      // Fallback to S3 signed URL
      url = await getSignedUrl(s3Client, command, { expiresIn })
      urlType = 's3_signed'
    }
    
    span.setAttributes({
      'result': 'success',
      'url.type': urlType,
      'url.domain': new URL(url).hostname
    })
    
    span.addEvent('signUrl.generated', {
      'url.type': urlType,
      'expires.in': expiresIn
    })
    
    return url
  } catch (error) {
    span.recordException(error as Error)
    span.setAttributes({
      'result': 'error',
      'error.message': (error as Error).message
    })
    throw error
  } finally {
    span.end()
  }
}

export async function deleteVideoFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  })
  
  await s3Client.send(command)
}

export function isS3Url(url: string): boolean {
  return url.startsWith('videos/') || url.includes('s3.amazonaws.com') || url.includes('cloudfront.net')
}

export function getS3KeyFromUrl(url: string): string {
  // If it's already a key (videos/xxx)
  if (url.startsWith('videos/')) {
    return url
  }
  
  // Extract key from full S3 URL
  if (url.includes('s3.amazonaws.com')) {
    const match = url.match(/s3\.amazonaws\.com\/[^\/]+\/(.+)/)
    return match ? match[1] : url
  }
  
  // Extract key from CloudFront URL
  if (url.includes('cloudfront.net')) {
    const match = url.match(/cloudfront\.net\/(.+)/)
    return match ? match[1] : url
  }
  
  // Default to treating it as a local file
  return url
}