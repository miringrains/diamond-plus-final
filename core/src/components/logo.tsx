"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import Image from "next/image"

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
      <Image
        src="/Diamondpluslogodark.svg"
        alt="Diamond Plus"
        width={width}
        height={height}
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          filter: invert ? 'invert(1)' : undefined
        }}
        priority
      />
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