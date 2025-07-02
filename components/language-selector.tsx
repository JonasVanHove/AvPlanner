"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, usePathname } from "next/navigation"
import type { Locale } from "@/lib/i18n"

interface LanguageSelectorProps {
  currentLocale: Locale
}

export function LanguageSelector({ currentLocale }: LanguageSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: Locale) => {
    // Remove current locale from pathname and add new one
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
    const newPath = newLocale === "en" ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`
    router.push(newPath)
  }

  return (
    <Select value={currentLocale} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-20">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">🇺🇸 EN</SelectItem>
        <SelectItem value="nl">🇳🇱 NL</SelectItem>
        <SelectItem value="fr">🇫🇷 FR</SelectItem>
      </SelectContent>
    </Select>
  )
}
