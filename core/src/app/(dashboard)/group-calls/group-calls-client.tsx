'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Play, Calendar, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/layout'
import Link from 'next/link'
import Image from 'next/image'

interface GroupCall {
  id: string
  title: string
  description?: string | null
  date: string
  muxPlaybackId?: string | null
  thumbnailUrl?: string | null
}

interface GroupCallsClientProps {
  recentCalls: GroupCall[]
}

export default function GroupCallsClient({ recentCalls }: GroupCallsClientProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <PageHeader 
        title="Group Calls"
        description="Join live coaching sessions with the Diamond+ community"
        variant="simple"
      />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">

        {/* Recent Calls Carousel */}
        <section className="mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
            Recent Group Calls
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
            {recentCalls.map((call) => (
              <Link key={call.id} href={`/watch/group-calls/${call.id}`}>
                <Card className="bg-gray-900 border-gray-800 min-w-[350px] cursor-pointer transition-all hover:scale-[1.02] hover:bg-gray-800/50">
                  <div className="aspect-video bg-black relative overflow-hidden rounded-t-lg">
                    {call.thumbnailUrl ? (
                      <Image
                        src={call.thumbnailUrl}
                        alt={call.title}
                        fill
                        className="object-cover"
                        sizes="350px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="h-12 w-12 mx-auto mb-2 text-[var(--ink-inverse)]/50" />
                          <p className="text-sm text-[var(--ink-inverse)]/50">Click to Watch</p>
                        </div>
                      </div>
                    )}
                  </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">{call.title}</CardTitle>
                  <p className="text-sm text-gray-400">{call.date}</p>
                  {call.description && (
                    <CardDescription className="mt-1 line-clamp-2 text-gray-500">
                      {call.description}
                    </CardDescription>
                  )}
                </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full bg-[#176FFF] hover:bg-[#1563E0] text-white"
                      disabled={!call.muxPlaybackId}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Watch Recording
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming Call Schedule */}
        <section>
          <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[#176FFF]">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">
                  Upcoming Call Schedule
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-[#176FFF]" />
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Every Monday
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Noon - 2:00 PM EST
                </p>
                <p className="text-base text-gray-400 max-w-2xl mx-auto mb-8">
                  Group coaching calls are held every Monday. Join us for live Q&A, strategy sessions, 
                  and community support to accelerate your real estate success.
                </p>
              </div>

              <div className="space-y-4">
                <Button className="w-full py-6 text-lg bg-[#176FFF] hover:bg-[#1563E0] text-white" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Users className="h-5 w-5 mr-2" />
                    Join Coaching Calls
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>

                <Button className="w-full py-6 text-lg border-gray-700 text-gray-300 hover:bg-gray-800" variant="outline" asChild>
                  <a 
                    href="https://calendar.google.com/calendar/u/0?cid=iaiaaqno584lqhm4ekrahdb5r1g@group.calendar.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Add to Google Calendar
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Can't make it live? All calls are recorded and available in your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
