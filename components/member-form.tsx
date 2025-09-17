"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { UserPlus, Edit, Upload, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Locale } from "@/lib/i18n"
import { MemberAvatar } from "./member-avatar"

interface Member {
  id: string
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
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(member?.first_name || "")
  const [lastName, setLastName] = useState(member?.last_name || "")
  const [email, setEmail] = useState(member?.email || "")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState(member?.profile_image || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Bestand is te groot. Maximaal 5MB toegestaan.")
        return
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Alleen afbeeldingen zijn toegestaan.")
        return
      }

      setProfileImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setProfileImage(null)
    setProfileImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage.from("profile-images").upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("profile-images").getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      alert("Voornaam en achternaam zijn verplicht.")
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = profileImagePreview

      // Upload new image if selected
      if (profileImage) {
        const uploadedUrl = await uploadImage(profileImage)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      const memberData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        profile_image: imageUrl || null,
        team_id: teamId,
      }

      if (mode === "edit" && member) {
        const { error } = await supabase.from("members").update(memberData).eq("id", member.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("members").insert([memberData])

        if (error) throw error
      }

      onMemberAdded()
      setOpen(false)

      // Reset form
      if (mode === "add") {
        setFirstName("")
        setLastName("")
        setEmail("")
        setProfileImage(null)
        setProfileImagePreview("")
      }
    } catch (error) {
      console.error("Error saving member:", error)
      alert("Er is een fout opgetreden bij het opslaan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const triggerContent =
    mode === "edit" ? (
      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
        <Edit className="mr-2 h-4 w-4" />
        Bewerken
      </DropdownMenuItem>
    ) : (
      <Button variant="ghost" size="sm" className="rounded-md bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 font-medium transition-all duration-200 px-2 py-1.5 h-8">
        <UserPlus className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Add Member</span>
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {triggerContent}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            {mode === "edit" ? "Teamlid bewerken" : "Nieuw teamlid toevoegen"}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {mode === "edit" ? "Bewerk de gegevens van het teamlid." : "Voeg een nieuw teamlid toe aan het team."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900 dark:text-white">Profielfoto</Label>
            <div className="flex items-center gap-4">
              <MemberAvatar
                firstName={firstName}
                lastName={lastName}
                profileImage={profileImagePreview}
                size="lg"
                className="ring-2 ring-gray-200 dark:ring-gray-600"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload foto
                </Button>
                {profileImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                    className="text-xs text-red-600 hover:text-red-700 bg-transparent"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Verwijder
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-900 dark:text-white">
              Voornaam *
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Voer voornaam in"
              required
              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-900 dark:text-white">
              Achternaam *
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Voer achternaam in"
              required
              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-white">
              E-mail (optioneel)
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Voer e-mailadres in"
              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-gray-700 dark:text-gray-300"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner variant="white" size="sm" className="mr-2" />
                  {mode === "edit" ? "Bijwerken..." : "Toevoegen..."}
                </>
              ) : mode === "edit" ? (
                "Bijwerken"
              ) : (
                "Toevoegen"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
