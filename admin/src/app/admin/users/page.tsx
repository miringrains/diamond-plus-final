import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserSearch } from "@/components/admin/user-search"
import { CheckCircle, XCircle, Mail, Phone, Calendar, ChevronRight, MoreVertical } from "lucide-react"
import Link from "next/link"

export default async function AdminUsersPage() {
  const session = await auth()
  
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  const users = await prisma.users.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      emailVerified: true,
      ghlContactId: true,
      createdAt: true,
      _count: {
        select: {
          progress: true
        }
      }
    }
  })

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    users: users.filter(u => u.role === "USER").length,
    verified: users.filter(u => u.emailVerified).length,
    withGHL: users.filter(u => u.ghlContactId).length,
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link href="/admin" className="hover:underline" style={{ color: '#2483ff' }}>Admin</Link>
        <ChevronRight className="h-4 w-4" style={{ color: 'rgba(71, 80, 98, 0.7)' }} />
        <span style={{ color: '#0e121b' }}>Users</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: '#0e121b' }}>User Management</h1>
        <p className="mt-2" style={{ color: '#475062' }}>
          View and manage platform users
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-5 mb-8">
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Total Users</CardTitle>
          </CardHeader>
          <CardContent style={{ backgroundColor: '#1a1e25' }}>
            <p className="text-2xl font-bold" style={{ color: '#fcfcfd' }}>{stats.total}</p>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Admins</CardTitle>
          </CardHeader>
          <CardContent style={{ backgroundColor: '#1a1e25' }}>
            <p className="text-2xl font-bold" style={{ color: '#fcfcfd' }}>{stats.admins}</p>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Students</CardTitle>
          </CardHeader>
          <CardContent style={{ backgroundColor: '#1a1e25' }}>
            <p className="text-2xl font-bold" style={{ color: '#fcfcfd' }}>{stats.users}</p>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Verified</CardTitle>
          </CardHeader>
          <CardContent style={{ backgroundColor: '#1a1e25' }}>
            <p className="text-2xl font-bold" style={{ color: '#fcfcfd' }}>{stats.verified}</p>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader className="pb-2" style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>GHL Synced</CardTitle>
          </CardHeader>
          <CardContent style={{ backgroundColor: '#1a1e25' }}>
            <p className="text-2xl font-bold" style={{ color: '#fcfcfd' }}>{stats.withGHL}</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table - Desktop */}
      <Card className="hidden sm:block" style={{ backgroundColor: '#1a1e25' }}>
        <CardHeader style={{ backgroundColor: '#1a1e25' }}>
          <CardTitle style={{ color: '#fcfcfd' }}>All Users</CardTitle>
          <CardDescription style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Search and view user details</CardDescription>
        </CardHeader>
        <CardContent style={{ backgroundColor: '#1a1e25' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(252, 252, 253, 0.1)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Name</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Email</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Role</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Status</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Joined</th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: '#fcfcfd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-white/5 transition-colors duration-200" style={{ borderColor: 'rgba(252, 252, 253, 0.1)' }}>
                    <td className="py-3 px-4" style={{ color: '#fcfcfd' }}>
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Unnamed User"}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={user.role === "ADMIN" ? "bg-red-600 text-white" : ""}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {user.emailVerified && (
                        <Badge className="bg-green-500 text-white">Verified</Badge>
                      )}
                      {user.ghlContactId && (
                        <Badge className="ml-2" style={{ backgroundColor: '#2483ff', color: 'white' }}>GHL</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button size="icon" variant="ghost" className="hover:bg-white/10" style={{ color: '#fcfcfd' }}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Stacked View */}
      <div className="sm:hidden space-y-4">
        <Card style={{ backgroundColor: '#1a1e25' }}>
          <CardHeader style={{ backgroundColor: '#1a1e25' }}>
            <CardTitle style={{ color: '#fcfcfd' }}>All Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" style={{ backgroundColor: '#1a1e25' }}>
            {users.map((user) => (
              <div key={user.id} className="p-4 rounded border space-y-2" style={{ borderColor: 'rgba(252, 252, 253, 0.2)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Name</span>
                  <span className="font-medium" style={{ color: '#fcfcfd' }}>
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Unnamed User"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Email</span>
                  <span style={{ color: '#fcfcfd' }}>{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Role</span>
                  <Badge variant="secondary" className={user.role === "ADMIN" ? "bg-red-600 text-white" : ""}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Status</span>
                  <div>
                    {user.emailVerified && (
                      <Badge className="bg-green-500 text-white">Verified</Badge>
                    )}
                    {user.ghlContactId && (
                      <Badge className="ml-2" style={{ backgroundColor: '#2483ff', color: 'white' }}>GHL</Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: 'rgba(252, 252, 253, 0.7)' }}>Joined</span>
                  <span style={{ color: '#fcfcfd' }}>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="pt-2">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-white/20 text-white hover:bg-white/10 transition-all duration-200"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
