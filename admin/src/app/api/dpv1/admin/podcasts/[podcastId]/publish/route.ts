import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const publishSchema = z.object({
  published: z.boolean()
})

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ podcastId: string }> }
) {
  const params = await props.params
  const session = await auth()
  if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const json = await req.json()
    const data = publishSchema.parse(json)

    const podcast = await prisma.podcasts.update({
      where: { id: params.podcastId },
      data: {
        published: data.published,
        publishedAt: data.published ? new Date() : null
      }
    })

    return NextResponse.json(podcast)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 })
    }
    console.error("Failed to update podcast publish status:", error)
    return NextResponse.json({ error: "Failed to update podcast" }, { status: 500 })
  }
}

