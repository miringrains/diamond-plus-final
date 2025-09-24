import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { mux } from "@/lib/mux"

const updateSubLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(1).optional(),
  muxPolicy: z.enum(["public", "signed"]).optional(),
})

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ subLessonId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const subLesson = await prisma.sub_lessons.findUnique({
      where: { id: params.subLessonId },
      include: {
        modules: {
          include: {
            courses: true
          }
        }
      }
    })

    if (!subLesson) {
      return NextResponse.json({ error: "Sub-lesson not found" }, { status: 404 })
    }

    return NextResponse.json(subLesson)
  } catch (error) {
    console.error("[SubLesson GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch sub-lesson" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ subLessonId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await req.json()
    const validatedData = updateSubLessonSchema.parse(json)

    const subLesson = await prisma.sub_lessons.update({
      where: { id: params.subLessonId },
      data: validatedData
    })

    return NextResponse.json(subLesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("[SubLesson PUT]", error)
    return NextResponse.json(
      { error: "Failed to update sub-lesson" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ subLessonId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get the sub-lesson to check for Mux asset
    const subLesson = await prisma.sub_lessons.findUnique({
      where: { id: params.subLessonId },
      select: { muxAssetId: true }
    })

    if (!subLesson) {
      return NextResponse.json({ error: "Sub-lesson not found" }, { status: 404 })
    }

    // Delete Mux asset if it exists
    if (subLesson.muxAssetId && mux) {
      try {
        await mux.video.assets.delete(subLesson.muxAssetId)
      } catch (error) {
        console.error("[SubLesson DELETE] Failed to delete Mux asset:", error)
        // Continue with sub-lesson deletion even if Mux deletion fails
      }
    }

    // Delete the sub-lesson
    await prisma.sub_lessons.delete({
      where: { id: params.subLessonId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SubLesson DELETE]", error)
    return NextResponse.json(
      { error: "Failed to delete sub-lesson" },
      { status: 500 }
    )
  }
}
