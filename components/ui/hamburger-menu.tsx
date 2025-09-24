"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface HamburgerMenuProps {
  children: React.ReactNode
  title?: string
  triggerClassName?: string
  appName?: string
  teamName?: string
}

export function HamburgerMenu({ children, title = "Menu", triggerClassName, appName, teamName }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  // Only render on mobile
  if (!isMobile) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={triggerClassName || `bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-9 px-3 flex items-center gap-2 shadow-sm`}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
          {!triggerClassName?.includes('p-0') && <span className="text-xs font-medium">Menu</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-200">
          {appName && teamName ? (
            <div className="text-left">
              <SheetTitle className="text-lg font-bold text-gray-900">{appName}</SheetTitle>
              <p className="text-sm text-gray-600 mt-1">{teamName}</p>
            </div>
          ) : (
            <SheetTitle className="text-left text-lg font-semibold">{title}</SheetTitle>
          )}
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Helper component for menu items - Deprecated, use direct children instead
export function HamburgerMenuItem({ 
  children, 
  onClick, 
  className = "" 
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string 
}) {
  return (
    <div 
      className={`p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}