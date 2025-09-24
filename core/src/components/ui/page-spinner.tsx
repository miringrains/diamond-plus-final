"use client"

import { cn } from "@/lib/utils"

interface PageSpinnerProps {
  fullScreen?: boolean
  className?: string
  text?: string
}

export function PageSpinner({ fullScreen = false, className, text }: PageSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-muted animate-pulse" />
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-[#176FFF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          {text && (
            <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-muted animate-pulse" />
          <div className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-t-[#176FFF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  )
}
