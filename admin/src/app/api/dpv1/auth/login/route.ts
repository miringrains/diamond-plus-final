import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const { email, password } = loginSchema.parse(json)

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true
      }
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is admin - handle uppercase enum from Prisma
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create session token (simple implementation for preview)
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }

    // Create response with auth cookie
    const response = NextResponse.json({ 
      success: true,
      user: {
        email: user.email,
        name: sessionData.name,
        role: user.role
      }
    })

    // Set secure cookie for preview admin auth
    response.cookies.set('dpv1-admin-auth', Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 // 24 hours
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

