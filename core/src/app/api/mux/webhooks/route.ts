import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getWebhookSecret } from "@/lib/mux"
import crypto from "crypto"

// Mux webhook event types
interface MuxWebhookEvent {
  type: string
  data: {
    id: string
    status?: string
    playback_ids?: Array<{
      id: string
      policy: "public" | "signed"
    }>
    duration?: number
    errors?: {
      type: string
      message: string
    }
    // View event specific fields
    playback_id?: string
    viewer_id?: string
    view_end?: number
    view_start?: number
    view_total_watch_time?: number
    asset_id?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = getWebhookSecret()
    if (!webhookSecret) {
      console.error("[Mux Webhook] MUX_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    // Verify webhook signature
    const signature = req.headers.get("mux-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    const body = await req.text()
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

    // Extract timestamp and signature from header
    const parts = signature.split(",")
    const timestamp = parts.find(p => p.startsWith("t="))?.split("=")[1]
    const receivedSignature = parts.find(p => p.startsWith("v1="))?.split("=")[1]

    if (!timestamp || !receivedSignature) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 401 })
    }

    // Verify timestamp to prevent replay attacks (5 minute window)
    const currentTime = Math.floor(Date.now() / 1000)
    const webhookTime = parseInt(timestamp)
    if (currentTime - webhookTime > 300) {
      return NextResponse.json({ error: "Webhook too old" }, { status: 401 })
    }

    // Verify signature
    const payload = `${timestamp}.${body}`
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex")

    if (computedSignature !== receivedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse webhook event
    const event: MuxWebhookEvent = JSON.parse(body)
    console.log(`[Mux Webhook] Received event: ${event.type}`, event.data.id)

    // Handle different event types
    switch (event.type) {
      case "video.asset.ready":
        await handleAssetReady(event.data)
        break
      
      case "video.asset.errored":
        await handleAssetError(event.data)
        break
      
      case "video.asset.deleted":
        await handleAssetDeleted(event.data)
        break
      
      case "video.view.ended":
        await handleViewEnded(event.data)
        break
      
      case "video.view.heartbeat":
        // Could use this for real-time progress updates
        console.log(`[Mux Webhook] View heartbeat:`, event.data)
        break
      
      case "video.playback.updated":
        await handlePlaybackUpdated(event.data)
        break
      
      default:
        console.log(`[Mux Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Mux Webhook] Error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleAssetReady(data: MuxWebhookEvent["data"]) {
  const { id: assetId, playback_ids, duration } = data
  
  if (!playback_ids || playback_ids.length === 0) {
    console.error(`[Mux Webhook] Asset ${assetId} has no playback IDs`)
    return
  }

  // Find sub_lesson by asset ID
  const subLesson = await prisma.sub_lessons.findFirst({
    where: { muxAssetId: assetId }
  })

  if (!subLesson) {
    console.error(`[Mux Webhook] No sub_lesson found for asset ${assetId}`)
    return
  }

  // Update sub_lesson with ready status
  const playbackId = playback_ids[0]
  
  // Generate thumbnail URL if not already set
  const thumbnailUrl = subLesson.thumbnailUrl || `https://image.mux.com/${playbackId.id}/thumbnail.jpg?time=5`
  
  await prisma.sub_lessons.update({
    where: { id: subLesson.id },
    data: {
      muxPlaybackId: playbackId.id,
      muxPolicy: playbackId.policy,
      muxReadyAt: new Date(),
      muxError: null,
      duration: duration ? Math.round(duration) : undefined,
      thumbnailUrl
    }
  })

  console.log(`[Mux Webhook] Asset ready for sub_lesson ${subLesson.id}`)
}

async function handleAssetError(data: MuxWebhookEvent["data"]) {
  const { id: assetId, errors } = data
  
  // Find sub_lesson by asset ID
  const subLesson = await prisma.sub_lessons.findFirst({
    where: { muxAssetId: assetId }
  })

  if (!subLesson) {
    console.error(`[Mux Webhook] No sub_lesson found for asset ${assetId}`)
    return
  }

  // Update sub_lesson with error status
  await prisma.sub_lessons.update({
    where: { id: subLesson.id },
    data: {
      muxError: errors?.message || "Asset processing failed",
      muxReadyAt: null
    }
  })

  console.log(`[Mux Webhook] Asset error for sub_lesson ${subLesson.id}:`, errors?.message)
}

async function handleAssetDeleted(data: MuxWebhookEvent["data"]) {
  const { id: assetId } = data
  
  // Find sub_lesson by asset ID
  const subLesson = await prisma.sub_lessons.findFirst({
    where: { muxAssetId: assetId }
  })

  if (!subLesson) {
    console.error(`[Mux Webhook] No sub_lesson found for asset ${assetId}`)
    return
  }

  // Clear Mux fields
  await prisma.sub_lessons.update({
    where: { id: subLesson.id },
    data: {
      muxAssetId: null,
      muxPlaybackId: null,
      muxPolicy: null,
      muxReadyAt: null,
      muxError: null
    }
  })

  console.log(`[Mux Webhook] Asset deleted for sub_lesson ${subLesson.id}`)
}

async function handleViewEnded(data: MuxWebhookEvent["data"]) {
  const { 
    viewer_id: userId, 
    asset_id: assetId,
    view_total_watch_time: watchTime 
  } = data
  
  if (!userId || !assetId || !watchTime) {
    console.error("[Mux Webhook] Missing data for view ended event", data)
    return
  }

  try {
    // Find sub_lesson by asset ID
    const subLesson = await prisma.sub_lessons.findFirst({
      where: { muxAssetId: assetId }
    })

    if (!subLesson) {
      console.error(`[Mux Webhook] No sub_lesson found for asset ${assetId}`)
      return
    }

    // Update or create progress record
    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId,
          subLessonId: subLesson.id
        }
      },
      update: {
        watchTime: Math.round(watchTime),
        lastWatched: new Date(),
        // Mark as completed if watched 90% of the video
        completed: subLesson.duration ? watchTime >= (subLesson.duration * 0.9) : false
      },
      create: {
        userId,
        subLessonId: subLesson.id,
        watchTime: Math.round(watchTime),
        lastWatched: new Date(),
        completed: subLesson.duration ? watchTime >= (subLesson.duration * 0.9) : false
      }
    })

    console.log(`[Mux Webhook] Updated progress for user ${userId} on sub_lesson ${subLesson.id}`)
  } catch (error) {
    console.error("[Mux Webhook] Error updating progress:", error)
  }
}

async function handlePlaybackUpdated(data: MuxWebhookEvent["data"]) {
  // This event can be used for real-time progress updates
  // For now, we'll just log it
  console.log(`[Mux Webhook] Playback updated:`, data)
}
