"use client"

import { useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  useEffect(() => {
    const logout = async () => {
      // Clear all possible session storage first
      if (typeof window !== 'undefined') {
        // Clear all storage
        window.sessionStorage.clear()
        window.localStorage.clear()
        
        // Clear cookies that might be accessible
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }
      
      try {
        // Sign out from Supabase
        await supabase.auth.signOut()
        
        // Force a complete page reload to clear any cached state
        // Using replace prevents back button from returning to logout page
        window.location.replace('/')
      } catch (error) {
        console.error('Sign out error:', error)
        // Even on error, redirect to home
        window.location.replace('/')
      }
    }
    
    logout()
  }, [supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
        <p className="text-lg font-medium">Logging out...</p>
      </div>
    </div>
  )
}