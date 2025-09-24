import { NextResponse } from "next/server"
import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    // Test direct database check
    const user = await prisma.users.findUnique({
      where: { email },
    })
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    const passwordValid = await compare(password, user.password!)
    
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }
    
    // User is valid in database
    return NextResponse.json({
      message: "Database check passed",
      users: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}