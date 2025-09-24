'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, Play, Calendar, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { PageHeader, PageHeaderPresets } from '@/components/layout'

// TODO: Replace with actual challenge data and Mux playback IDs
const challenges = [
  {
    id: '1',
    title: 'Set More Listing Appointments Challenge - Fall 2024',
    date: 'October 2024',
    videos: [
      { id: '1-1', title: 'Day 1: Foundation', playbackId: 'placeholder' },
      { id: '1-2', title: 'Day 2: Prospecting Scripts', playbackId: 'placeholder' },
      { id: '1-3', title: 'Day 3: Follow-Up Mastery', playbackId: 'placeholder' },
      { id: '1-4', title: 'Day 4: Objection Handling', playbackId: 'placeholder' },
      { id: '1-5', title: 'Day 5: Closing Techniques', playbackId: 'placeholder' },
    ]
  },
  {
    id: '2',
    title: 'Set More Listing Appointments Challenge - Summer 2024',
    date: 'July 2024',
    videos: [
      { id: '2-1', title: 'Day 1: Mindset & Goals', playbackId: 'placeholder' },
      { id: '2-2', title: 'Day 2: Lead Generation', playbackId: 'placeholder' },
      { id: '2-3', title: 'Day 3: Conversion Strategies', playbackId: 'placeholder' },
      { id: '2-4', title: 'Day 4: Building Rapport', playbackId: 'placeholder' },
      { id: '2-5', title: 'Day 5: Action Planning', playbackId: 'placeholder' },
    ]
  }
]

export default function ChallengesPage() {
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null)

  const toggleChallenge = (challengeId: string) => {
    setExpandedChallenge(expandedChallenge === challengeId ? null : challengeId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader {...PageHeaderPresets.challenges} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">

        {/* VIP Access Notice */}
        <Card className="card max-w-4xl mx-auto mb-12">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[var(--brand)]">
                <Award className="h-6 w-6 text-[var(--ink-inverse)]" />
              </div>
              <CardTitle className="text-xl text-[var(--ink-inverse)]">
                VIP Experience Access
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[var(--ink-inverse)]/80">
              As a Diamond+ member, you are granted access to the live VIP Experience of the 
              Set More Listing Appointments Challenge.
            </p>
            <div className="bg-[var(--brand)]/20 rounded-lg p-6 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-[var(--brand)]" />
              <h3 className="text-lg font-semibold text-[var(--ink-inverse)] mb-2">
                Next Challenge: Q1 2026
              </h3>
              <p className="text-[var(--ink-inverse)]/70">
                Stay tuned for date announcements
              </p>
            </div>
            <p className="text-[var(--ink-inverse)]/70 text-center">
              In the meantime, enjoy the replays of all past challenges below.
            </p>
          </CardContent>
        </Card>

        {/* Past Challenges */}
        <section>
          <h2 className="text-xl md:text-2xl font-semibold text-[var(--ink)] mb-6">
            Past Challenge Replays
          </h2>
          <div className="space-y-6">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="card">
                <CardHeader>
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleChallenge(challenge.id)}
                  >
                    <div>
                      <CardTitle className="text-lg text-[var(--ink-inverse)]">
                        {challenge.title}
                      </CardTitle>
                      <p className="text-sm text-[var(--ink-inverse)]/70 mt-1">
                        {challenge.date} • {challenge.videos.length} Videos
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ChevronRight 
                        className={`h-5 w-5 text-[var(--ink-inverse)] transition-transform ${
                          expandedChallenge === challenge.id ? 'rotate-90' : ''
                        }`} 
                      />
                    </Button>
                  </div>
                </CardHeader>
                {expandedChallenge === challenge.id && (
                  <CardContent>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {challenge.videos.map((video) => (
                        <Card key={video.id} className="card-secondary min-w-[280px]">
                          <div className="aspect-video bg-black/20 relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="h-10 w-10 text-[var(--ink-inverse)]/50" />
                            </div>
                          </div>
                          <CardHeader className="pb-2">
                            <p className="text-sm font-medium text-[var(--ink)]">{video.title}</p>
                          </CardHeader>
                          <CardContent>
                            <Button className="btn-primary w-full" size="sm">
                              <Play className="h-3 w-3 mr-1" />
                              Watch
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
