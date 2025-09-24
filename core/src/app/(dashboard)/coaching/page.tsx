import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Video, MessageSquarePlus, Play } from "lucide-react"
import Link from "next/link"
import { PageHeader, PageHeaderPresets } from "@/components/layout"

export default function CoachingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader {...PageHeaderPresets.coaching} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Calls */}
        <Card className="card-secondary">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-[var(--brand)]">
                <CalendarDays className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
              </div>
              <span className="badge">Live</span>
            </div>
            <CardTitle className="text-lg">Next Live Call</CardTitle>
            <CardDescription className="text-sm">Thursday, 2:00 PM EST</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 opacity-70">Monthly Q&A Session with expert coaches</p>
            <Button className="btn-primary w-full">Join Live Call</Button>
          </CardContent>
        </Card>

        {/* Recent Replays */}
        <Card className="card-secondary lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 rounded-xl bg-[var(--brand)]">
                <Video className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
              </div>
              <span className="badge">Replays</span>
            </div>
            <CardTitle className="text-lg">Call Replays</CardTitle>
            <CardDescription className="text-sm">Watch previous coaching sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: "October Coaching Call - Advanced Strategies", date: "3 days ago" },
                { title: "September Coaching Call - Lead Generation", date: "1 week ago" },
                { title: "August Coaching Call - Sales Mastery", date: "2 weeks ago" }
              ].map((replay, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[var(--alice-blue)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-[var(--brand)] fill-none" />
                    <div>
                      <p className="text-sm font-medium">{replay.title}</p>
                      <p className="text-xs text-muted-foreground">{replay.date}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="btn-secondary">Watch</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Question */}
        <Card className="card lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-4 rounded-xl bg-white/20">
                <MessageSquarePlus className="h-8 w-8 text-[var(--ink-inverse)] fill-none" />
              </div>
              <span className="badge">Get Help</span>
            </div>
            <CardTitle className="text-xl text-[var(--ink-inverse)]">Submit a Question</CardTitle>
            <CardDescription className="text-base text-[var(--ink-inverse)]/80">
              Have your questions answered in the next live coaching call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium mb-2 text-[var(--ink-inverse)]">
                  Your Question
                </label>
                <textarea
                  id="question"
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-[var(--ink-inverse)] placeholder:text-[var(--ink-inverse)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  placeholder="What would you like to know about scaling your real estate business?"
                />
              </div>
              <Button className="btn-primary w-full h-12 text-base">Submit Question</Button>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
