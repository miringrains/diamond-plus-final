'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  X,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Video {
  id: string
  title: string
  duration: string
  playbackId: string
  thumbnailUrl: string
  isCurrentlyPlaying: boolean
  isCompleted?: boolean
}

interface VideoContent {
  title: string
  description: string
  videos: Video[]
  currentVideoIndex: number
}

interface VideoPlayerWithPlaylistProps {
  content: VideoContent
  type: string
  id: string
}

export default function VideoPlayerWithPlaylist({ content, type, id }: VideoPlayerWithPlaylistProps) {
  const router = useRouter()
  const [showNotification, setShowNotification] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(content.currentVideoIndex)
  const [videos, setVideos] = useState(content.videos)
  
  const currentVideo = videos[currentVideoIndex]

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index)
    // Update the videos array to reflect the new playing video
    setVideos(videos.map((video, i) => ({
      ...video,
      isCurrentlyPlaying: i === index
    })))
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
    // Mark current video as completed
    setVideos(videos.map((video, i) => ({
      ...video,
      isCompleted: i === currentVideoIndex ? true : video.isCompleted
    })))
    
    // Auto-play next video if available
    if (currentVideoIndex < videos.length - 1) {
      setTimeout(() => {
        handleNextVideo()
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Banner */}
      {showNotification && (
        <div className="bg-blue-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <p className="text-sm font-medium">
                Don't miss out on important updates! 
                <button className="underline ml-1 font-semibold hover:text-blue-100">Turn On Notifications</button>
              </p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Main Content Area */}
        <div className="flex-1 bg-white">
          <div className="p-4 lg:p-6">
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <MuxPlayer
                playbackId={currentVideo.playbackId}
                streamType="on-demand"
                autoPlay
                onEnded={handleVideoEnded}
                className="w-full h-full"
                metadata={{
                  video_id: currentVideo.id,
                  video_title: currentVideo.title,
                }}
              />
            </div>

            {/* Video Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                  {currentVideo.title}
                </h1>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{currentVideo.duration}</span>
                  </div>
                  <span>•</span>
                  <span>{currentVideoIndex + 1} of {videos.length} videos</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePreviousVideo}
                  disabled={currentVideoIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="default"
                  onClick={handleNextVideo}
                  disabled={currentVideoIndex === videos.length - 1}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Description */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">About this video</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{content.description}</p>
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">Comments</span>
                  <span className="text-gray-500">(1)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className="w-full lg:w-96 bg-white border-l border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{content.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{videos.length} Files</p>
          </div>
          
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-3 space-y-1">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoSelect(index)}
                  className={cn(
                    "w-full text-left rounded-lg transition-all duration-200",
                    "hover:bg-gray-50 group",
                    video.isCurrentlyPlaying && "bg-blue-50 hover:bg-blue-50"
                  )}
                >
                  <div className="flex gap-3 p-2">
                    {/* Video Number/Status */}
                    <div className="flex-shrink-0">
                      {video.isCurrentlyPlaying ? (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      ) : video.isCompleted ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                          {index}
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-12 bg-gray-200 rounded overflow-hidden">
                        {video.thumbnailUrl && (
                          <Image
                            src={video.thumbnailUrl}
                            alt={video.title}
                            width={80}
                            height={48}
                            className="object-cover"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-medium text-sm line-clamp-2",
                        video.isCurrentlyPlaying ? "text-blue-600" : "text-gray-900"
                      )}>
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {video.duration}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
