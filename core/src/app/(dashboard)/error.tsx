'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
          <CardDescription className="text-base mt-2">
            We encountered an unexpected error. Don&apos;t worry, we&apos;re on it!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              This error has been logged and our team will investigate it. In the meantime, you can:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>Try refreshing the page</li>
              <li>Go back to the dashboard</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
          
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">
                Development Mode - Error Details:
              </p>
              <p className="text-sm font-mono text-red-700 dark:text-red-500 break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="mt-2 text-xs font-mono text-red-600 dark:text-red-600 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              )}
              {error.digest && (
                <p className="text-xs font-mono text-red-600 dark:text-red-600 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => reset()}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}