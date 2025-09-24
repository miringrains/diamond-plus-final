import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const moduleSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
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
    const programId = searchParams.get("programId")

    const modules = await prisma.modules.findMany({
      where: programId ? { courses: { slug: programId } } : undefined,
      include: {
        sub_lessons: {
          orderBy: {
            order: 'asc'
          }
        },
        courses: true
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(modules)
  } catch (error) {
    console.error("Error fetching modules:", error)
    return NextResponse.json(
      { error: "Failed to fetch modules" },
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
    const validated = moduleSchema.parse(body)

    // Get the max order for this course
    const maxOrder = await prisma.modules.findFirst({
      where: { courseId: validated.courseId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const module = await prisma.modules.create({
      data: {
        ...validated,
        order: validated.order ?? ((maxOrder?.order ?? 0) + 1)
      },
      include: {
        sub_lessons: true,
        courses: true
      }
    })

    return NextResponse.json(module)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Error creating module:", error)
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 }
    )
  }
}

// PATCH for reordering modules
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { modules } = body as { modules: Array<{ id: string; order: number }> }

    // Update all modules in a transaction
    await prisma.$transaction(
      modules.map(({ id, order }) =>
        prisma.modules.update({
          where: { id },
          data: { order }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering modules:", error)
    return NextResponse.json(
      { error: "Failed to reorder modules" },
      { status: 500 }
    )
  }
}
