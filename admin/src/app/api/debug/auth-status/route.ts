import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    
    // Get all cookies
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('csrf') || 
      c.name.includes('session')
    )
    
    return NextResponse.json({
      authenticated: !!session,
      session: session && session.user ? {
        users: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role
        },
        expires: session.expires
      } : null,
      headers: {
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
        cookie: req.headers.get('cookie') ? 'Present' : 'Missing',
        userAgent: req.headers.get('user-agent')
      },
      cookies: authCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check auth status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
