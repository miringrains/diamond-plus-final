import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, FileText, HelpCircle, Mic, Play, Video, Bot, Users, ScrollText, Award, BookOpen, FileSearch, Target } from "lucide-react"
import { getWelcomeLessons, getRecentPodcasts } from "@/lib/loaders/dashboard"
import { PodcastPlayer } from "@/components/podcast-player"

export default async function DashboardPage() {
  const lessons = await getWelcomeLessons()
  const podcasts = await getRecentPodcasts()

  return (
    <div className="">
      {/* Hero Section - Full bleed */}
      <div className="relative h-[600px] lg:h-[700px] overflow-hidden">
        <Image
          src="/diamonddistheroupscale-standard-v2-2x.webp"
          alt="Diamond Plus"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      </div>

      <div className="px-6 lg:px-12 py-12 lg:py-16">
        {/* Module Rail */}
        <section className="relative">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--ink)] mb-2">
              Welcome Course Videos
            </h2>
            <p className="text-[var(--ink)] text-base opacity-70">Start your journey with our comprehensive modules</p>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-6 px-6 lg:-mx-12 lg:px-12">
            {lessons.length > 0 ? lessons.map((lesson, i) => (
              <Link href={`/lessons/${lesson.id}`} key={lesson.id}>
                <Card className="card min-w-[380px] cursor-pointer overflow-hidden pt-0 pb-6">
                  <div className="aspect-video bg-[var(--eerie-black)] relative overflow-hidden">
                    {lesson.thumbnailUrl ? (
                      <Image
                        src={lesson.thumbnailUrl}
                        alt={lesson.title}
                        fill
                        className="object-cover"
                        sizes="340px"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-white/10 p-5">
                        <Play className="h-10 w-10 text-[var(--ink-inverse)] fill-none" />
                      </div>
                    </div>
                    {(lesson.isStartHere || lesson.isNextUp) && (
                      <div className="absolute top-4 right-4 badge">
                        {lesson.isStartHere ? 'Start Here' : 'Next Up'}
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-[var(--ink-inverse)]">{lesson.title}</CardTitle>
                    <CardDescription className="text-sm text-[var(--ink-inverse)]/80">{lesson.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--ink-inverse)]/70">Progress</span>
                        <span className="font-medium text-[var(--ink-inverse)]">{lesson.progress}%</span>
                      </div>
                      <Progress value={lesson.progress} className="progress-track h-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )) : Array.from({ length: 8 }, (_, i) => (
              <Card key={i} className="card min-w-[380px] cursor-pointer overflow-hidden pt-0 pb-6">
                <div className="aspect-video bg-[var(--eerie-black)] relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/10 p-5">
                      <Play className="h-10 w-10 text-[var(--ink-inverse)] fill-none" />
                    </div>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-4 right-4 badge">
                      Start Here
                    </div>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-[var(--ink-inverse)]">Module {i + 1}</CardTitle>
                  <CardDescription className="text-sm text-[var(--ink-inverse)]/80">Introduction to Scaling</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--ink-inverse)]/70">Progress</span>
                      <span className="font-medium text-[var(--ink-inverse)]">0%</span>
                    </div>
                    <Progress value={0} className="progress-track h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>

      {/* Podcasts Section with Alice Blue Background */}
      <div className="bg-[var(--podcasts-bg)] py-12 lg:py-16">
        <div className="px-6 lg:px-12">
          {/* Podcasts Section */}
          <section className="relative">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left 50%: Podcast Image and Section Info */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="relative w-48 h-48 mx-auto lg:mx-0">
                      <Image
                        src="/diamondstandardpod.webp"
                        alt="The Diamond Standard Podcast"
                        fill
                        className="object-cover rounded-xl"
                        sizes="192px"
                      />
                    </div>
                    <div className="text-center lg:text-left lg:max-w-md">
                      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)] mb-3">
                        The Diamond Standard Podcast
                      </h2>
                      <p className="text-[var(--ink)] text-lg opacity-70">
                        Discover the specific strategies of members who are achieving extraordinary breakthroughs in scaling
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right 50%: Podcast Player and Episode Info */}
                <div className="w-full lg:w-1/2">
                    {podcasts.length > 0 ? (
                      <div className="space-y-4">
                        <PodcastPlayer
                          episodeNumber={podcasts[0].episodeNumber}
                          title={podcasts[0].title}
                          description={podcasts[0].description}
                          muxPlaybackId={podcasts[0].muxPlaybackId}
                          duration={podcasts[0].duration}
                        />
                        
                        {/* View More Button */}
                        <div className="pt-4">
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            asChild
                          >
                            <Link href="/podcasts">
                              <Play className="h-4 w-4 mr-2" />
                              More Diamond Standard Podcasts
                            </Link>
                          </Button>
                        </div>
                      </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Fallback content when no podcasts - using placeholder data */}
                      <PodcastPlayer
                        episodeNumber={1}
                        title="Episode 01: The Diamond Plus Journey Begins"
                        description="In this very first episode of the Diamond Plus Podcast, we set the stage for what this exclusive series is all about—real agents, real breakthroughs, and real stories from inside the Diamond Plus coaching program. Hear how agents are scaling to six-figure months using proven frameworks like the ABS formula and the Million Dollar Formula, regardless of their business model or lead generation strategy."
                        muxPlaybackId="placeholder-podcast-id"
                        duration={1019} // 16:59 in seconds
                      />
                      
                      {/* View More Button */}
                      <div className="pt-4">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                          asChild
                        >
                          <Link href="/podcasts">
                            <Play className="h-4 w-4 mr-2" />
                            More Diamond Standard Podcasts
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Resources Section */}
      <div className="px-6 lg:px-12 py-12 lg:py-16">
        {/* Resources Grid */}
        <section className="relative pb-12">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--ink)] mb-2">
              Resources
            </h2>
            <p className="text-[var(--ink)] text-base opacity-70">Everything you need to succeed in your journey</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Ask Ricky AI Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <Bot className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">AI</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Ask Ricky AI</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Get instant answers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">AI-powered coaching assistant available 24/7</p>
                <Button className="btn-primary w-full" asChild>
                  <Link href="/ask-ai">Ask Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Calendar Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <CalendarDays className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Schedule</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Calendar</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Upcoming events</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">View all scheduled calls and training sessions</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/calendar">View Calendar</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Group Calls Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <Users className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Live</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Group Calls</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Join live sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Weekly coaching calls with the community</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/group-calls">Join Call</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Scripts & Live Prospecting Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <ScrollText className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Tools</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Scripts & Live Prospecting</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Sales resources</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Proven scripts and live prospecting strategies</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/scripts">Access Scripts</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Challenges Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <Award className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Active</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Challenges</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Growth challenges</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Join monthly challenges to accelerate growth</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/challenges">View Challenges</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Workshops Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <BookOpen className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Learn</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Workshops</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Deep dive training</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Intensive workshops on specific topics</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/workshops">Browse Workshops</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Business Audit Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <FileSearch className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Review</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Monthly Business Audit</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Performance review</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Track and analyze your business metrics</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/business-audit">Start Audit</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Action Plan Card */}
            <Card className="card-secondary h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-xl bg-[var(--brand)]">
                    <Target className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
                  </div>
                  <span className="badge">Plan</span>
                </div>
                <CardTitle className="text-lg text-[var(--ink)]">Action Plan</CardTitle>
                <CardDescription className="text-sm text-[var(--ink)] opacity-60">Your roadmap</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4 text-[var(--ink)] opacity-50">Create and track your personalized action plan</p>
                <Button className="btn-secondary w-full" variant="outline" asChild>
                  <Link href="/action-plan">View Plan</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
