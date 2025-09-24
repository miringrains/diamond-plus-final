"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Mail, Phone, Calendar, User, Shield, CheckCircle } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: string
  emailVerified: Date | null
  ghlContactId: string | null
  createdAt: Date
  _count?: {
    progress: number
  }
}

interface UserSearchProps {
  users: User[]
}

export function UserSearch({ users }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState(users)

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (query.trim() === "") {
      setFilteredUsers(users)
      return
    }

    const lowercaseQuery = query.toLowerCase()
    const filtered = users.filter(user => {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase()
      return userName.includes(lowercaseQuery) ||
             user.email.toLowerCase().includes(lowercaseQuery) ||
             (user.phone && user.phone.includes(query))
    })
    
    setFilteredUsers(filtered)
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No users found matching your search.
          </p>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : "Unnamed User"}
                    </h3>
                    <Badge variant={user.role === "ADMIN" ? "destructive" : "default"}>
                      {user.role}
                    </Badge>
                    {user.emailVerified && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {user.ghlContactId && (
                      <Badge variant="outline" className="text-blue-600">
                        GHL
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    {user._count && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{user._count.progress} lessons watched</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link href={`/admin/users/${user.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}