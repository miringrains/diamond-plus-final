import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"
import { prisma } from "@/lib/db"
import { getSignedVideoUrl, isS3Url, getS3KeyFromUrl } from "@/lib/s3"
import { traceAsync, addSpanEvent } from "@/lib/telemetry"
import { spanAttrBase } from "@/lib/otel"
import { assertLessonAccess } from "@/lib/lesson-access"

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  let session = await auth()
  
  // Retry session fetch once if null (edge/server mismatch)
  if (!session && req.headers.get('cookie')) {
    console.log('[Video API] Session null but cookies present, retrying...')
    session = await auth()
  }
  
  const baseAttrs = spanAttrBase({ userId: session?.user?.id })
  
  return traceAsync('api.videos.stream', async () => {
    try {
      // Check authentication
      addSpanEvent('auth.check', {
        'session.present': !!session,
        'guard.result': session ? 'allow' : 'deny',
        ...baseAttrs
      })
      
      if (!session) {
        console.error('[Video API] No session - unauthorized')
        console.log('[Video API] Headers:', {
          cookie: req.headers.get('cookie')?.substring(0, 100),
          referer: req.headers.get('referer'),
          origin: req.headers.get('origin'),
        })
        addSpanEvent('auth.failed', {
          endpoint: 'video.stream',
          filename,
          hasCookie: !!req.headers.get('cookie'),
          reason: 'no_session',
          ...baseAttrs
        })
        return new NextResponse("Unauthorized", { status: 401 })
      }
      console.log(`[Video API] Request from ${session.user?.email} (${session.user?.role}) for video: ${filename}`)
      
      // Validate filename to prevent path traversal
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
      }
      
      // Try to find sub-lesson by video filename
      const lesson = await prisma.sub_lessons.findFirst({
        where: {
          OR: [
            { videoUrl: filename },
            { videoUrl: { contains: filename } },
            { videoUrl: `videos/${filename}` }, // Handle videos/ prefix
          ]
        },
        select: {
          id: true,
          videoUrl: true
        }
      })
      
      console.log(`[Video API] Found lesson:`, lesson ? `${lesson.id} (videoUrl: ${lesson.videoUrl})` : 'Not found')
      
      // If lesson found, verify access
      if (lesson) {
        const access = await assertLessonAccess(session.user?.id, lesson.id)
        if (!access.allowed) {
          addSpanEvent('video.access.denied', {
            lessonId: lesson.id,
            reason: access.reason,
            filename,
            ...baseAttrs
          })
          return new NextResponse("Access denied", { status: 403 })
        }
      }
      
      // If lesson found and uses S3
      if (lesson && lesson.videoUrl) {
        console.log(`[Video API] Checking if S3 URL: ${lesson.videoUrl}`)
        const isS3 = isS3Url(lesson.videoUrl)
        console.log(`[Video API] Is S3 URL: ${isS3}`)
        
        if (isS3) {
          const s3Key = getS3KeyFromUrl(lesson.videoUrl)
          console.log(`[Video API] S3 Key: ${s3Key}`)
          
          addSpanEvent('s3.redirect.begin', {
            's3.key': s3Key,
            filename,
            ...baseAttrs
          })
          
          try {
            const signedUrl = await getSignedVideoUrl(s3Key)
            console.log('[Video API] Successfully generated S3 signed URL')
            
            addSpanEvent('s3.redirect.success', {
              's3.key': s3Key,
              'signed.url.generated': true,
              ...baseAttrs
            })
            
            return NextResponse.redirect(signedUrl)
          } catch (s3Error) {
            console.error('[Video API] Failed to generate S3 signed URL:', s3Error)
            
            // Check if it's a 403 (expired URL or access denied)
            const errorMessage = (s3Error as Error).message
            const isExpired = errorMessage.includes('403') || errorMessage.includes('Access Denied')
            
            if (isExpired) {
              console.log('[Video API] Signed URL appears expired, regenerating...')
              addSpanEvent('s3.url.expired.retry', {
                's3.key': s3Key,
                ...baseAttrs
              })
              
              // Retry once with a fresh signed URL
              try {
                const freshSignedUrl = await getSignedVideoUrl(s3Key, 7200) // 2 hour expiry
                console.log('[Video API] Successfully regenerated S3 signed URL')
                
                addSpanEvent('s3.redirect.retry.success', {
                  's3.key': s3Key,
                  'signed.url.regenerated': true,
                  ...baseAttrs
                })
                
                return NextResponse.redirect(freshSignedUrl)
              } catch (retryError) {
                console.error('[Video API] Failed to regenerate S3 signed URL:', retryError)
                addSpanEvent('s3.redirect.retry.failed', {
                  's3.key': s3Key,
                  'error.message': (retryError as Error).message,
                  ...baseAttrs
                })
              }
            }
            
            addSpanEvent('s3.redirect.failed', {
              's3.key': s3Key,
              'error.message': errorMessage,
              'signUrl.expired': isExpired,
              ...baseAttrs
            })
            
            return new NextResponse("Failed to generate video URL", { status: 500 })
          }
        }
      }
      
      // If no lesson found in DB, still try to serve from local storage
      if (!lesson) {
        console.log('[Video API] No lesson found in DB, attempting direct file access')
      }
      
      // Fallback to local file serving for existing videos
      const videoPath = path.join(process.cwd(), "public", "videos", filename)
      
      // Check if file exists
      try {
        await fs.access(videoPath)
      } catch {
        console.error(`[Video API] Local file not found: ${videoPath}`)
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
      }
      
      // Get file stats
      const stats = await fs.stat(videoPath)
      const fileSize = stats.size
      
      // Handle range requests for video streaming
      const range = req.headers.get("range")
      
      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        
        addSpanEvent('video.range_request', {
          start,
          end,
          totalSize: fileSize,
          filename,
          ...baseAttrs
        })
        
        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`
            }
          })
        }
        
        const chunkSize = end - start + 1
        
        // Read partial content
        const fileHandle = await fs.open(videoPath, "r")
        const buffer = Buffer.alloc(chunkSize)
        await fileHandle.read(buffer, 0, chunkSize, start)
        await fileHandle.close()
        
        // Return partial content
        return new Response(new Uint8Array(buffer), {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": getContentType(filename),
          },
        })
      } else {
        // Return full file
        const file = await fs.readFile(videoPath)
        
        return new Response(new Uint8Array(file), {
          headers: {
            "Content-Length": fileSize.toString(),
            "Content-Type": getContentType(filename),
            "Accept-Ranges": "bytes",
          },
        })
      }
    } catch (error) {
      console.error("[Video API] Error serving video:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }, {
    'http.route': '/api/videos/[filename]',
    'video.filename': filename,
    ...baseAttrs
  })
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  
  switch (ext) {
    case ".mp4":
      return "video/mp4"
    case ".webm":
      return "video/webm"
    case ".ogg":
      return "video/ogg"
    default:
      return "application/octet-stream"
  }
}