import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(1).optional(),
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
    const module = await prisma.modules.findUnique({
      where: { id: params.moduleId },
      include: {
        sub_lessons: {
          orderBy: { order: "asc" }
        }
      }
    })

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    return NextResponse.json(module)
  } catch (error) {
    console.error("[Module GET]", error)
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const validatedData = updateModuleSchema.parse(json)

    const module = await prisma.modules.update({
      where: { id: params.moduleId },
      data: validatedData
    })

    return NextResponse.json(module)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("[Module PUT]", error)
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ moduleId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Delete the module (cascade will delete sub-lessons)
    await prisma.modules.delete({
      where: { id: params.moduleId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Module DELETE]", error)
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 }
    )
  }
}
