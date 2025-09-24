import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const session = await auth()
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  return NextResponse.json({
    session,
    cookies: allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })),
    hasSession: !!session,
    hasUser: !!session?.user,
    role: session?.user?.role,
    timestamp: new Date().toISOString()
  })
}