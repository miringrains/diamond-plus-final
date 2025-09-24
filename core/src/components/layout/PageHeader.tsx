import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  description?: string
  variant?: "simple" | "action" | "feature"
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  variant = "simple",
  actions,
  className,
  children,
}: PageHeaderProps) {
  const variants = {
    simple: {
      wrapper: "bg-white",
      container: "border-b border-gray-200",
    },
    action: {
      wrapper: "bg-gradient-to-b from-gray-50 to-white",
      container: "border-b border-gray-200",
    },
    feature: {
      wrapper: "bg-gradient-to-br from-blue-50 via-white to-cyan-50",
      container: "",
    },
  }

  return (
    <div className={cn(
      "w-full relative overflow-hidden",
      variants[variant].wrapper,
      className
    )}>
      {/* Subtle background pattern for feature variant */}
      {variant === "feature" && (
        <div className="absolute inset-0 opacity-[0.015]">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>
      )}
      
      <div className={cn("relative", variants[variant].container)}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="py-12 md:py-16">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                  {title}
                </h1>
                {description && (
                  <p className="mt-4 text-lg md:text-xl text-gray-600 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3 mt-4 md:mt-2">
                  {actions}
                </div>
              )}
            </div>
            {children && (
              <div className="mt-8">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Preset header configurations for common use cases
export const PageHeaderPresets = {
  calendar: {
    title: "Calendar",
    description: "View all upcoming coaching calls and training sessions",
    variant: "simple" as const,
  },
  podcasts: {
    title: "The Diamond Standard Podcast",
    description: "Discover the specific strategies of members who are achieving extraordinary breakthroughs in scaling",
    variant: "simple" as const,
  },
  coaching: {
    title: "Coaching",
    description: "Schedule and manage your 1-on-1 coaching sessions",
    variant: "action" as const,
  },
  community: {
    title: "Community",
    description: "Connect with other Diamond Plus members",
    variant: "simple" as const,
  },
  scripts: {
    title: "Scripts",
    description: "Access proven scripts and templates for every situation",
    variant: "simple" as const,
  },
  challenges: {
    title: "Challenges",
    description: "Push yourself with weekly and monthly challenges",
    variant: "action" as const,
  },
  workshops: {
    title: "Workshops",
    description: "Access recordings of live training workshops",
    variant: "simple" as const,
  },
  businessAudit: {
    title: "Business Audit",
    description: "Evaluate and improve your business performance",
    variant: "feature" as const,
  },
}
