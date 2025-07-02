"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useTranslation, type Locale } from "@/lib/i18n"

interface TeamFormProps {
  locale: Locale
}

export function TeamForm({ locale }: TeamFormProps) {
  const [teamName, setTeamName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { t } = useTranslation(locale)

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setIsLoading(true)
    try {
      const baseSlug = teamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      let slug = baseSlug
      let counter = 1

      // Keep trying until we find a unique slug
      while (true) {
        const { data: existingTeam, error: checkError } = await supabase
          .from("teams")
          .select("id")
          .eq("slug", slug)
          .single()

        // If no team found with this slug, we can use it
        if (checkError && checkError.code === "PGRST116") {
          break
        }

        // If there was a different error, throw it
        if (checkError && checkError.code !== "PGRST116") {
          throw checkError
        }

        // If team exists, try with counter
        if (existingTeam) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
      }

      const { error } = await supabase.from("teams").insert([{ name: teamName, slug }])

      if (error) throw error

      // Redirect with the final unique slug
      const basePath = locale === "en" ? "" : `/${locale}`
      router.push(`${basePath}/team/${slug}`)
    } catch (error) {
      console.error("Error creating team:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t("team.create")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={createTeam} className="space-y-4">
          <div>
            <Label htmlFor="teamName">{t("team.name")}</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t("team.name")}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? t("common.loading") : t("team.create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
