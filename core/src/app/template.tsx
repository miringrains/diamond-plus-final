"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    // Show loading bar briefly on route change
    setIsNavigating(true)
    const timer = setTimeout(() => setIsNavigating(false), 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden bg-primary/20">
          <div 
            className="h-full bg-gradient-to-r from-[#176FFF] to-[#2483FF] animate-[slide_0.3s_ease-out]"
            style={{
              animation: "slide 0.3s ease-out forwards"
            }}
          />
        </div>
      )}
      {children}
      <style jsx>{`
        @keyframes slide {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
