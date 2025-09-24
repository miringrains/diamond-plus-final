import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updatePodcastSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  muxPlaybackId: z.string().min(1),
  muxAssetId: z.string().optional(),
  duration: z.number().optional(),
  transcript: z.string().optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().datetime().optional()
})

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ podcastId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = updatePodcastSchema.parse(json)

    const podcast = await prisma.podcasts.update({
      where: { id: params.podcastId },
      data: {
        title: data.title,
        description: data.description,
        muxPlaybackId: data.muxPlaybackId,
        muxAssetId: data.muxAssetId,
        duration: data.duration,
        transcript: data.transcript,
        published: data.published,
        publishedAt: data.published ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : null
      }
    })

    return NextResponse.json(podcast)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    console.error("Failed to update podcast:", error)
    return NextResponse.json({ error: "Failed to update podcast" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ podcastId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    await prisma.podcasts.delete({
      where: { id: params.podcastId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete podcast:", error)
    return NextResponse.json({ error: "Failed to delete podcast" }, { status: 500 })
  }
}

