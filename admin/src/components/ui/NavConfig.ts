import { Home, Video, Shield, LogOut, User, Users, Settings, LayoutDashboard, Sparkles, BookOpen, Headphones, Phone, FileText } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

/**
 * Single source of truth for navigation configuration
 * Used by both user and admin shells with role-based filtering
 */
export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Courses",
    href: "/courses",
    icon: Video,
  },
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    title: "Welcome Course",
    href: "/admin/welcome-course",
    icon: BookOpen,
    adminOnly: true,
  },
  {
    title: "Podcasts",
    href: "/admin/podcasts",
    icon: Headphones,
    adminOnly: true,
  },
  {
    title: "Group Calls",
    href: "/admin/group-calls",
    icon: Phone,
    adminOnly: true,
  },
  {
    title: "Scripts",
    href: "/admin/scripts",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    adminOnly: true,
  },
]

/**
 * Filter navigation items based on user role
 */
export function getVisibleNavItems(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)
}

/**
 * Check if a path is active
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard" || href === "/admin") {
    return pathname === href
  }
  return pathname.startsWith(href)
}
