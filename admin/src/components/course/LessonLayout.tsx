"use client"

import { ReactNode, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LessonLayoutProps {
  video: ReactNode
  title: ReactNode
  meta: ReactNode
  actions: ReactNode
  notes: ReactNode
  progress: ReactNode
  className?: string
}

/**
 * Responsive lesson page layout with light content area
 * - Desktop: 2-column with sticky right rail
 * - Tablet: Stacked layout
 * - Mobile: Tabbed interface
 */
export function LessonLayout({
  video,
  title,
  meta,
  actions,
  notes,
  progress,
  className
}: LessonLayoutProps) {
  const [mobileTab, setMobileTab] = useState<'video' | 'notes'>('video')

  return (
    <main className={cn("bg-background text-foreground overflow-x-hidden", className)}>
      {/* Mobile Layout: Simplified tabs */}
      <div className="block md:hidden overflow-x-hidden">
        <div className="flex gap-2 mb-4">
          <Button 
            variant={mobileTab === 'video' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setMobileTab('video')}
          >
            Video
          </Button>
          <Button 
            variant={mobileTab === 'notes' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setMobileTab('notes')}
          >
            Notes
          </Button>
        </div>
        
        {mobileTab === 'video' && (
          <div className="space-y-4">
            <div className="aspect-video rounded-xl bg-card border shadow-sm overflow-hidden w-full">
              {video}
            </div>
            <div className="space-y-4 mb-6 overflow-x-hidden">
              {title}
              {meta}
              {actions}
            </div>
          </div>
        )}
        
        {mobileTab === 'notes' && (
          <Card className="rounded-xl border-0 bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl">
              <h3 className="font-medium text-sm flex items-center gap-2 text-white">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Notes
              </h3>
            </div>
            <div className="p-3 max-h-[24rem] overflow-y-auto">
              {notes}
            </div>
          </Card>
        )}
      </div>

      {/* Tablet Layout: Stacked */}
      <div className="hidden md:block xl:hidden space-y-6">
        <div className="space-y-6">
          <div className="aspect-video rounded-xl bg-card border shadow-sm overflow-hidden w-full">
            {video}
          </div>
          <div className="space-y-4">
            {title}
            {meta}
            {actions}
          </div>
        </div>
        
        <Card className="rounded-xl border-0 bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl">
            <h3 className="font-medium text-sm flex items-center gap-2 text-white">
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Notes
            </h3>
          </div>
          <div className="p-4 max-h-[24rem] overflow-y-auto">
            {notes}
          </div>
        </Card>
        
        <Card className="rounded-xl border-0 bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl">
            <h3 className="font-medium text-sm flex items-center gap-2 text-white">
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Course Progress
            </h3>
          </div>
          <div className="p-3">
            {progress}
          </div>
        </Card>
      </div>

      {/* Desktop Layout: 2-column with sticky rail */}
      <div className="hidden xl:grid grid-cols-[2fr_1fr] gap-8">
        {/* Main Content */}
        <div className="space-y-6">
          <div className="aspect-video rounded-xl bg-black border shadow-lg overflow-hidden mx-auto w-full">
            {video}
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              {title}
              {meta}
            </div>
            {actions}
          </div>
        </div>

        {/* Right Rail - Sticky */}
        <div className="xl:sticky xl:top-20 flex w-full flex-col gap-4">
          <Card className="rounded-xl border-0 bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl">
              <h3 className="font-medium text-sm flex items-center gap-2 text-white">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Notes
              </h3>
            </div>
            <div className="p-3 max-h-[24rem] overflow-y-auto">
              {notes}
            </div>
          </Card>
          
          <Card className="rounded-xl border-0 bg-card shadow-sm overflow-hidden">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl">
              <h3 className="font-medium text-sm flex items-center gap-2 text-white">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Course Progress
              </h3>
            </div>
            <div className="p-3">
              {progress}
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
