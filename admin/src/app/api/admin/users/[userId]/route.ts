import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// GET /api/admin/users/:userId - Get a specific user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        ghlContactId: true,
        ghlTags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            progress: true,
            sessions: true,
          }
        },
        progress: {
          orderBy: { lastWatched: "desc" },
          take: 10,
          include: {
            sub_lessons: {
              include: {
                modules: {
                  include: {
                    courses: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[Admin User] Error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

// PATCH /api/admin/users/:userId - Update a user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  emailVerified: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    const json = await req.json()
    const data = updateUserSchema.parse(json)

    // Don't allow admins to change their own role
    if (userId === session.user?.id && data.role && data.role !== (session.user?.role as any)) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 })
    }

    // Handle password update separately
    let updateData: any = { ...data }
    if (data.password) {
      const bcrypt = require("bcryptjs")
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    // Handle email verification
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified ? new Date() : null
      delete updateData.emailVerified
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 })
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    console.error("[Admin Update User] Error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// DELETE /api/admin/users/:userId - Delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params

    // Don't allow admins to delete themselves
    if (userId === session.user?.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user (cascades to related records)
    await prisma.users.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: "User deleted successfully", deletedUser: user })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    console.error("[Admin Delete User] Error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}