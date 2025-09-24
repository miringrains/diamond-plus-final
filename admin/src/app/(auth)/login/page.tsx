"use client"

import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { Loader2 } from "lucide-react"
import { LoginForm } from "./login-form-supabase"

function LoginPageContent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm shadow-[0_0_40px_rgba(21,174,233,0.1)]">
        <CardHeader className="space-y-4 pt-8 pb-4">
          <div className="flex justify-center">
            <Logo width={200} height={50} href="/" invert />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in with your admin credentials
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-6">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}