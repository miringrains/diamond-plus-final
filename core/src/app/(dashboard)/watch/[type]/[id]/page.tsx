import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StyledMuxPlayer from './styled-mux-player'
import { prisma } from '@/lib/db'

async function getVideoContent(type: string, id: string) {
  // Handle group calls from database
  if (type === 'group-calls') {
    const groupCalls = await prisma.group_calls.findMany({
      where: {
        published: true,
        mux_playback_id: {
          not: null
        }
      },
      orderBy: {
        call_date: 'desc'
      }
    });
    
    const currentIndex = groupCalls.findIndex(call => call.id === id);
    if (currentIndex === -1) {
      return null;
    }
    
    const currentCall = groupCalls[currentIndex];
    
    return {
      title: 'Group Coaching Calls',
      description: currentCall.description || 'Live coaching sessions with the Diamond Plus community',
      currentVideoIndex: currentIndex,
      videos: groupCalls.map((call, index) => ({
        id: call.id,
        title: call.title,
        duration: call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : '0:00',
        playbackId: call.mux_playback_id || '',
        thumbnailUrl: call.thumbnail_url || '',
        isCurrentlyPlaying: index === currentIndex,
        isCompleted: false
      }))
    };
  }
  
  // Mock data for other types
  const mockData: Record<string, Record<string, any>> = {
    workshops: {
      '1': {
        title: '2025 Business Planning Workshop',
        description: 'Learn how to set and achieve your business goals for 2025',
        videos: [
          {
            id: '0',
            title: 'Welcome & Introducing the Monthly Scaling Cycles',
            duration: '11:43',
            playbackId: 'placeholder-0',
            thumbnailUrl: '',
            isCurrentlyPlaying: true,
          },
          {
            id: '1',
            title: 'Choose Your Impossible Goal',
            duration: '10:13',
            playbackId: 'placeholder-1',
            thumbnailUrl: '',
            isCurrentlyPlaying: false,
          },
          {
            id: '2',
            title: 'Define Your Focus',
            duration: '09:25',
            playbackId: 'placeholder-2',
            thumbnailUrl: '',
            isCurrentlyPlaying: false,
          },
          {
            id: '3',
            title: 'Solve Your Goal',
            duration: '12:49',
            playbackId: 'placeholder-3',
            thumbnailUrl: '',
            isCurrentlyPlaying: false,
          },
          {
            id: '4',
            title: 'Simplify',
            duration: '08:20',
            playbackId: 'placeholder-4',
            thumbnailUrl: '',
            isCurrentlyPlaying: false,
          },
          {
            id: '5',
            title: 'Raise Your Baseline',
            duration: '08:41',
            playbackId: 'placeholder-5',
            thumbnailUrl: '',
            isCurrentlyPlaying: false,
          },
        ],
        currentVideoIndex: 0,
      }
    },
    modules: {},
    podcasts: {}
  }

  if (!mockData[type] || !mockData[type][id]) {
    return null
  }
  
  return mockData[type][id]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}): Promise<Metadata> {
  const { type, id } = await params
  const content = await getVideoContent(type, id)
  
  if (!content) {
    return {
      title: 'Video Not Found',
    }
  }

  return {
    title: `${content.title} | Diamond Plus`,
    description: content.description,
  }
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}) {
  const { type, id } = await params
  const content = await getVideoContent(type, id)
  
  if (!content) {
    notFound()
  }

  return <StyledMuxPlayer content={content} type={type} id={id} />
}
