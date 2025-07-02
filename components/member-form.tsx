"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { Plus, Upload, X } from "lucide-react"

interface Member {
  id?: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface MemberFormProps {
  teamId: string
  locale: Locale
  onMemberAdded: () => void
  member?: Member
  mode?: "add" | "edit"
}

export function MemberForm({ teamId, locale, onMemberAdded, member, mode = "add" }: MemberFormProps) {
  const [firstName, setFirstName] = useState(member?.first_name || "")
  const [lastName, setLastName] = useState(member?.last_name || "")
  const [email, setEmail] = useState(member?.email || "")
  const [profileImage, setProfileImage] = useState(member?.profile_image || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation(locale)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // For demo purposes, we'll use a placeholder image service
      // In production, you'd upload to Supabase Storage or another service
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) return

    setIsLoading(true)
    try {
      const memberData = {
        team_id: teamId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        profile_image: profileImage || null,
      }

      if (mode === "edit" && member?.id) {
        const { error } = await supabase.from("members").update(memberData).eq("id", member.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("members").insert([memberData])
        if (error) throw error
      }

      setFirstName("")
      setLastName("")
      setEmail("")
      setProfileImage("")
      setIsOpen(false)
      onMemberAdded()
    } catch (error) {
      console.error("Error saving member:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {mode === "add" ? (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {t("team.addMember")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            Bewerken
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? t("team.addMember") : "Lid Bewerken"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileImage || "/placeholder.svg"} alt="Profile" />
              <AvatarFallback className="bg-blue-500 text-white text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Foto
              </Button>
              {profileImage && (
                <Button type="button" variant="outline" size="sm" onClick={() => setProfileImage("")}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div>
            <Label htmlFor="firstName">{t("team.firstName")} *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("team.firstName")}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">{t("team.lastName")}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("team.lastName")}
            />
          </div>
          <div>
            <Label htmlFor="email">{t("team.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.loading") : mode === "add" ? t("common.add") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
