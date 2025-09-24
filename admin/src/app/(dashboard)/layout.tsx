import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session || !session.user) {
    redirect("/login")
  }

  return (
    <AppShell 
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      logoHref="/dashboard"
    >
      {children}
    </AppShell>
  )
}

