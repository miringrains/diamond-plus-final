"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import MuxPlayerUncontrolled from "@/components/MuxPlayerUncontrolled"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubLessonViewWrapperProps {
  subLesson: {
    id: string
    title: string
    description: string | null
    duration: number | null
    muxPlaybackId?: string | null
    muxAssetId?: string | null
    muxPolicy?: string | null
    muxReadyAt?: Date | null
    muxError?: string | null
  }
  module: {
    id: string
    title: string
    description: string | null
  }
  course: {
    id: string
    title: string
    slug: string
  }
  allModules: Array<{
    id: string
    title: string
    order: number
    subLessons: Array<{
      id: string
      title: string
      order: number
      duration: number | null
      progress?: {
        completed: boolean
        positionSeconds: number
      }
    }>
  }>
  initialProgress?: {
    completed: boolean
    positionSeconds: number
  }
  previousSubLesson?: {
    id: string
    title: string
    moduleId: string
  }
  nextSubLesson?: {
    id: string
    title: string
    moduleId: string
  }
}

export default function SubLessonViewWrapperUncontrolled({
  subLesson,
  module,
  course,
  allModules,
  initialProgress,
  previousSubLesson,
  nextSubLesson
}: SubLessonViewWrapperProps) {
  // Use the uncontrolled player directly

  const router = useRouter()
  const [showSidebar, setShowSidebar] = useState(false)
  
  // All dynamic data in refs to prevent re-renders
  const playerDataRef = useRef({
    resumePosition: initialProgress?.positionSeconds || 0,
    token: undefined as string | undefined,
    processingReady: !!subLesson.muxReadyAt,
    processingError: subLesson.muxError || null
  })
  
  // Progress state for UI only - decoupled from player
  const [uiProgress, setUiProgress] = useState({
    completed: initialProgress?.completed || false,
    position: 0,
    duration: subLesson.duration || 0,
    percentage: 0
  })
  
  // Fetch resume position once on mount
  useEffect(() => {
    let mounted = true
    
    async function fetchData() {
      try {
        // Fetch resume position
        const progressResponse = await fetch(`/api/progress/sub-lessons/${subLesson.id}`)
        if (progressResponse.ok) {
          const data = await progressResponse.json()
          if (mounted) {
            playerDataRef.current.resumePosition = data.positionSeconds || 0
          }
        }
        
        // Fetch token if needed
        if (subLesson.muxPlaybackId && subLesson.muxPolicy === 'signed') {
          const tokenResponse = await fetch('/api/mux/playback-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playbackId: subLesson.muxPlaybackId,
              lessonId: subLesson.id
            })
          })
          
          if (tokenResponse.ok) {
            const data = await tokenResponse.json()
            if (mounted) {
              playerDataRef.current.token = data.token
            }
          }
        }
      } catch (error) {
        console.error('[SubLessonView] Failed to fetch initial data:', error)
      }
    }
    
    fetchData()
    
    return () => {
      mounted = false
    }
  }, []) // Only run once on mount
  
  // Handle progress updates from player - UI only
  const handleProgress = useCallback((seconds: number) => {
    setUiProgress(prev => ({
      ...prev,
      position: seconds,
      percentage: prev.duration > 0 ? Math.min((seconds / prev.duration) * 100, 100) : 0
    }))
  }, [])
  
  const handleComplete = useCallback(async () => {
    setUiProgress(prev => ({ ...prev, completed: true, percentage: 100 }))
    
    // Mark complete in background
    try {
      await fetch(`/api/progress/sub-lessons/${subLesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionSeconds: uiProgress.duration,
          durationSeconds: uiProgress.duration,
          completed: true
        })
      })
    } catch (error) {
      console.error("[SubLessonView] Failed to mark complete:", error)
    }
  }, [subLesson.id, uiProgress.duration])
  
  const handleNavigation = (path: string) => {
    router.push(path)
  }
  
  // Stable player section - never unmounts or changes
  const playerSection = (() => {
    if (playerDataRef.current.processingError) {
      return (
        <div className="w-full h-full bg-destructive/10 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-destructive font-semibold mb-2">Video Processing Error</p>
            <p className="text-sm text-muted-foreground">{playerDataRef.current.processingError}</p>
          </div>
        </div>
      )
    }
    
    if (!subLesson.muxPlaybackId) {
      return (
        <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-muted-foreground font-semibold mb-2">No Video Available</p>
            <p className="text-sm text-muted-foreground">This lesson doesn't have a video yet.</p>
          </div>
        </div>
      )
    }
    
    // Always render the player, even if processing
    return (
      <>
        {!playerDataRef.current.processingReady && (
          <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center z-10">
            <div className="text-center p-8">
              <div className="animate-pulse mb-4">
                <svg className="w-12 h-12 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                </svg>
              </div>
              <p className="text-white font-semibold mb-2">Video Processing</p>
              <p className="text-sm text-gray-300">Your video is being prepared. This may take a few minutes.</p>
            </div>
          </div>
        )}
        <MuxPlayerUncontrolled
          lessonId={subLesson.id}
          playbackId={subLesson.muxPlaybackId}
          title={subLesson.title}
          startTimeSec={playerDataRef.current.resumePosition}
          className="rounded-lg overflow-hidden shadow-lg w-full h-full"
          initialToken={playerDataRef.current.token}
          requiresToken={subLesson.muxPolicy === 'signed'}
          onProgress={handleProgress}
          onComplete={handleComplete}
          thumbnailTime={5}
          isSubLesson={true}
        />
      </>
    )
  })()

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-md p-2 shadow-lg"
      >
        {showSidebar ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 lg:shadow-none overflow-y-auto",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b">
          <Link href={`/courses/${course.slug}`} className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Link>
          <h2 className="text-xl font-bold">{course.title}</h2>
        </div>
        
        <div className="p-6">
          {allModules.map((mod) => (
            <div key={mod.id} className="mb-6">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {mod.title}
              </h3>
              <div className="space-y-1">
                {mod.subLessons.map((lesson) => {
                  const isActive = lesson.id === subLesson.id
                  const isCompleted = lesson.progress?.completed || false
                  
                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${course.slug}/modules/${mod.id}/sub-lessons/${lesson.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg text-sm transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-gray-100 dark:hover:bg-gray-700",
                        isCompleted && !isActive && "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                        isActive ? "bg-primary-foreground/20" : isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : (
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isActive ? "bg-primary-foreground" : "bg-gray-400"
                          )} />
                        )}
                      </div>
                      <span className="flex-1 truncate">{lesson.title}</span>
                      {lesson.duration && (
                        <span className="text-xs opacity-70">
                          {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className={cn(
        "lg:ml-80 p-6 transition-all duration-300",
        showSidebar && "blur-sm lg:blur-none"
      )}>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Video Player - Always mounted */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {playerSection}
          </div>
          
          {/* Lesson Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{module.title}</p>
                  <CardTitle className="text-2xl">{subLesson.title}</CardTitle>
                </div>
                {uiProgress.completed && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(uiProgress.percentage)}%</span>
                </div>
                <Progress value={uiProgress.percentage} className="h-2" />
              </div>
            </CardHeader>
            
            {subLesson.description && (
              <CardContent>
                <p className="text-muted-foreground">{subLesson.description}</p>
              </CardContent>
            )}
          </Card>
          
          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => previousSubLesson && handleNavigation(`/courses/${course.slug}/modules/${previousSubLesson.moduleId}/sub-lessons/${previousSubLesson.id}`)}
              disabled={!previousSubLesson}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={() => nextSubLesson && handleNavigation(`/courses/${course.slug}/modules/${nextSubLesson.moduleId}/sub-lessons/${nextSubLesson.id}`)}
              disabled={!nextSubLesson}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
