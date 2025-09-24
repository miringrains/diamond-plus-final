import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/DashboardShell"

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
    <DashboardShell 
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatar_url: session.user.avatar_url,
      }}
    >
      {children}
    </DashboardShell>
  )
}

