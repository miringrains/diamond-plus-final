"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getVisibleNavItems, isNavItemActive } from "@/components/ui/NavConfig"

interface SidebarNavProps {
  isAdmin?: boolean
  className?: string
}

/**
 * Reusable sidebar navigation component with active state management.
 * Filters menu items based on user role.
 */
export function SidebarNav({ isAdmin = false, className }: SidebarNavProps) {
  const pathname = usePathname()

  // Filter items based on admin status
  const visibleItems = getVisibleNavItems(isAdmin)

  return (
    <SidebarMenu className={className}>
      {visibleItems.map((item, index) => (
        <SidebarMenuItem key={item.href} className={cn(item.adminOnly && index === 2 && "mt-4")}>
          <SidebarMenuButton 
            asChild 
            className={cn(
              "py-2.5 gap-2",
              isNavItemActive(item.href, pathname) && "bg-primary/10 text-primary rounded-md"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
