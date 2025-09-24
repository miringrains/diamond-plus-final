"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('Attempting login for:', email)
      const response = await fetch('/api/supabase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          redirectTo: '/admin',
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      // Check if the response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Try to read the response text to see what we're actually getting
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 500))
        throw new Error('Server error: Invalid response format')
      }

      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (data.success) {
        // Don't set loading to false - keep spinner showing during redirect
        // Use relative URL for redirect to avoid cross-domain issues
        window.location.href = data.redirectTo || '/admin'
      } else {
        throw new Error('Login failed - no success flag')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || "Invalid email or password")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          placeholder="admin@example.com"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isLoading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}
      <Button disabled={isLoading} type="submit" className="w-full">
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Sign In
      </Button>
    </form>
  )
}