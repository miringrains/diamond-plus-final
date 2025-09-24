import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getSignedVideoUrl } from "@/lib/s3"
import { mux, requireMuxConfigured } from "@/lib/mux"
import { z } from "zod"

const subLessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  // For legacy/S3 playback
  videoUrl: z.string().min(1).optional(),
  // For Mux path
  s3Key: z.string().min(1).optional(),
  useMux: z.boolean().optional(),
  muxPolicy: z.enum(["public", "signed"]).optional().default("public"),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
})

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ moduleId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const subLessons = await prisma.sub_lessons.findMany({
      where: { moduleId: params.moduleId },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(subLessons)
  } catch (error) {
    console.error("[SubLessons GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch sub-lessons" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ moduleId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await req.json()
    const validatedData = subLessonSchema.parse(json)

    // Get the module to verify it exists
    const module = await prisma.modules.findUnique({
      where: { id: params.moduleId },
      include: { courses: true }
    })

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Get the next order number
    const lastSubLesson = await prisma.sub_lessons.findFirst({
      where: { moduleId: params.moduleId },
      orderBy: { order: "desc" },
    })
    const nextOrder = (lastSubLesson?.order || 0) + 1

    let muxAssetId: string | undefined
    let muxPlaybackId: string | undefined
    let finalVideoUrl = validatedData.videoUrl

    // If useMux is true and we have an S3 key, ingest to Mux
    if (validatedData.useMux && validatedData.s3Key) {
      requireMuxConfigured()

      // Get signed URL for Mux to access the video
      const signedUrl = await getSignedVideoUrl(validatedData.s3Key)

      // Create Mux asset
      const asset = await mux.video.assets.create({
        inputs: [{ url: signedUrl }],
        playback_policy: validatedData.muxPolicy === "signed" ? ["signed"] : ["public"],
        passthrough: module.courseId,
      })

      muxAssetId = asset.id
      muxPlaybackId = asset.playback_ids?.[0]?.id

      // Keep S3 key as fallback storage reference
      finalVideoUrl = validatedData.s3Key
    }

    // If using Mux, generate thumbnail URL
    let thumbnailUrl = validatedData.thumbnailUrl
    if (muxPlaybackId && !thumbnailUrl) {
      // Mux automatically generates thumbnails
      thumbnailUrl = `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=5`
    }

    const subLesson = await prisma.sub_lessons.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        videoUrl: finalVideoUrl || "",
        thumbnailUrl,
        duration: validatedData.duration,
        muxPlaybackId,
        muxAssetId,
        muxPolicy: validatedData.useMux ? validatedData.muxPolicy : null,
        moduleId: params.moduleId,
        order: nextOrder,
      },
    })

    return NextResponse.json(subLesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("[SubLessons POST]", error)
    return NextResponse.json(
      { error: "Failed to create sub-lesson" },
      { status: 500 }
    )
  }
}
