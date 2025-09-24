import LoginForm from './login-form'
import Image from "next/image"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Diamond Plus Logo */}
          <div className="flex justify-center">
            <Image
              src="/Diamondpluslogodark.svg"
              alt="Diamond Plus"
              width={200}
              height={35}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your Diamond Plus account
            </p>
          </div>
          <LoginForm />
        </div>
      </div>

      {/* Right side - Video Only */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/bluediamond.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}