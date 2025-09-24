import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mux, requireMuxConfigured } from "@/lib/mux"
import { z } from "zod"
import { assertLessonAccess } from "@/lib/lesson-access"

const bodySchema = z.object({
  playbackId: z.string().min(3),
  lessonId: z.string().min(3).optional(),
  expiresInSeconds: z.number().int().min(60).max(60 * 60 * 24).default(3600),
})

export async function POST(req: NextRequest) {
  try {
    requireMuxConfigured()

    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await req.json()
    const { playbackId, lessonId, expiresInSeconds } = bodySchema.parse(json)

    if (lessonId) {
      const access = await assertLessonAccess(session.user?.id, lessonId)
      if (!access.allowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const token = mux.jwt.signPlaybackId(playbackId, {
      type: "video",
      expiration: `${expiresInSeconds}s`,
    })

    return NextResponse.json({ token, expiresInSeconds })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 })
    }
    console.error("[Mux Token] Error:", error)
    return NextResponse.json({ error: "Failed to create Mux token" }, { status: 500 })
  }
}


