import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const podcastSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  muxPlaybackId: z.string().min(1),
  muxAssetId: z.string().optional(),
  duration: z.number().optional(),
  transcript: z.string().optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().datetime().optional()
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const podcasts = await prisma.podcasts.findMany({
      orderBy: [
        { publishedAt: "desc" },
        { createdAt: "desc" }
      ]
    })
    return NextResponse.json(podcasts)
  } catch (error) {
    console.error("Failed to fetch podcasts:", error)
    return NextResponse.json({ error: "Failed to fetch podcasts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = podcastSchema.parse(json)

    const podcast = await prisma.podcasts.create({
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
    console.error("Failed to create podcast:", error)
    return NextResponse.json({ error: "Failed to create podcast" }, { status: 500 })
  }
}

