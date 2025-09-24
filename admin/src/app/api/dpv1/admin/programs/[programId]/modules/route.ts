import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const moduleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional()
})

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ programId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const modules = await prisma.modules.findMany({
      where: { courseId: params.programId },
      orderBy: { order: "asc" }
    })
    return NextResponse.json(modules)
  } catch (error) {
    console.error("Failed to fetch modules:", error)
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ programId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = moduleSchema.parse(json)

    // Get the next order number
    const lastModule = await prisma.modules.findFirst({
      where: { courseId: params.programId },
      orderBy: { order: "desc" }
    })
    const nextOrder = (lastModule?.order || 0) + 1

    const module = await prisma.modules.create({
      data: {
        title: data.title,
        description: data.description,
        order: nextOrder,
        courseId: params.programId
      }
    })

    return NextResponse.json(module)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    console.error("Failed to create module:", error)
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 })
  }
}

