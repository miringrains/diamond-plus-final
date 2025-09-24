import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/AppShell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  // Ensure only admins can access
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/dashboard")
  }

  return (
    <AppShell 
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      logoHref="/admin"
    >
      {children}
    </AppShell>
  )
}