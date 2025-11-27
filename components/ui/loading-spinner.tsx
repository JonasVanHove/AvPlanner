"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

// Inline keyframes for production build compatibility
const spinnerKeyframes = `
@keyframes spinner-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes spinner-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
@keyframes spinner-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25%); }
}
`

const spinnerVariants = cva(
  "",
  {
    variants: {
      variant: {
        default: "text-blue-600",
        secondary: "text-gray-600",
        white: "text-white",
        accent: "text-purple-600",
        theme: "text-primary", // Uses theme's primary color
      },
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string
  showText?: boolean
}

export function LoadingSpinner({
  className,
  variant,
  size,
  text = "Loading...",
  showText = false,
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: spinnerKeyframes }} />
      <svg
        className={cn(spinnerVariants({ variant, size }))}
        style={{ animation: 'spinner-spin 1s linear infinite' }}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {showText && (
        <span className={cn("text-sm font-medium", {
          "text-blue-600": variant === "default",
          "text-gray-600": variant === "secondary",
          "text-white": variant === "white",
          "text-purple-600": variant === "accent",
          "text-foreground": variant === "theme",
        })}>
          {text}
        </span>
      )}
    </div>
  )
}

// Pulse loading animation
export function PulseLoader({
  className,
  variant = "default",
  size = "default",
  ...props
}: LoadingSpinnerProps) {
  const dotClass = cn(
    "rounded-full",
    {
      "bg-blue-600": variant === "default",
      "bg-gray-600": variant === "secondary", 
      "bg-white": variant === "white",
      "bg-purple-600": variant === "accent",
      "bg-primary": variant === "theme",
    },
    {
      "h-2 w-2": size === "sm",
      "h-3 w-3": size === "default",
      "h-4 w-4": size === "lg",
      "h-6 w-6": size === "xl",
    }
  )

  return (
    <div
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: spinnerKeyframes }} />
      <div className={dotClass} style={{ animation: 'spinner-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '0ms' }} />
      <div className={dotClass} style={{ animation: 'spinner-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '150ms' }} />
      <div className={dotClass} style={{ animation: 'spinner-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '300ms' }} />
    </div>
  )
}

// Skeleton loading for content
export function SkeletonLoader({
  className,
  lines = 3,
  ...props
}: {
  className?: string
  lines?: number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <style dangerouslySetInnerHTML={{ __html: spinnerKeyframes }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gray-200 dark:bg-gray-700 rounded",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
          style={{ animation: 'spinner-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        />
      ))}
    </div>
  )
}

// Dots loading animation
export function DotsLoader({
  className,
  variant = "default",
  size = "default",
  ...props
}: LoadingSpinnerProps) {
  const dotClass = cn(
    "rounded-full",
    {
      "bg-blue-600": variant === "default",
      "bg-gray-600": variant === "secondary",
      "bg-white": variant === "white", 
      "bg-purple-600": variant === "accent",
      "bg-primary": variant === "theme",
    },
    {
      "h-1.5 w-1.5": size === "sm",
      "h-2 w-2": size === "default",
      "h-3 w-3": size === "lg",
      "h-4 w-4": size === "xl",
    }
  )

  return (
    <div
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: spinnerKeyframes }} />
      <div className={dotClass} style={{ animation: 'spinner-bounce 1s infinite', animationDelay: '0ms' }} />
      <div className={dotClass} style={{ animation: 'spinner-bounce 1s infinite', animationDelay: '150ms' }} />
      <div className={dotClass} style={{ animation: 'spinner-bounce 1s infinite', animationDelay: '300ms' }} />
    </div>
  )
}

// Full page loading overlay
export function LoadingOverlay({
  className,
  text = "Loading...",
  variant = "default",
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner variant={variant} size="xl" />
        <p className="text-sm font-medium text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  )
}
