import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

// GET /api/admin/users - List all users with optional filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""
    const verified = searchParams.get("verified")

    const where = {
      AND: [
        search ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ]
        } : {},
        role ? { role: role as "USER" | "ADMIN" } : {},
        verified !== null ? { emailVerified: verified === "true" ? { not: null } : null } : {},
      ].filter(condition => Object.keys(condition).length > 0)
    }

    const users = await prisma.users.findMany({
      where: where.AND.length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        ghlContactId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            progress: true,
            sessions: true,
          }
        }
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[Admin Users] Error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// POST /api/admin/users - Create a new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user?.role !== "admin" && session.user?.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await req.json()
    const data = createUserSchema.parse(json)

    // Check if user already exists
    const existing = await prisma.users.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const bcrypt = require("bcryptjs")
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user - map role to uppercase for Prisma enum
    const mappedRole = data.role === "admin" ? "ADMIN" : data.role === "super_admin" ? "ADMIN" : "USER"
    
    const user = await prisma.users.create({
      data: {
        ...data,
        role: mappedRole as any,
        password: hashedPassword,
        
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 })
    }
    console.error("[Admin Create User] Error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

