import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ courseId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const modules = await prisma.modules.findMany({
      where: { courseId: params.courseId },
      include: {
        sub_lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            duration: true,
            muxReadyAt: true,
            muxError: true,
            thumbnailUrl: true,
          }
        }
      },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(modules)
  } catch (error) {
    console.error("[Modules GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ courseId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await req.json()
    const validatedData = moduleSchema.parse(json)

    // Get the next order number
    const lastModule = await prisma.modules.findFirst({
      where: { courseId: params.courseId },
      orderBy: { order: "desc" },
    })
    const nextOrder = (lastModule?.order || 0) + 1

    const module = await prisma.modules.create({
      data: {
        ...validatedData,
        courseId: params.courseId,
        order: nextOrder,
      },
    })

    return NextResponse.json(module)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("[Modules POST]", error)
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 }
    )
  }
}
