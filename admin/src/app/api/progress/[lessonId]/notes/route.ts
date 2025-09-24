import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lessonId } = await context.params

    const progress = await prisma.progress.findUnique({
      where: {
        userId_subLessonId: {
          userId: session.user.id,
          subLessonId: lessonId,
        },
      },
      select: {
        notes: true,
      },
    })

    return NextResponse.json({ notes: progress?.notes || "" })
  } catch (error) {
    console.error("[Notes GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { lessonId } = await context.params
    const { notes } = await req.json()

    const progress = await prisma.progress.upsert({
      where: {
        userId_subLessonId: {
          userId: session.user.id,
          subLessonId: lessonId,
        },
      },
      update: {
        notes,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        subLessonId: lessonId,
        notes,
        completed: false,
        watchTime: 0,
      },
    })

    return NextResponse.json({ success: true, notes: progress.notes })
  } catch (error) {
    console.error("[Notes POST] Error:", error)
    return NextResponse.json({ error: "Failed to save notes" }, { status: 500 })
  }
}