'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// Dynamically import MuxPlayer to avoid SSR issues
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <div className="text-white">Loading player...</div>
    </div>
  )
})

interface Video {
  id: string
  title: string
  duration: string
  playbackId: string
  thumbnailUrl?: string
  isCurrentlyPlaying: boolean
  isCompleted?: boolean
}

interface VideoContent {
  title: string
  description: string
  videos: Video[]
  currentVideoIndex: number
}

interface StyledMuxPlayerProps {
  content: VideoContent
  type: string
  id: string
}

export default function StyledMuxPlayer({ content, type, id }: StyledMuxPlayerProps) {
  const router = useRouter()
  const [currentVideoIndex, setCurrentVideoIndex] = useState(content.currentVideoIndex)
  const [videos, setVideos] = useState(content.videos)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const currentVideo = videos[currentVideoIndex]

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index)
    setVideos(videos.map((video, i) => ({
      ...video,
      isCurrentlyPlaying: i === index
    })))
    router.push(`/watch/${type}/${videos[index].id}`)
  }

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      handleVideoSelect(currentVideoIndex - 1)
    }
  }

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      handleVideoSelect(currentVideoIndex + 1)
    }
  }

  const handleVideoEnded = () => {
    setVideos(videos.map((video, i) => ({
      ...video,
      isCompleted: i === currentVideoIndex ? true : video.isCompleted
    })))
    
    if (currentVideoIndex < videos.length - 1) {
      setTimeout(() => {
        handleNextVideo()
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <style jsx global>{`
        /* Override Mux Player default styles for dark theme */
        mux-player {
          --controls-background: rgba(0, 0, 0, 0.8) !important;
          --controls-backdrop-color: rgba(0, 0, 0, 0.6) !important;
          --controls-text-color: #ffffff !important;
          --controls-icon-color: #ffffff !important;
          --controls-hover-background: rgba(255, 255, 255, 0.1) !important;
          --media-primary-color: #176FFF !important;
          --media-secondary-color: #ffffff !important;
          --media-accent-color: #176FFF !important;
        }
        
        mux-player .mux-player-controls {
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.9)) !important;
        }
        
        mux-player button {
          color: white !important;
        }
        
        mux-player button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        
        mux-player .mux-player-time {
          color: white !important;
        }
        
        mux-player .mux-player-progress-bar {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
        
        mux-player .mux-player-progress-bar-value {
          background-color: #176FFF !important;
        }
      `}</style>
      
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player Container */}
          <div className="relative flex-1 bg-black">
            <MuxPlayer
              playbackId={currentVideo.playbackId}
              streamType="on-demand"
              autoPlay
              onEnded={handleVideoEnded}
              className="absolute inset-0 w-full h-full"
              metadata={{
                video_id: currentVideo.id,
                video_title: currentVideo.title,
              }}
              primaryColor="#176FFF"
              secondaryColor="#ffffff"
              poster={`https://image.mux.com/${currentVideo.playbackId}/thumbnail.png?width=1920&height=1080&fit_mode=smartcrop&time=5`}
            />
          </div>

          {/* Video Info Bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-white mb-1">
                  {currentVideo.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{currentVideoIndex + 1} of {videos.length}</span>
                  <span>•</span>
                  <span>{currentVideo.duration}</span>
                </div>
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousVideo}
                  disabled={currentVideoIndex === 0}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextVideo}
                  disabled={currentVideoIndex === videos.length - 1}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className={cn(
          "w-full lg:w-96 bg-gray-900 border-l border-gray-800 transition-transform duration-300",
          "fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-white">{content.title}</h2>
              <p className="text-sm text-gray-400">{videos.length} videos</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="p-2">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoSelect(index)}
                  className={cn(
                    "w-full flex gap-3 p-3 rounded-lg transition-all duration-200",
                    "hover:bg-gray-800 group",
                    video.isCurrentlyPlaying && "bg-gray-800"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-32 h-20">
                    <div className="absolute inset-0 bg-gray-800 rounded overflow-hidden">
                      <Image
                        src={`https://image.mux.com/${video.playbackId}/thumbnail.png?width=320&height=180&fit_mode=smartcrop&time=10`}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized
                      />
                      {video.isCurrentlyPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    {/* Duration overlay */}
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                      {video.duration}
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        video.isCurrentlyPlaying ? "text-[#176FFF]" : "text-gray-300"
                      )}>
                        {index + 1}.
                      </span>
                      <h3 className={cn(
                        "text-sm font-medium line-clamp-2",
                        video.isCurrentlyPlaying ? "text-[#176FFF]" : "text-gray-300 group-hover:text-white"
                      )}>
                        {video.title}
                      </h3>
                    </div>
                    {video.isCompleted && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">Completed</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      {!sidebarOpen && (
        <Button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#176FFF] hover:bg-[#1563E0] text-white lg:hidden"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Playlist
        </Button>
      )}
    </div>
  )
}
