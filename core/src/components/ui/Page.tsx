import { AppShell } from "@/components/layout/AppShell"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/auth"

interface PageProps {
  children: React.ReactNode
  className?: string
}

interface PageHeaderProps {
  children: React.ReactNode
  className?: string
}

interface PageBodyProps {
  children: React.ReactNode
  className?: string
}

/**
 * Page primitive that ensures AppShell usage
 * Use this for all pages with sidebar navigation
 */
export async function Page({ children, className }: PageProps) {
  const session = await auth()
  
  if (!session?.user) {
    return <div className={className}>{children}</div>
  }

  return (
    <AppShell user={session.user}>
      <div className={className}>
        {children}
      </div>
    </AppShell>
  )
}

/**
 * Page header section with consistent spacing
 */
export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      {children}
    </div>
  )
}

/**
 * Page body section with consistent spacing
 */
export function PageBody({ children, className }: PageBodyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {children}
    </div>
  )
}
