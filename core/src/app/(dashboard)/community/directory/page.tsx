import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin, Briefcase } from "lucide-react"

export default function CommunityDirectoryPage() {
  // Mock data for demonstration
  const members = [
    {
      id: "1",
      name: "Sarah Johnson",
      location: "Dallas, TX",
      speciality: "Luxury Homes",
      experience: "10+ years",
      avatar: null,
      status: "Diamond Elite"
    },
    {
      id: "2",
      name: "Michael Chen",
      location: "San Francisco, CA",
      speciality: "Commercial Real Estate",
      experience: "8 years",
      avatar: null,
      status: "Diamond Plus"
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      location: "Miami, FL",
      speciality: "First-Time Buyers",
      experience: "5 years",
      avatar: null,
      status: "Diamond Plus"
    },
    {
      id: "4",
      name: "David Thompson",
      location: "Austin, TX",
      speciality: "Investment Properties",
      experience: "12 years",
      avatar: null,
      status: "Diamond Elite"
    },
    {
      id: "5",
      name: "Jessica Park",
      location: "Seattle, WA",
      speciality: "Condos & Townhomes",
      experience: "6 years",
      avatar: null,
      status: "Diamond Plus"
    },
    {
      id: "6",
      name: "Robert Williams",
      location: "Chicago, IL",
      speciality: "Relocations",
      experience: "15+ years",
      avatar: null,
      status: "Diamond Elite"
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Community Directory</h1>
        <p className="text-muted-foreground">Connect with fellow Diamond Plus members</p>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{members.length} Active Members</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id} className="card-secondary hover:border-[var(--brand)] transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback className="bg-[var(--brand)] text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{member.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{member.speciality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{member.experience}</span>
                <Badge variant={member.status === "Diamond Elite" ? "default" : "secondary"} className="text-xs">
                  {member.status}
                </Badge>
              </div>
              <Button className="w-full btn-secondary" variant="outline">
                View Profile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
