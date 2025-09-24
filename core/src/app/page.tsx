import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect("/dashboard")
  }
  
  redirect("/login")
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0