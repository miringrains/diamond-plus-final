import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1),
  published: z.boolean().optional().default(false),
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

    const courses = await prisma.courses.findMany({
      include: {
        modules: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: "Failed to fetch programs" },
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
    const validated = courseSchema.parse(body)

    const course = await prisma.courses.create({
      data: validated,
      include: {
        modules: true
      }
    })

    return NextResponse.json(course)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Error creating program:", error)
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    )
  }
}
