"use client"

import { useEffect, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgress() {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Reset any stuck loading states when navigation completes
    return () => {
      // Cleanup
    }
  }, [pathname, searchParams])

  if (!isPending) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-primary/20">
      <div 
        className="h-full bg-primary animate-pulse"
        style={{
          animation: "loading 1s ease-in-out infinite",
          background: "linear-gradient(to right, #176FFF, #2483FF)"
        }}
      />
      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )
}
