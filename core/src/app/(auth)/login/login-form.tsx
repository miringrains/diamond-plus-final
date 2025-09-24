"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface LoginFormProps {
  redirectTo?: string
  message?: string
  authError?: string
}

export default function LoginForm({ redirectTo = '/dashboard', message, authError }: LoginFormProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  useEffect(() => {
    // Handle messages from URL params
    if (authError === 'auth_error') {
      setError('Authentication failed. Please try again.')
    }
  }, [authError])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('🎯 Form submitted!')
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log('📧 Email:', email)
    console.log('🔑 Password provided:', password ? 'Yes' : 'No')

    try {
      console.log('📡 Sending login request...')
      const response = await fetch('/api/supabase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          redirectTo: redirectTo,
        }),
      })

      console.log('📨 Response status:', response.status)
      const data = await response.json()
      console.log('📦 Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (data.success) {
        console.log('✅ Login successful! Redirecting...')
        // Don't set loading to false - keep spinner showing during redirect
        window.location.href = `https://diamondplusportal.com${data.redirectTo || redirectTo}`
      } else {
        throw new Error('Login failed - no success flag')
      }
    } catch (error: any) {
      console.error('❌ Login error:', error)
      setError(error.message || "Invalid email or password")
      setIsLoading(false)
    }
  }

  async function handleForgotPassword() {
    const emailInput = document.getElementById('email') as HTMLInputElement
    const email = emailInput?.value

    if (!email) {
      setError("Please enter your email address first")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://diamondplusportal.com/auth/confirm?type=recovery`,
      })

      if (error) throw error

      // Show success as an info message instead of error
      setError("Check your email for the password reset link")
    } catch (error: any) {
      setError(error.message || "Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || authError) && (
        <div className={`border px-4 py-3 rounded-lg text-sm ${
          error?.includes("Check your email") 
            ? "bg-blue-50 border-blue-200 text-blue-600" 
            : "bg-red-50 border-red-200 text-red-600"
        }`}>
          {error || 'Authentication failed. Please try again.'}
        </div>
      )}
      {message === 'password_reset' && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
          Password reset successful! Please log in with your new password.
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input-field"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input-field"
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between">
        <a 
          href="https://zerotodiamond.com" 
          className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Interested in Joining?
        </a>
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)]"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        className="btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>

    </form>
  )
}