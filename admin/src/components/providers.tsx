"use client"

// No session provider needed for Supabase as it handles sessions internally
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}