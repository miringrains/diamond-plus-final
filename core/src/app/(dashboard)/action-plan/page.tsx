import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/layout'

export default function ActionPlanPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Action Plan"
        description="Create and track your personalized roadmap to success"
        variant="feature"
      />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">

        <Card className="card max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[var(--brand)]">
                <Target className="h-6 w-6 text-[var(--ink-inverse)]" />
              </div>
              <CardTitle className="text-xl text-[var(--ink-inverse)]">
                Your Personal Success Roadmap
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16">
              <Rocket className="h-16 w-16 mx-auto mb-6 text-[var(--brand)]/50" />
              <h2 className="text-2xl font-semibold text-[var(--ink-inverse)] mb-4">
                Action Planning Feature Coming Soon
              </h2>
              <p className="text-[var(--ink-inverse)]/70 max-w-2xl mx-auto mb-8">
                We're building an interactive action planning tool that will help you create, 
                track, and achieve your real estate goals with personalized strategies and 
                milestone tracking.
              </p>
              
              <div className="bg-white/10 rounded-lg p-8 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-[var(--ink-inverse)] mb-4">
                  What to expect:
                </h3>
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div>
                    <h4 className="font-medium text-[var(--ink-inverse)] mb-2">Goal Setting</h4>
                    <p className="text-sm text-[var(--ink-inverse)]/70">
                      Define clear, measurable objectives for your business growth
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--ink-inverse)] mb-2">Action Steps</h4>
                    <p className="text-sm text-[var(--ink-inverse)]/70">
                      Break down goals into actionable daily and weekly tasks
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--ink-inverse)] mb-2">Progress Tracking</h4>
                    <p className="text-sm text-[var(--ink-inverse)]/70">
                      Monitor your advancement with visual progress indicators
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--ink-inverse)] mb-2">Accountability</h4>
                    <p className="text-sm text-[var(--ink-inverse)]/70">
                      Stay on track with reminders and milestone celebrations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
