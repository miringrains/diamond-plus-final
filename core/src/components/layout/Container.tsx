import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
}

/**
 * Container component for consistent width management across the app.
 * Provides responsive padding and max-width constraints.
 * 
 * Usage:
 * ```tsx
 * <Container>
 *   <h1>Page content</h1>
 * </Container>
 * ```
 */
export function Container({ 
  as: Component = "div",
  className,
  children,
  ...props 
}: ContainerProps) {
  return (
    <Component 
      className={cn(
        "mx-auto max-w-7xl px-4 md:px-6 lg:px-8",
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  )
}
