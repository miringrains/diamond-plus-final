"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, Loader2 } from "lucide-react"
import Image from "next/image"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

// Password validation requirements
const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
  { id: 'lowercase', label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
  { id: 'number', label: 'One number', test: (pwd: string) => /\d/.test(pwd) },
  { id: 'special', label: 'One special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
]

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<Record<string, boolean>>({})
  const supabase = getSupabaseBrowserClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  })

  const password = form.watch("password")
  const confirmPassword = form.watch("confirmPassword")

  // Update password validation on password change
  useEffect(() => {
    const validation: Record<string, boolean> = {}
    passwordRequirements.forEach(req => {
      validation[req.id] = req.test(password || '')
    })
    setPasswordValidation(validation)
  }, [password])

  async function onSubmit(data: FormData) {
    try {
      setIsLoading(true)
      setError(null)

      // Create the user with Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: `${data.firstName} ${data.lastName}`,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            role: 'user',
          }
        }
      })

      if (signUpError) {
        throw new Error(signUpError.message)
      }

      if (!authData.user) {
        throw new Error("Failed to create account")
      }

      // If email confirmation is required, show a message
      if (authData.session === null) {
        setError("Please check your email to confirm your account before signing in.")
        return
      }

      // Sign them in automatically if no email confirmation is required
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        throw new Error("Account created but failed to sign in. Please try logging in.")
      }

      // Redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Registration error:", error)
      setError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" data-auth-page>
      {/* Left Column - Form */}
      <div className="flex w-full items-center justify-center px-8 md:w-1/2 lg:px-16 bg-[#1F1F1F] text-white">
        <div className="w-full max-w-[420px] p-8 border border-[#2A2A2A] rounded-2xl bg-[#252525]">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/diamondpluglogowhite.svg"
              alt="Diamond Plus"
              width={140}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Create account</h1>
            <p className="mt-2 text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-[#468BE6] hover:text-[#3A7AD4] transition-colors duration-150">
                Sign in
              </Link>
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          autoComplete="given-name"
                          className="h-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-[#468BE6] focus:ring-2 focus:ring-[#468BE6] transition-colors duration-150"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          autoComplete="family-name"
                          className="h-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-[#468BE6] focus:ring-2 focus:ring-[#468BE6] transition-colors duration-150"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        className="h-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-[#468BE6] focus:ring-2 focus:ring-[#468BE6] transition-colors duration-150"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-[#468BE6] focus:ring-2 focus:ring-[#468BE6] transition-colors duration-150"
                        {...field}
                      />
                    </FormControl>
                    {password && (
                      <div className="mt-2 space-y-1">
                        {passwordRequirements.map(req => (
                          <div 
                            key={req.id} 
                            className={`flex items-center gap-2 text-xs ${
                              passwordValidation[req.id] ? 'text-green-400' : 'text-gray-500'
                            }`}
                          >
                            {passwordValidation[req.id] ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            <span>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-[#468BE6] focus:ring-2 focus:ring-[#468BE6] transition-colors duration-150"
                        {...field}
                      />
                    </FormControl>
                    {confirmPassword && password && (
                      <div className={`flex items-center gap-2 text-xs mt-2 ${
                        password === confirmPassword ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {password === confirmPassword ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span>Passwords match</span>
                      </div>
                    )}
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-[#468BE6] hover:bg-[#3A7AD4] text-white transition-colors duration-150"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Right Column - Video */}
      <div className="hidden md:block md:w-1/2 relative bg-black">
        <video
          src="/bluediamond.mp4"
          autoPlay={true}
          loop={true}
          muted={true}
          playsInline={true}
          controls={false}
          className="w-full h-full object-cover"
        >
          <source src="/bluediamond.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
}