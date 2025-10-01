"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Clock, Settings } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTranslation, type Locale } from "@/lib/i18n"
import { format } from 'date-fns'
import { nl, enUS, fr } from 'date-fns/locale'

interface HolidayManagementProps {
  teamId: string
  locale: Locale
  initialAutoHolidaysEnabled?: boolean
  onAutoHolidaysChange?: (enabled: boolean) => void
}

interface Holiday {
  id: string
  name: string
  name_nl?: string
  name_fr?: string
  date: string
  country_code: string
  country_name: string
  is_official: boolean
}

interface Country {
  code: string
  name: string
  name_nl?: string
  name_fr?: string
}

export function HolidayManagement({ 
  teamId, 
  locale, 
  initialAutoHolidaysEnabled = false,
  onAutoHolidaysChange 
}: HolidayManagementProps) {
  const { t } = useTranslation(locale)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [autoHolidaysEnabled, setAutoHolidaysEnabled] = useState(initialAutoHolidaysEnabled)
  const [isToggling, setIsToggling] = useState(false)

  const dateLocale = locale === 'nl' ? nl : locale === 'fr' ? fr : enUS

  useEffect(() => {
    fetchCountries()
    fetchHolidays()
  }, [teamId, selectedYear, selectedCountry])

  const executeAutoHolidays = async () => {
    setIsToggling(true)
    try {
      const response = await fetch(`/api/teams/auto-holidays?teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'apply',
          startDate: `${selectedYear}-01-01`,
          endDate: `${selectedYear}-12-31`,
          onlyNew: true // Only add new records, don't overwrite
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Auto-holidays applied:', result)
        // Refresh holidays list to show newly added holidays
        fetchHolidays()
      } else {
        const errorText = await response.text()
        console.error('❌ Auto-holidays error:', errorText)
      }
    } catch (error) {
      console.error('Error executing auto-holidays:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/countries')
      if (response.ok) {
        const data = await response.json()
        setCountries(data.countries || [])
      }
    } catch (error) {
      console.error('Failed to fetch countries:', error)
    }
  }

  const fetchHolidays = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(selectedCountry !== 'all' && { country: selectedCountry })
      })

      console.log('🎄 Fetching holidays with params:', params.toString())
      const response = await fetch(`/api/holidays?${params}`)
      console.log('🎄 Holidays API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🎄 Holidays API data:', data)
        setHolidays(data)
      } else {
        const errorText = await response.text()
        console.error('🎄 Holidays API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('🎄 Failed to fetch holidays:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getHolidayName = (holiday: Holiday) => {
    switch (locale) {
      case 'nl':
        return holiday.name_nl || holiday.name
      case 'fr':
        return holiday.name_fr || holiday.name
      default:
        return holiday.name
    }
  }

  const getCountryName = (country: Country) => {
    switch (locale) {
      case 'nl':
        return country.name_nl || country.name
      case 'fr':
        return country.name_fr || country.name
      default:
        return country.name
    }
  }

  const groupHolidaysByCountry = () => {
    const grouped = holidays.reduce((acc, holiday) => {
      if (!acc[holiday.country_code]) {
        acc[holiday.country_code] = {
          country: holiday.country_name,
          holidays: []
        }
      }
      acc[holiday.country_code].holidays.push(holiday)
      return acc
    }, {} as Record<string, { country: string; holidays: Holiday[] }>)

    // Sort holidays by date within each country
    Object.values(grouped).forEach(group => {
      group.holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })

    return grouped
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2)
  const groupedHolidays = groupHolidaysByCountry()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">
            {locale === "en" ? "Holiday Overview" : locale === "nl" ? "Feestdagen Overzicht" : "Aperçu des Fêtes"}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={executeAutoHolidays}
            disabled={isToggling}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {isToggling 
              ? (locale === "en" ? "Adding..." : locale === "nl" ? "Toevoegen..." : "Ajout...")
              : (locale === "en" ? "Add Auto-Holidays" : locale === "nl" ? "Voeg Auto-Feestdagen Toe" : "Ajouter Fêtes Auto")
            }
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {locale === "en" ? "Year" : locale === "nl" ? "Jaar" : "Année"}
          </label>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {locale === "en" ? "Country" : locale === "nl" ? "Land" : "Pays"}
          </label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {locale === "en" ? "All Countries" : locale === "nl" ? "Alle Landen" : "Tous les Pays"}
              </SelectItem>
              {countries.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  {getCountryName(country)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Holiday Overview */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {locale === "en" ? "Loading holidays..." : locale === "nl" ? "Feestdagen laden..." : "Chargement..."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedHolidays).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {locale === "en" ? "No holidays found for the selected criteria" : 
                   locale === "nl" ? "Geen feestdagen gevonden voor de geselecteerde criteria" : 
                   "Aucune fête trouvée pour les critères sélectionnés"}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedHolidays).map(([countryCode, group]) => (
              <Card key={countryCode}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {group.country}
                    <Badge variant="outline" className="ml-auto">
                      {group.holidays.length} {locale === "en" ? "holidays" : locale === "nl" ? "feestdagen" : "fêtes"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {group.holidays.map(holiday => (
                      <div key={holiday.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{getHolidayName(holiday)}</span>
                            {holiday.is_official && (
                              <span className="text-xs text-gray-500">
                                {locale === "en" ? "Official" : locale === "nl" ? "Officieel" : "Officiel"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-mono">
                            {format(new Date(holiday.date), 'dd MMM yyyy', { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>
            {locale === "en" ? "Auto-Holidays:" : locale === "nl" ? "Auto-Feestdagen:" : "Fêtes Automatiques:"}
          </strong>{" "}
          {locale === "en" ? 
            "When enabled, team members will automatically get holidays based on their country. These holidays will appear as yellow/orange in the team calendar." :
           locale === "nl" ? 
            "Wanneer ingeschakeld krijgen teamleden automatisch feestdagen op basis van hun land. Deze feestdagen verschijnen als geel/oranje in de teamkalender." :
            "Lorsqu'activé, les membres de l'équipe recevront automatiquement des fêtes basées sur leur pays. Ces fêtes apparaîtront en jaune/orange dans le calendrier d'équipe."}
        </p>
      </div>
    </div>
  )
}