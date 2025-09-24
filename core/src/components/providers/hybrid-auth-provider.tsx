'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface HybridAuthContextType {
  // NextAuth session
  nextAuthSession: any
  nextAuthStatus: 'loading' | 'authenticated' | 'unauthenticated'
  
  // Supabase session
  supabaseUser: User | null
  supabaseSession: Session | null
  
  // Combined status
  isAuthenticated: boolean
  isLoading: boolean
  
  // Helper methods
  refreshSupabaseSession: () => Promise<void>
}

const HybridAuthContext = createContext<HybridAuthContextType | undefined>(undefined)

export function HybridAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession()
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null)
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(true)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session)
      setSupabaseUser(session?.user ?? null)
      setIsSupabaseLoading(false)
    })

    // Listen for Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session)
      setSupabaseUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const refreshSupabaseSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSupabaseSession(session)
    setSupabaseUser(session?.user ?? null)
  }

  const isLoading = nextAuthStatus === 'loading' || isSupabaseLoading
  const isAuthenticated = !!(nextAuthSession || supabaseUser)

  return (
    <HybridAuthContext.Provider
      value={{
        nextAuthSession,
        nextAuthStatus,
        supabaseUser,
        supabaseSession,
        isAuthenticated,
        isLoading,
        refreshSupabaseSession,
      }}
    >
      {children}
    </HybridAuthContext.Provider>
  )
}

export function useHybridAuth() {
  const context = useContext(HybridAuthContext)
  if (context === undefined) {
    throw new Error('useHybridAuth must be used within HybridAuthProvider')
  }
  return context
}
