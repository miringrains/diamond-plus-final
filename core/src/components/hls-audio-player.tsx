'use client'

import React, { useState, useRef, useEffect } from 'react'
import Hls from 'hls.js'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HLSAudioPlayerProps {
  episodeNumber: number
  title: string
  description: string
  muxPlaybackId: string
  duration: number
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
}

export function HLSAudioPlayer({
  episodeNumber,
  title,
  description,
  muxPlaybackId,
  duration,
  onTimeUpdate,
  onEnded
}: HLSAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [bufferedTime, setBufferedTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [previousVolume, setPreviousVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mux HLS streaming URL
  const streamUrl = `https://stream.mux.com/${muxPlaybackId}.m3u8`

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Initialize HLS
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
      })
      
      hlsRef.current = hls
      
      hls.loadSource(streamUrl)
      hls.attachMedia(audio)
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        setError(null)
      })
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error - please check your connection')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error - recovering...')
              hls.recoverMediaError()
              break
            default:
              setError('An error occurred loading the audio')
              break
          }
          setIsLoading(false)
        }
      })
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      audio.src = streamUrl
      setIsLoading(false)
    } else {
      setError('HLS is not supported in this browser')
      setIsLoading(false)
    }

    // Audio event listeners
    const updateTime = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)
    }

    const updateBuffer = () => {
      if (audio.buffered.length > 0) {
        setBufferedTime(audio.buffered.end(audio.buffered.length - 1))
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    const handleCanPlay = () => setIsLoading(false)
    const handleWaiting = () => setIsLoading(true)
    const handlePlaying = () => setIsLoading(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('progress', updateBuffer)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('progress', updateBuffer)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
    }
  }, [streamUrl, onTimeUpdate, onEnded])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(err => {
          setError('Failed to play audio')
          console.error('Play failed:', err)
        })
      }
    }
  }

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
    }
  }

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 30)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = previousVolume
        setVolume(previousVolume)
        setIsMuted(false)
      } else {
        setPreviousVolume(volume)
        audioRef.current.volume = 0
        setVolume(0)
        setIsMuted(true)
      }
    }
  }

  const changePlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Episode Info */}
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          THE DIAMOND STANDARD • EPISODE {episodeNumber.toString().padStart(2, '0')}
        </p>
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      </div>
      
      {/* Audio Player */}
      <Card className="p-5">
        <audio ref={audioRef} preload="metadata" />
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="space-y-2 mb-2">
          <div className="relative">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSliderChange}
              disabled={isLoading || !!error}
              className="w-full"
            />
            {/* Buffer progress */}
            <div 
              className="absolute top-0 left-0 h-full bg-muted/30 rounded-full pointer-events-none"
              style={{ width: `${(bufferedTime / duration) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBackward}
              disabled={isLoading || !!error}
              className="h-9 w-9 relative group"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="absolute -bottom-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                15
              </span>
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={togglePlay}
              disabled={isLoading || !!error}
              className="h-10 w-10 mx-1"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={skipForward}
              disabled={isLoading || !!error}
              className="h-9 w-9 relative group"
            >
              <RotateCw className="h-4 w-4" />
              <span className="absolute -bottom-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                30
              </span>
            </Button>
          </div>
          
          {/* Time Display */}
          <div className="text-sm font-medium text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Playback Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  disabled={isLoading || !!error}
                >
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={cn(
                      "cursor-pointer",
                      rate === playbackRate && "bg-accent"
                    )}
                  >
                    {rate}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                disabled={isLoading || !!error}
                className="h-8 w-8"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                disabled={isLoading || !!error}
                className="w-20"
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Description */}
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
