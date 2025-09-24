import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const programSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  slug: z.string().min(1).max(100)
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const programs = await prisma.courses.findMany({
      orderBy: { createdAt: "asc" }
    })
    return NextResponse.json(programs)
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = programSchema.parse(json)

    // Check if slug already exists
    const existing = await prisma.courses.findUnique({
      where: { slug: data.slug }
    })

    if (existing) {
      return NextResponse.json({ error: "Program with this slug already exists" }, { status: 400 })
    }

    const program = await prisma.courses.create({
      data: {
        title: data.title,
        description: data.description,
        slug: data.slug,
        published: false
      }
    })

    return NextResponse.json(program)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    console.error("Failed to create program:", error)
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 })
  }
}

