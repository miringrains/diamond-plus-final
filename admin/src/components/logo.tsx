"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  href?: string
  width?: number
  height?: number
  invert?: boolean
}

export function Logo({ 
  className = "", 
  href = "/",
  width = 120,
  height = 30,
  invert = false
}: LogoProps) {
  const logoElement = (
    <div className={cn("flex items-center", className)}>
      <div className={cn("text-xl font-bold", invert ? "text-white" : "text-primary")}>
        Diamond Plus Admin
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition-opacity">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}