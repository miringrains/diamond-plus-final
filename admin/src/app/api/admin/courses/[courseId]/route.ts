import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(10).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  published: z.boolean().optional(),
  thumbnail: z.string().url().optional().or(z.literal("")),
})

// GET - Fetch course details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params

    const course = await prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            description: true,
            sub_lessons: {
              select: {
                id: true,
                duration: true
              }
            }
          }
        },
        _count: {
          select: { modules: true }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    )
  }
}

// PUT - Update course
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params
    const body = await req.json()
    const validatedData = updateCourseSchema.parse(body)

    // Check if course exists
    const existingCourse = await prisma.courses.findUnique({
      where: { id: courseId }
    })

    if (!existingCourse) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // If slug is being updated, check for duplicates
    if (validatedData.slug && validatedData.slug !== existingCourse.slug) {
      const slugExists = await prisma.courses.findUnique({
        where: { slug: validatedData.slug }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: "A course with this slug already exists" },
          { status: 400 }
        )
      }
    }

    // Update course
    const updatedCourse = await prisma.courses.update({
      where: { id: courseId },
      data: validatedData,
      include: {
        _count: {
          select: { modules: true }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating course:", error)
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    )
  }
}

// DELETE - Delete course
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params

    // Check if course exists
    const course = await prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: { modules: true }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // Delete course (lessons will be cascade deleted)
    await prisma.courses.delete({
      where: { id: courseId }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Course "${course.title}" and ${course._count.modules} modules deleted successfully` 
    })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    )
  }
}