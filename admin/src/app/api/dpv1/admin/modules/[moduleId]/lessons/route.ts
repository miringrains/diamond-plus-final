import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const lessonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  muxPlaybackId: z.string().min(1),
  muxAssetId: z.string().optional(),
  duration: z.number().optional(),
  thumbnailUrl: z.string().url().optional()
})

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ moduleId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const lessons = await prisma.sub_lessons.findMany({
      where: { moduleId: params.moduleId },
      orderBy: { order: "asc" }
    })
    return NextResponse.json(lessons)
  } catch (error) {
    console.error("Failed to fetch lessons:", error)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ moduleId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = lessonSchema.parse(json)

    // Verify module exists
    const module = await prisma.modules.findUnique({
      where: { id: params.moduleId }
    })
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Get the next order number
    const lastLesson = await prisma.sub_lessons.findFirst({
      where: { moduleId: params.moduleId },
      orderBy: { order: "desc" }
    })
    const nextOrder = (lastLesson?.order || 0) + 1

    // Generate thumbnail URL if not provided
    let thumbnailUrl = data.thumbnailUrl
    if (!thumbnailUrl && data.muxPlaybackId) {
      thumbnailUrl = `https://image.mux.com/${data.muxPlaybackId}/thumbnail.jpg?time=5`
    }

    const lesson = await prisma.sub_lessons.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.muxPlaybackId, // Using muxPlaybackId as videoUrl for compatibility
        muxPlaybackId: data.muxPlaybackId,
        muxAssetId: data.muxAssetId,
        duration: data.duration,
        thumbnailUrl,
        order: nextOrder,
        moduleId: params.moduleId,
        muxPolicy: "public",
        muxReadyAt: new Date() // Assume it's ready if we have the playback ID
      }
    })

    return NextResponse.json(lesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    console.error("Failed to create lesson:", error)
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
  }
}

