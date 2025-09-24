import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  is_published: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
  thumbnail_url: z.string().optional(),
})

interface RouteParams {
  params: Promise<{
    contentId: string
  }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { contentId } = await params
    const body = await req.json()
    const data = updateContentSchema.parse(body)

    // Update the content
    const content = await prisma.dp_content.update({
      where: {
        id: contentId,
      },
      data: {
        ...data,
        updated_at: new Date(),
      },
    })

    return NextResponse.json(content)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }

    console.error("Error updating content:", error)
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { contentId } = await params
    
    // Delete the content (cascades to videos/podcasts)
    await prisma.dp_content.delete({
      where: {
        id: contentId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting content:", error)
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    )
  }
}
