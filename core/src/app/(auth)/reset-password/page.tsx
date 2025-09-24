"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Sign out to clear the temporary session
      await supabase.auth.signOut()
      
      setTimeout(() => {
        router.push('/login?message=password_reset')
      }, 2000)
    } catch (error: any) {
      console.error('Password update error:', error)
      setError(error.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4 pt-8 pb-4">
            <div className="flex justify-center">
              <Logo width={200} height={50} href="/" invert />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">Password reset successful!</CardTitle>
              <CardDescription className="text-muted-foreground">
                Redirecting to login...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="rounded-lg bg-green-50 p-4 text-green-800 text-center">
              <p className="text-sm">Your password has been updated successfully.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm shadow-[0_0_40px_rgba(21,174,233,0.1)]">
        <CardHeader className="space-y-4 pt-8 pb-4">
          <div className="flex justify-center">
            <Logo width={200} height={50} href="/" invert />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-6">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter new password"
                className="h-11 bg-muted/50 border-input hover:border-accent/50 focus:border-accent transition-colors"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                className="h-11 bg-muted/50 border-input hover:border-accent/50 focus:border-accent transition-colors"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col px-6 pb-8 pt-6 space-y-4">
            <Button
              type="submit"
              className="w-full h-11 bg-accent hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] text-white shadow-[0_0_20px_rgba(21,174,233,0.2)] hover:shadow-[0_0_30px_rgba(21,174,233,0.4)] transition-all duration-300 font-medium"
              disabled={isLoading || !!error?.includes("Invalid or expired")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              <Link 
                href="/login" 
                className="font-semibold text-accent hover:text-[var(--accent-hover)] transition-colors"
              >
                Back to login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}