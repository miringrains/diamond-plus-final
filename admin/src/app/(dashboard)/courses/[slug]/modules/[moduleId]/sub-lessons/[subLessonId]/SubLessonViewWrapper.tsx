"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle, Clock, PlayCircle, ChevronRight, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/plyr"
import { LessonNotes } from "@/components/LessonNotes"
import { LessonLayout } from "@/components/course/LessonLayout"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Move dynamic import OUTSIDE the component to prevent re-mounting
const MuxPlayerEnhanced = dynamic(
  () => import("@/components/MuxPlayerEnhanced").then(mod => ({ default: mod.MuxPlayerEnhanced })),
  { ssr: false }
)

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
    sub_lessons: Array<{
      id: string
      title: string
      duration: number | null
      muxReadyAt: Date | null
      progress?: Array<{
        completed: boolean
        watchTime: number
        positionSeconds?: number | null
        durationSeconds?: number | null
      }>
    }>
  }>
  initialProgress: {
    watchTime: number
    positionSeconds: number
    completed: boolean
    notes: string
    lastWatched: Date
  } | null
  previousSubLesson: { id: string; title: string } | null
  nextSubLesson: { id: string; title: string } | null
}

export default function SubLessonViewWrapper({
  subLesson,
  module,
  course,
  allModules,
  initialProgress,
  previousSubLesson,
  nextSubLesson
}: SubLessonViewWrapperProps) {

  const router = useRouter()
  const [completed, setCompleted] = useState(initialProgress?.completed || false)
  const [currentProgress, setCurrentProgress] = useState(
    initialProgress && subLesson.duration && subLesson.duration > 0
      ? Math.min(Math.round((initialProgress.watchTime / subLesson.duration) * 100), 100)
      : 0
  )
  const progressUpdateTimer = useRef<NodeJS.Timeout | null>(null)
  const [resumePosition, setResumePosition] = useState<number | null>(initialProgress?.positionSeconds || 0)
  const [muxToken, setMuxToken] = useState<string | undefined>(undefined)
  const [processingStatus, setProcessingStatus] = useState<{
    ready: boolean
    error?: string
  }>({ ready: !!subLesson.muxReadyAt })

  // Fetch Mux token if needed
  useEffect(() => {
    if (!subLesson.muxPlaybackId || subLesson.muxPolicy !== 'signed') return
    
    let cancelled = false
    
    const fetchToken = async () => {
      try {
        const response = await fetch(`/api/mux/playback-token?playbackId=${subLesson.muxPlaybackId}`)
        if (!response.ok) {
          console.error('[SubLessonView] Failed to fetch Mux token:', response.status)
          return
        }
        
        const data = await response.json()
        if (!cancelled && data.token) {
          console.log('[SubLessonView] Received Mux token for playback')
          setMuxToken(data.token)
        }
      } catch (error) {
        console.error('[SubLessonView] Error fetching Mux token:', error)
      }
    }
    
    fetchToken()
    
    return () => {
      cancelled = true
    }
  }, [subLesson.muxPlaybackId, subLesson.muxPolicy, subLesson.id])

  // Check video processing status
  useEffect(() => {
    if (!subLesson.muxAssetId || processingStatus.ready || processingStatus.error) return
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/admin/preview-video?assetId=${subLesson.muxAssetId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setProcessingStatus({ ready: false, error: 'Video not found' })
          }
          return
        }
        
        const data = await response.json()
        if (data.status === 'ready') {
          setProcessingStatus({ ready: true })
          window.location.reload() // Reload to fetch new playback ID
        } else if (data.status === 'errored') {
          setProcessingStatus({ ready: false, error: data.error || 'Video processing failed' })
        }
      } catch (error) {
        console.error('[SubLessonView] Error checking video status:', error)
      }
    }
    
    // Poll every 5 seconds
    const pollInterval = setInterval(checkStatus, 5000)
    
    // Initial check
    checkStatus()
    
    return () => clearInterval(pollInterval)
  }, [subLesson.id, subLesson.muxAssetId, processingStatus.ready, processingStatus.error])

  // Handle progress updates efficiently with throttling
  const handleProgress = useCallback((seconds: number) => {
    const duration = subLesson.duration || 0
    const progress = duration > 0 ? Math.min(Math.round((seconds / duration) * 100), 100) : 0
    setCurrentProgress(progress)
    
    // Clear any existing timer
    if (progressUpdateTimer.current) {
      clearTimeout(progressUpdateTimer.current)
    }
    
    // Set a new timer to save progress after 5 seconds of no updates
    progressUpdateTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/progress/sub-lessons/${subLesson.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            watchTime: seconds,
            positionSeconds: seconds,
            durationSeconds: duration,
            completed: false
          })
        })
      } catch (error) {
        console.error('[SubLessonView] Failed to save progress:', error)
      }
    }, 5000)
  }, [subLesson.id, subLesson.duration])

  // Handle lesson completion
  const handleComplete = async () => {
    if (completed) return
    
    setCompleted(true)
    try {
      await fetch(`/api/progress/sub-lessons/${subLesson.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchTime: subLesson.duration || 0,
          positionSeconds: subLesson.duration || 0,
          durationSeconds: subLesson.duration || 0,
          completed: true
        })
      })
    } catch (error) {
      console.error("[SubLessonView] Failed to mark complete:", error)
    }
  }

  // Use real-time progress from video player
  const progressPercentage = currentProgress

  // Calculate overall course progress
  const courseProgress = (() => {
    const totalLessons = allModules.reduce((acc, mod) => acc + mod.sub_lessons.length, 0)
    let totalProgress = 0
    
    allModules.forEach(mod => {
      mod.sub_lessons.forEach(sl => {
        if (sl.id === subLesson.id) {
          // Use current progress for active lesson
          totalProgress += currentProgress
        } else if (sl.progress && sl.progress.length > 0) {
          const prog = sl.progress[0]
          if (prog.completed) {
            totalProgress += 100
          } else if (sl.duration && sl.duration > 0) {
            const position = prog.positionSeconds ?? prog.watchTime ?? 0
            totalProgress += Math.min((position / sl.duration) * 100, 100)
          }
        }
      })
    })
    
    return totalLessons > 0 ? Math.round(totalProgress / totalLessons) : 0
  })()

  const completedLessons = allModules.reduce((acc, mod) => 
    acc + mod.sub_lessons.filter(sl => {
      const prog = sl.progress && sl.progress.length > 0 ? sl.progress[0] : null
      return prog?.completed || false
    }).length, 0
  )

  const totalLessons = allModules.reduce((acc, mod) => acc + mod.sub_lessons.length, 0)

  return (
    <LessonLayout
      video={
        // Video Player - preserving all existing logic exactly
        <>
          {processingStatus.error ? (
            <div className="w-full h-full bg-destructive/10 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-destructive font-semibold mb-2">Video Processing Error</p>
                <p className="text-sm text-muted-foreground">{processingStatus.error}</p>
              </div>
            </div>
          ) : subLesson.muxAssetId && !processingStatus.ready ? (
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <div className="animate-pulse mb-4">
                  <svg className="w-12 h-12 mx-auto text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                  </svg>
                </div>
                <p className="text-muted-foreground font-semibold mb-2">Video Processing</p>
                <p className="text-sm text-muted-foreground">Your video is being prepared. This may take a few minutes.</p>
                <p className="text-xs text-muted-foreground mt-2">This page will refresh automatically when ready.</p>
              </div>
            </div>
          ) : subLesson.muxPlaybackId && processingStatus.ready ? (
            <MuxPlayerEnhanced
              lessonId={subLesson.id}
              playbackId={subLesson.muxPlaybackId}
              title={subLesson.title}
              startTimeSec={resumePosition || 0}
              className="rounded-lg overflow-hidden shadow-lg w-full h-full"
              initialToken={muxToken}
              requiresToken={subLesson.muxPolicy === 'signed'}
              onProgress={handleProgress}
              onComplete={handleComplete}
              thumbnailTime={5}
              isSubLesson={true}
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-muted-foreground font-semibold mb-2">No Video Available</p>
                <p className="text-sm text-muted-foreground">This lesson needs to be configured with Mux video.</p>
              </div>
            </div>
          )}
        </>
      }
      title={
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight break-words">{subLesson.title}</h1>
            <Badge 
              variant={completed ? "default" : "secondary"} 
              className={cn("shrink-0 self-start", completed && "bg-green-500")}
            >
              {completed ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Completed
                </>
              ) : (
                <>
                  <Clock className="mr-1 h-3 w-3" />
                  In Progress
                </>
              )}
            </Badge>
          </div>
          {subLesson.description && (
            <p className="text-muted-foreground text-sm md:text-base break-words">{subLesson.description}</p>
          )}
        </div>
      }
      meta={
        <div className="space-y-3">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1.5 text-sm overflow-hidden">
            <Link href="/dashboard" className="hover:underline text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href={`/courses/${course.slug}`} className="hover:underline text-muted-foreground hover:text-foreground transition-colors">
              <span className="inline-block max-w-[120px] truncate align-bottom sm:max-w-[200px]">{course.title}</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium inline-block max-w-[120px] truncate align-bottom sm:max-w-none">{module.title}</span>
          </nav>
          
          {/* Lesson info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="whitespace-nowrap">Lesson {allModules.find(m => m.id === module.id)?.sub_lessons.findIndex(sl => sl.id === subLesson.id)! + 1} of {allModules.find(m => m.id === module.id)?.sub_lessons.length}</span>
          </div>
        </div>
      }
      actions={
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          {previousSubLesson ? (
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href={`/courses/${course.slug}/modules/${module.id}/sub-lessons/${previousSubLesson.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </Link>
            </Button>
          ) : (
            <div />
          )}
          
          {nextSubLesson ? (
            <Button
              asChild
              variant="default"
              className="w-full sm:w-auto"
            >
              <Link href={`/courses/${course.slug}/modules/${module.id}/sub-lessons/${nextSubLesson.id}`}>
                Next Lesson
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
              asChild
            >
              <Link href={`/courses/${course.slug}`}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Back to Course
              </Link>
            </Button>
          )}
        </div>
      }
      notes={
        <div className="space-y-4">
          <LessonNotes 
            lessonId={subLesson.id} 
            initialNotes={initialProgress?.notes || ""}
          />
        </div>
      }
      progress={
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Lesson Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Course Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{courseProgress}%</span>
            </div>
            <Progress value={courseProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>

          {/* Course navigation */}
          <div className="pt-4 border-t">
            <Link 
              href={`/courses/${course.slug}`} 
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {course.title}
            </Link>
          </div>
        </div>
      }
    />
  )
}
