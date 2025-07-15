"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { useTranslation, type Locale } from "@/lib/i18n"

interface EditModePasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  onPasswordSubmit: (password: string) => void
  isLoading: boolean
  error?: string
  locale: Locale
}

export function EditModePasswordDialog({ 
  isOpen,
  onClose,
  teamName, 
  onPasswordSubmit, 
  isLoading, 
  error,
  locale 
}: EditModePasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { t } = useTranslation(locale)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    onPasswordSubmit(password)
  }

  const handleClose = () => {
    setPassword("")
    setShowPassword(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">
            Enable Edit Mode
          </DialogTitle>
          <DialogDescription className="text-center">
            Please enter the team password to enable edit mode for <strong>{teamName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              Team Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter team password"
                className="pr-10"
                disabled={isLoading}
                autoFocus
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!password.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Enable Edit Mode"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
