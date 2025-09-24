"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { Loader2 } from "lucide-react"

const registerSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  confirmPassword: z.string(),
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  })

  async function onSubmit(data: z.infer<typeof registerSchema>) {
    setIsLoading(true)
    setError(null)

    try {
      // Register is not available for admin portal
      setError("Registration is not available for the admin portal. Please contact an administrator to create your account.")
      setIsLoading(false)
    } catch (error) {
      console.error("Registration error:", error)
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 pt-8 pb-4">
          <div className="flex justify-center">
            <Logo width={200} height={50} href="/" invert />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Admin Registration</CardTitle>
            <CardDescription className="text-muted-foreground">
              Admin registration is by invitation only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Registration is not available for the admin portal. Please contact an administrator to create your account.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}