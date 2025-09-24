import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, BookOpen, MessageCircle, Lightbulb, ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/layout"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Help & Support"
        description="Get started quickly with our guides and resources"
        variant="simple"
      />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">

      {/* Tour Video */}
      <Card className="card mb-8">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-white/20">
              <Video className="h-6 w-6 text-[var(--ink-inverse)] fill-none" />
            </div>
            <CardTitle className="text-xl text-[var(--ink-inverse)]">Platform Tour</CardTitle>
          </div>
          <CardDescription className="text-[var(--ink-inverse)]/80">
            Watch a quick 5-minute tour of the Diamond Plus platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="rounded-full bg-white/20 p-5 mx-auto mb-4">
                <Video className="h-10 w-10 text-[var(--ink-inverse)] fill-none" />
              </div>
              <p className="text-[var(--ink-inverse)]/70">Video player will load here</p>
            </div>
          </div>
          <Button className="btn-primary w-full">Watch Tour Video</Button>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="card-secondary">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--brand)]">
                <Lightbulb className="h-5 w-5 text-white fill-none" />
              </div>
              <CardTitle className="text-lg">Getting Started</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Start with Module 1 if you're new to the platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Complete lessons in order for the best learning experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Join live coaching calls every Thursday at 2 PM EST</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="card-secondary">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--brand)]">
                <BookOpen className="h-5 w-5 text-white fill-none" />
              </div>
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Take notes during lessons to retain information better</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Apply what you learn immediately in your business</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Engage with the community for support and accountability</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="card-secondary">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--brand)]">
                <MessageCircle className="h-5 w-5 text-white fill-none" />
              </div>
              <CardTitle className="text-lg">Get Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Submit questions for live coaching calls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Connect with mentors in the community directory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand)] mt-0.5">•</span>
                <span>Email support@diamondplus.com for technical help</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Additional Resources */}
      <Card className="card-secondary">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>External links and downloads to help you succeed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="btn-secondary justify-between">
              <span>Download Mobile App</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="btn-secondary justify-between">
              <span>Join Facebook Group</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="btn-secondary justify-between">
              <span>Read Knowledge Base</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="btn-secondary justify-between">
              <span>Contact Support</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
