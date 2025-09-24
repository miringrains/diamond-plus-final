"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function LoadingBar() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Start loading when route changes
    setLoading(true)
    setProgress(30)

    // Simulate progress
    const timer1 = setTimeout(() => setProgress(60), 100)
    const timer2 = setTimeout(() => setProgress(80), 200)

    // Complete loading
    const timer3 = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 200)
    }, 300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [pathname, searchParams])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div 
        className="h-[3px] bg-gradient-to-r from-[#176FFF] to-[#2483FF] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(23,111,255,0.7)]"
        style={{ 
          width: `${progress}%`,
          boxShadow: progress > 0 ? '0 0 10px rgba(23,111,255,0.7)' : 'none'
        }}
      />
    </div>
  )
}
