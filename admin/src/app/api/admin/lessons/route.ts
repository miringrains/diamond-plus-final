import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const lessonSchema = z.object({
  moduleId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  ordinal: z.number().optional(),
  muxPlaybackId: z.string().optional(),
  muxAssetId: z.string().optional(),
  duration: z.number().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get("moduleId")

    const lessons = await prisma.sub_lessons.findMany({
      where: moduleId ? { moduleId } : undefined,
      include: {
        modules: {
          include: {
            courses: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(lessons)
  } catch (error) {
    console.error("Error fetching lessons:", error)
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = lessonSchema.parse(body)

    // Get the max order for this module
    const maxOrder = await prisma.sub_lessons.findFirst({
      where: { moduleId: validated.moduleId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const lesson = await prisma.sub_lessons.create({
      data: {
        title: validated.name,
        description: validated.description,
        moduleId: validated.moduleId,
        order: validated.ordinal ?? ((maxOrder?.order ?? 0) + 1),
        videoUrl: 'https://example.com/video', // Placeholder
        muxPlaybackId: validated.muxPlaybackId,
        muxAssetId: validated.muxAssetId,
        duration: validated.duration
      },
      include: {
        modules: {
          include: {
            courses: true
          }
        }
      }
    })

    return NextResponse.json(lesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Error creating lesson:", error)
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    )
  }
}
