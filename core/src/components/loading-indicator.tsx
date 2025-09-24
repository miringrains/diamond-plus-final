"use client"

import { useFormStatus } from "react-dom"

interface LoadingIndicatorProps {
  isLoading?: boolean
  text?: string
}

// Simple loading spinner that can be controlled or auto-detect form submission
export function LoadingIndicator({ isLoading, text }: LoadingIndicatorProps) {
  const { pending } = useFormStatus()
  const showLoading = isLoading || pending

  if (!showLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-[#176FFF]" />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  )
}
