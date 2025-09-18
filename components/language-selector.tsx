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
      <SelectTrigger className="w-20 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm focus:ring-2 focus:ring-blue-200 focus:ring-offset-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
        <SelectItem 
          value="en" 
          className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700"
        >
          🇺🇸 EN
        </SelectItem>
        <SelectItem 
          value="nl" 
          className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700"
        >
          🇳🇱 NL
        </SelectItem>
        <SelectItem 
          value="fr" 
          className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700"
        >
          🇫🇷 FR
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
