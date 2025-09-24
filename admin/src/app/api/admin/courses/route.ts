import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  thumbnail: z.string().url().optional().or(z.literal("")),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = courseSchema.parse(body)

    // Check if slug already exists
    const existing = await prisma.courses.findUnique({
      where: { slug: validatedData.slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: "A course with this slug already exists" },
        { status: 400 }
      )
    }

    const course = await prisma.courses.create({
      data: {
        
        ...validatedData,
        
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    )
  }
}