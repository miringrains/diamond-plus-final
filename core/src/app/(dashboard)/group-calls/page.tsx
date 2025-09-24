import { prisma } from '@/lib/db'
import GroupCallsClient from './group-calls-client'

export default async function GroupCallsPage() {
  // Fetch group calls from database
  const groupCalls = await prisma.group_calls.findMany({
    where: {
      published: true
    },
    orderBy: {
      call_date: 'desc'
    },
    take: 10 // Limit to recent calls
  })

  // Transform to match expected format
  const recentCalls = groupCalls.map((call) => ({
    id: call.id,
    title: call.title,
    description: call.description,
    date: new Date(call.call_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    muxPlaybackId: call.mux_playback_id,
    thumbnailUrl: call.thumbnail_url
  }))

  return <GroupCallsClient recentCalls={recentCalls} />
}
