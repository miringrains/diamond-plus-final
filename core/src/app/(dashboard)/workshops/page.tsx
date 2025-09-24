'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Calendar, MapPin, Users, Play } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { PageHeader, PageHeaderPresets } from '@/components/layout'

// TODO: Replace with actual workshop data and Mux playback IDs
const pastWorkshops = [
  {
    id: '1',
    title: '2025 Business Planning Workshop',
    date: 'December 2024',
    location: 'Orlando, FL',
    videos: [
      { id: '1-1', title: 'Session 1: Goal Setting', playbackId: 'placeholder' },
      { id: '1-2', title: 'Session 2: Strategic Planning', playbackId: 'placeholder' },
      { id: '1-3', title: 'Session 3: Implementation', playbackId: 'placeholder' },
    ]
  },
  {
    id: '2',
    title: 'Advanced Listing Strategies',
    date: 'September 2024',
    location: 'Nashville, TN',
    videos: [
      { id: '2-1', title: 'Morning Session', playbackId: 'placeholder' },
      { id: '2-2', title: 'Afternoon Session', playbackId: 'placeholder' },
    ]
  }
]

export default function WorkshopsPage() {
  const [showRSVPForm, setShowRSVPForm] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader {...PageHeaderPresets.workshops} />
      
      <div className="px-6 lg:px-8 py-8 lg:py-12">

        {/* Next Workshop */}
        <Card className="card max-w-4xl mx-auto mb-12">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[var(--brand)]">
                <BookOpen className="h-6 w-6 text-[var(--ink-inverse)]" />
              </div>
              <CardTitle className="text-xl text-[var(--ink-inverse)]">
                Next Workshop with Ricky
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[var(--ink-inverse)] mb-4">
                2026 Business Planning Session
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/10 rounded-lg p-6">
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-[var(--brand)]" />
                  <h3 className="font-semibold text-[var(--ink-inverse)] mb-1">Date</h3>
                  <p className="text-[var(--ink-inverse)]/80">December 5th, 2026</p>
                </div>
                <div className="bg-white/10 rounded-lg p-6">
                  <MapPin className="h-8 w-8 mx-auto mb-3 text-[var(--brand)]" />
                  <h3 className="font-semibold text-[var(--ink-inverse)] mb-1">Location</h3>
                  <p className="text-[var(--ink-inverse)]/80">Orange Beach, AL</p>
                </div>
              </div>

              <div className="bg-[var(--brand)]/20 rounded-lg p-6 mb-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-[var(--brand)]" />
                <p className="text-lg font-semibold text-[var(--ink-inverse)] mb-2">
                  RSVP Required by October 31st
                </p>
                <p className="text-[var(--ink-inverse)]/70">
                  You must RSVP with your plus one
                </p>
              </div>

              {!showRSVPForm ? (
                <Button 
                  className="btn-primary w-full py-6 text-lg"
                  onClick={() => setShowRSVPForm(true)}
                >
                  RSVP HERE
                </Button>
              ) : (
                <div className="bg-white/10 rounded-lg p-6">
                  <p className="text-[var(--ink-inverse)] mb-4">
                    RSVP form would be implemented here
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRSVPForm(false)}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Past Workshops */}
        <section>
          <h2 className="text-xl md:text-2xl font-semibold text-[var(--ink)] mb-6">
            Past Workshop Recordings
          </h2>
          <div className="space-y-8">
            {pastWorkshops.map((workshop) => (
              <Card key={workshop.id} className="card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-[var(--ink-inverse)]">
                        {workshop.title}
                      </CardTitle>
                      <p className="text-sm text-[var(--ink-inverse)]/70 mt-1">
                        {workshop.date} • {workshop.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--ink-inverse)]/60">
                        {workshop.videos.length} Sessions
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {workshop.videos.map((video) => (
                      <Card key={video.id} className="card-secondary min-w-[300px]">
                        <div className="aspect-video bg-black/20 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-10 w-10 text-[var(--ink-inverse)]/50" />
                          </div>
                        </div>
                        <CardHeader className="pb-2">
                          <p className="text-sm font-medium text-[var(--ink)]">{video.title}</p>
                        </CardHeader>
                        <CardContent>
                          <Link href={`/watch/workshops/${workshop.id}`}>
                            <Button className="btn-primary w-full" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Watch Recording
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
