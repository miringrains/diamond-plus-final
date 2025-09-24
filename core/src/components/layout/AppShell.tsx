"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarNav } from "@/components/nav/SidebarNav"

interface AppShellProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  logoHref?: string
}

/**
 * Unified application shell with fixed sidebar and content area.
 * Handles responsive behavior and consistent layout across dashboard and admin.
 */
export function AppShell({ children, user, logoHref = "/dashboard" }: AppShellProps) {
  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.[0].toUpperCase() || 'U'

  const isAdmin = user.role === "ADMIN"

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        collapsible="icon"
        variant="inset"
        className="app-chrome"
      >
        <SidebarHeader className="h-24 items-center justify-center relative">
          <Link href={logoHref} className="flex items-center justify-center">
            <div className="text-2xl font-bold text-primary">
              DP
            </div>
          </Link>
          <SidebarTrigger className="absolute right-2 top-2 md:hidden text-sidebar-foreground hover:bg-sidebar-accent size-8" />
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav isAdmin={isAdmin} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="space-y-0">
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-6 w-6 rounded shrink-0">
                <AvatarFallback className="rounded text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground flex-1 min-w-0">
                {user.email}
              </span>
            </div>
            <div className="px-2 pb-2 pt-1">
              <Button variant="destructive" className="w-full justify-start gap-1.5 h-7 text-xs px-2" asChild>
                <a href="/logout">
                  <LogOut className="h-3 w-3" />
                  <span>Sign out</span>
                </a>
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 border-b bg-sidebar border-sidebar-border md:hidden">
          <div className="flex h-14 items-center gap-2 px-4">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent" />
            <Link href={logoHref} className="flex items-center gap-2">
              <div className="text-lg font-bold text-primary">
                DP
              </div>
              <span className="text-sm font-medium text-sidebar-foreground">Diamond Plus</span>
            </Link>
          </div>
        </header>

        {/* Main content area - let child components handle their own width constraints */}
        <div className="px-4 py-6 md:pl-[calc(var(--sidebar-width)+1.5rem)] md:pr-6 lg:pl-[calc(var(--sidebar-width)+2rem)] lg:pr-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
