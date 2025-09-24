"use client"

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface VideoPlayerErrorBoundaryProps {
  children: ReactNode
  lessonId?: string
  className?: string
}

interface VideoPlayerErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
}

export class VideoPlayerErrorBoundary extends Component<VideoPlayerErrorBoundaryProps, VideoPlayerErrorBoundaryState> {
  private resetKey: number = 0

  constructor(props: VideoPlayerErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<VideoPlayerErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VideoPlayerErrorBoundary] Error caught:', error, errorInfo)
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))
  }

  componentDidUpdate(prevProps: VideoPlayerErrorBoundaryProps) {
    // Reset error state when lesson changes
    if (prevProps.lessonId !== this.props.lessonId && this.state.hasError) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    this.resetKey++
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      const isHydrationError = this.state.error?.message?.includes('419') || 
                              this.state.error?.message?.includes('NotFoundError') ||
                              this.state.error?.message?.includes('insertBefore')

      return (
        <div className={this.props.className}>
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold">
                {isHydrationError 
                  ? "Video player initialization error" 
                  : "Something went wrong with the video player"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHydrationError
                  ? "There was a problem loading the video player. This usually happens when switching between lessons quickly."
                  : this.state.error?.message || "An unexpected error occurred"}
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={this.resetErrorBoundary}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
                {this.state.errorCount > 2 && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                  >
                    Reload Page
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    // Don't use dynamic key during initial render to avoid hydration issues
    return <>{this.props.children}</>
  }
}
