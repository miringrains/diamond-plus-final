import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createContentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["workshop", "podcast", "module", "coaching"]),
  category: z.string().optional(),
  is_published: z.boolean().default(false),
  thumbnail_url: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const data = createContentSchema.parse(body)

    // Create the content
    const content = await prisma.dp_content.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category || data.type + 's', // Default to plural of type
        is_published: data.is_published,
        thumbnail_url: data.thumbnail_url,
        created_by: session.user.id,
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

    console.error("Error creating content:", error)
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get("type")
    const is_published = searchParams.get("is_published")

    const where: any = {}
    
    if (type) {
      where.type = type
    }
    
    if (is_published !== null) {
      where.is_published = is_published === "true"
    }

    const content = await prisma.dp_content.findMany({
      where,
      include: {
        dp_videos: true,
        dp_podcasts: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error("Error fetching content:", error)
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    )
  }
}
