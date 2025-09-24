import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays, Clock, Users, Video, Calendar, ChevronRight } from 'lucide-react'
import { PageHeader, PageHeaderPresets } from '@/components/layout'
import { Button } from '@/components/ui/button'

export default function CalendarPage() {
  // Example upcoming events data (would come from API)
  const upcomingEvents = [
    { id: 1, title: "Weekly Team Mastermind", date: "Tomorrow", time: "2:00 PM ET", type: "group", attendees: 12 },
    { id: 2, title: "1-on-1 Coaching with Ricky", date: "Sep 24", time: "10:00 AM ET", type: "coaching", attendees: 1 },
    { id: 3, title: "Monthly Sales Workshop", date: "Sep 26", time: "3:00 PM ET", type: "workshop", attendees: 45 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader {...PageHeaderPresets.calendar} />
      
      {/* Main Calendar Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
          <Card className="card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[var(--brand)]">
                  <CalendarDays className="h-6 w-6 text-[var(--ink-inverse)]" />
                </div>
                <CardTitle className="text-xl text-[var(--ink-inverse)]">
                  Diamond+ Events Calendar
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-[16/9] lg:aspect-[16/10]">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=iaiaaqno584lqhm4ekrahdb5r1g%40group.calendar.google.com&ctz=America%2FNew_York"
                  style={{ border: 0 }}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  className="rounded-lg"
                ></iframe>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--ink-inverse)]/70">
                  All times are shown in Eastern Time (ET)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Upcoming Events</h2>
            <p className="mt-2 text-gray-600">Don't miss these upcoming sessions</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 rounded-lg bg-blue-50">
                      {event.type === 'group' && <Users className="h-5 w-5 text-blue-600" />}
                      {event.type === 'coaching' && <Video className="h-5 w-5 text-blue-600" />}
                      {event.type === 'workshop' && <Calendar className="h-5 w-5 text-blue-600" />}
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {event.date}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{event.attendees} attending</span>
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline" size="sm">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <Button variant="default">
              View All Events
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
