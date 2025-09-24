import { Home, Video, Shield, LogOut, User, Users, Settings, LayoutDashboard, Headphones, Heart, UserCircle, HelpCircle } from "lucide-react"

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
    title: "Training",
    href: "/courses/diamond-plus-training",
    icon: Video,
  },
  {
    title: "Podcasts",
    href: "/podcasts",
    icon: Headphones,
  },
  {
    title: "Coaching",
    href: "/coaching",
    icon: Heart,
  },
  {
    title: "Community",
    href: "/community",
    icon: Users,
  },
  {
    title: "Profile",
    href: "/me/profile",
    icon: UserCircle,
  },
  {
    title: "Help",
    href: "/help",
    icon: HelpCircle,
  },
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    title: "Manage Courses",
    href: "/admin/courses",
    icon: Video,
    adminOnly: true,
  },
  {
    title: "Manage Podcasts",
    href: "/admin/podcasts",
    icon: Headphones,
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
