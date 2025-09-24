"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  role: string
  profile?: any
}

interface SupabaseAuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Fetch profile data from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Failed to fetch profile:', error)
        return
      }
      
      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          role: data.role || 'user',
          profile: data
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    console.log('SupabaseAuthProvider: Getting initial session...')
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('SupabaseAuthProvider: Session response:', { session, error })
      
      if (error) {
        console.error('SupabaseAuthProvider: Error getting session:', error)
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      
      // Fetch profile if user is logged in
      if (session?.user) {
        console.log('SupabaseAuthProvider: Fetching profile for user:', session.user.id)
        await fetchProfile(session.user.id)
      }
      
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Fetch profile on auth change
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const signOut = async () => {
    await supabase.auth.signOut()
    // Navigation will be handled by the component calling signOut
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signOut,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return context
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
}