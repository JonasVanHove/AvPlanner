"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { ForgotPasswordForm } from "./forgot-password-form"
import { LogIn, UserPlus } from "lucide-react"

type AuthMode = "login" | "register" | "forgot-password"

interface AuthDialogProps {
  mode?: AuthMode
  trigger?: React.ReactNode
  children?: React.ReactNode
}

export function AuthDialog({ mode = "login", trigger, children }: AuthDialogProps) {
  const [open, setOpen] = useState(false)
  const [currentMode, setCurrentMode] = useState<AuthMode>(mode)

  const handleOpen = () => {
    setCurrentMode(mode) // Reset to the initial mode when opening
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setCurrentMode(mode) // Reset to initial mode when closing
  }

  const renderForm = () => {
    switch (currentMode) {
      case "login":
        return (
          <LoginForm
            onClose={handleClose}
            onSwitchToRegister={() => setCurrentMode("register")}
            onSwitchToForgotPassword={() => setCurrentMode("forgot-password")}
          />
        )
      case "register":
        return (
          <RegisterForm
            onClose={handleClose}
            onSwitchToLogin={() => setCurrentMode("login")}
          />
        )
      case "forgot-password":
        return (
          <ForgotPasswordForm
            onClose={handleClose}
            onSwitchToLogin={() => setCurrentMode("login")}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) {
        handleOpen()
      } else {
        handleClose()
      }
    }}>
      <DialogTrigger asChild>
        {trigger || children || (
          <Button variant="outline" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}

export function LoginButton() {
  return (
    <AuthDialog mode="login">
      <Button 
        variant="outline" 
        className="flex items-center gap-2 transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 hover:shadow-md focus:ring-2 focus:ring-blue-200 focus:ring-offset-1"
      >
        <LogIn className="h-4 w-4 transition-colors duration-200" />
        Login
      </Button>
    </AuthDialog>
  )
}

export function RegisterButton() {
  return (
    <AuthDialog mode="register">
      <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-105 focus:ring-2 focus:ring-purple-200 focus:ring-offset-1">
        <UserPlus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
        Sign Up
      </Button>
    </AuthDialog>
  )
}
