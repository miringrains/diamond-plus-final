"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  orientation?: "horizontal" | "vertical"
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex touch-none select-none",
      orientation === "horizontal" 
        ? "w-full items-center" 
        : "h-full items-center justify-center",
      className
    )}
    orientation={orientation}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative overflow-hidden rounded-full bg-gray-200",
        orientation === "horizontal" ? "h-2 w-full" : "w-2 h-full"
      )}
    >
      <SliderPrimitive.Range 
        className={cn(
          "absolute bg-blue-600",
          orientation === "horizontal" ? "h-full" : "w-full"
        )} 
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-4 w-4 rounded-full border-2 border-blue-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
