"use client"

import { ReactNode, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Search,
  HelpCircle, 
  User,
  LogOut,
  Settings,
  UserCircle
} from "lucide-react"
import { useSupabaseAuth } from "@/components/providers"

interface DashboardShellProps {
  children: ReactNode
  user?: {
    name?: string | null
    email?: string | null
    role?: string | null
    avatar_url?: string | null
  }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async (e: React.MouseEvent) => {
    // Prevent default to avoid any dropdown interference
    e.preventDefault()
    e.stopPropagation()
    
    // Close dropdown immediately
    setDropdownOpen(false)
    
    // Use the proper server-side signout route
    try {
      const response = await fetch('/auth/signout', {
        method: 'POST',
      })
      
      if (response.redirected) {
        window.location.href = response.url
      }
    } catch (error) {
      console.error("Sign out error:", error)
      // Fallback to direct navigation if fetch fails
      window.location.href = "/login"
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--nav-bg)] border-b border-[var(--nav-bg)]">
        <div className="px-6 lg:px-12">
          <div className="flex h-20 items-center justify-between gap-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/diamondpluglogowhite.svg"
                alt="Diamond Plus"
                width={160}
                height={36}
              />
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--ink)] fill-none" />
                <Input
                  type="search"
                  placeholder="Search modules, replays, podcasts..."
                  className="input-field w-full pl-12 pr-4 h-12"
                />
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-3">
              <Link href="/help">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full text-[var(--ink-inverse)] hover:bg-[rgba(255,255,255,0.1)] transition-colors duration-150"
                >
                  <HelpCircle className="h-5 w-5 fill-none" />
                  <span className="sr-only">Help</span>
                </Button>
              </Link>
              
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-10 w-10 rounded-full text-[var(--ink-inverse)] hover:bg-[rgba(255,255,255,0.1)] transition-colors duration-150"
                  >
                    <Avatar className="h-9 w-9 border-2 border-[rgba(255,255,255,0.2)]">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-[var(--brand)]">
                        {user?.name ? (
                          <span className="text-sm font-medium text-[var(--ink-inverse)]">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-4 w-4 text-[var(--ink-inverse)] fill-none" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Profile</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/me/profile" className="flex items-center">
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>My Account</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-[var(--page-bg)]">
        {children}
      </main>
    </div>
  )
}
