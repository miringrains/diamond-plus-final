import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  // Clear the auth cookie
  response.cookies.set('dpv1-admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0 // Expire immediately
  })

  return response
}

