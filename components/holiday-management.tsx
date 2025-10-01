"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Settings, Play, Trash2, Eye, Users, MapPin, Clock, AlertCircle, Filter } from "lucide-react"
import { useTranslation, type Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { format } from 'date-fns'
import { nl, enUS, fr } from 'date-fns/locale'

interface HolidayManagementProps {
  teamId: string
  locale: Locale
  members?: Member[]
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
  is_hidden?: boolean
  country_code?: string
}

interface UpcomingHoliday {
  member_id: string
  member_name: string
  country_code: string
  holiday_date: string
  holiday_name: string
  current_availability_status: string
}

interface AutoHolidayResult {
  success: boolean
  applied_count: number
  member_count: number
  holiday_count: number
  details: any[]
}

interface Country {
  code: string
  name: string
  name_nl?: string
  name_fr?: string
}

export function HolidayManagement({ teamId, locale, members = [] }: HolidayManagementProps) {
  const { t } = useTranslation(locale)
  const [isLoading, setIsLoading] = useState(false)
  const [upcomingHolidays, setUpcomingHolidays] = useState<UpcomingHoliday[]>([])
  const [autoHolidaysEnabled, setAutoHolidaysEnabled] = useState(true)
  const [daysAhead, setDaysAhead] = useState(30)
  const [lastResult, setLastResult] = useState<AutoHolidayResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const dateLocale = locale === 'nl' ? nl : locale === 'fr' ? fr : enUS

  // Member selection handlers
  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSelectAllMembers = () => {
    const visibleMembers = members.filter(m => !m.is_hidden)
    if (selectedMembers.filter(id => !members.find(m => m.id === id)?.is_hidden).length === visibleMembers.length) {
      // Deselect all visible members
      setSelectedMembers(prev => prev.filter(id => members.find(m => m.id === id)?.is_hidden))
    } else {
      // Select all visible members (keep hidden members as they were)
      const hiddenSelected = selectedMembers.filter(id => members.find(m => m.id === id)?.is_hidden)
      setSelectedMembers([...hiddenSelected, ...visibleMembers.map(m => m.id)])
    }
  }

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/countries')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      setCountries(data.countries || [])
    } catch (error) {
      console.error('Error fetching countries:', error)
    }
  }

  // Get country name in current locale
  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode)
    if (!country) return countryCode
    
    if (locale === 'nl' && country.name_nl) return country.name_nl
    if (locale === 'fr' && country.name_fr) return country.name_fr
    return country.name
  }

  // Fetch upcoming holidays for preview
  const fetchUpcomingHolidays = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Fetching upcoming holidays for team:', teamId, 'days ahead:', daysAhead)
      
      const response = await fetch(`/api/teams/auto-holidays?teamId=${teamId}&daysAhead=${daysAhead}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📅 Received holidays data:', data)
      console.log('👥 Found holidays for countries:', [...new Set(data.holidays?.map((h: UpcomingHoliday) => h.country_code) || [])])
      
      setUpcomingHolidays(data.holidays || [])
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Apply auto-holidays
  const applyAutoHolidays = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member')
      return
    }

    try {
      setIsLoading(true)
      console.log('⚡ Applying auto-holidays for team:', teamId, 'members:', selectedMembers, 'from', dateRange.from, 'to', dateRange.to)
      
      const response = await fetch(`/api/teams/auto-holidays?teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          startDate: dateRange.from,
          endDate: dateRange.to,
          memberIds: selectedMembers  // Only apply to selected members
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ Auto-holidays result:', result)
      
      setLastResult(result)
      
      // Refresh the preview
      await fetchUpcomingHolidays()
      
      alert(`${t('holidays.applied')}: ${result.applied_count} ${t('holidays.holidaysFor')} ${result.member_count} ${t('holidays.members')}`)
    } catch (error) {
      console.error('Error applying auto-holidays:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Remove auto-holidays
  const removeAutoHolidays = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member')
      return
    }
    
    if (!confirm(`Remove holidays for ${selectedMembers.length} selected member${selectedMembers.length !== 1 ? 's' : ''}?`)) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/teams/auto-holidays?teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          startDate: dateRange.from,
          endDate: dateRange.to,
          memberIds: selectedMembers  // Only remove for selected members
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      // Refresh the preview
      await fetchUpcomingHolidays()
      
      alert(`${t('holidays.removed')}: ${result.removed_count} ${t('holidays.entries')}`)
    } catch (error) {
      console.error('Error removing auto-holidays:', error)
      alert(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCountries()
    fetchUpcomingHolidays()
  }, [teamId, daysAhead])

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'holiday': { label: t('status.holiday'), color: 'bg-yellow-500 text-white' },
      'available': { label: t('status.available'), color: 'bg-green-500 text-white' },
      'unavailable': { label: t('status.unavailable'), color: 'bg-red-500 text-white' },
      'not_set': { label: t('status.not_set'), color: 'bg-gray-400 text-white' }
    }
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.not_set
    
    return (
      <Badge className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
  }

  const groupHolidaysByCountry = (holidays: UpcomingHoliday[]) => {
    // Filter holidays by selected countries (if any selected)
    const filteredHolidays = selectedCountries.length > 0 
      ? holidays.filter(holiday => selectedCountries.includes(holiday.country_code))
      : holidays

    return filteredHolidays.reduce((acc, holiday) => {
      if (!acc[holiday.country_code]) {
        acc[holiday.country_code] = []
      }
      acc[holiday.country_code].push(holiday)
      return acc
    }, {} as Record<string, UpcomingHoliday[]>)
  }

  const groupedHolidays = groupHolidaysByCountry(upcomingHolidays)
  const availableCountries = [...new Set(upcomingHolidays.map(h => h.country_code))]

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('holidays.management')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Member Selection */}
          {members.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Team Members
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllMembers}
                  className="h-8 text-xs"
                >
                  {selectedMembers.filter(id => !members.find(m => m.id === id)?.is_hidden).length === members.filter(m => !m.is_hidden).length 
                    ? 'Deselect All'
                    : 'Select All'
                  }
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-3">
                {members.map(member => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center space-x-3 p-2 rounded-lg border transition-all",
                      member.is_hidden 
                        ? "cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600" 
                        : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                      !member.is_hidden && selectedMembers.includes(member.id) 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700" 
                        : !member.is_hidden 
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : ""
                    )}
                    onClick={() => !member.is_hidden && handleMemberToggle(member.id)}
                  >
                    <Checkbox 
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => !member.is_hidden && handleMemberToggle(member.id)}
                      disabled={member.is_hidden}
                      className="pointer-events-none flex-shrink-0"
                    />
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.profile_image} />
                      <AvatarFallback className="text-xs">
                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        member.is_hidden 
                          ? "text-gray-400 dark:text-gray-500 line-through" 
                          : "text-gray-900 dark:text-white"
                      )}>
                        {member.first_name} {member.last_name}
                        {member.is_hidden && (
                          <span className="ml-2 text-xs text-gray-400">(Hidden)</span>
                        )}
                      </p>
                      {member.country_code && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getCountryName(member.country_code)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="auto-holidays">{t('holidays.autoHolidays')}</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-holidays"
                  checked={autoHolidaysEnabled}
                  onCheckedChange={setAutoHolidaysEnabled}
                />
                <span className="text-sm text-gray-600">
                  {autoHolidaysEnabled ? t('holidays.enabled') : t('holidays.disabled')}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="days-ahead">{t('holidays.previewDays')}</Label>
              <Input
                id="days-ahead"
                type="number"
                value={daysAhead}
                onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
                className="w-24"
              />
            </div>
          </div>

          {/* Country Filter */}
          {availableCountries.length > 1 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Country
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableCountries.map(countryCode => (
                  <div key={countryCode} className="flex items-center space-x-2">
                    <Checkbox
                      id={`country-${countryCode}`}
                      checked={selectedCountries.includes(countryCode)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCountries(prev => [...prev, countryCode])
                        } else {
                          setSelectedCountries(prev => prev.filter(c => c !== countryCode))
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`country-${countryCode}`}
                      className="text-sm cursor-pointer flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {getCountryName(countryCode)}
                    </Label>
                  </div>
                ))}
                {selectedCountries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCountries([])}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">{t('holidays.dateFrom')}</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-to">{t('holidays.dateTo')}</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={fetchUpcomingHolidays}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('holidays.preview')}
            </Button>
            
            <Button
              onClick={applyAutoHolidays}
              disabled={isLoading || !autoHolidaysEnabled || selectedMembers.length === 0}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              {selectedMembers.length === 0 
                ? 'Select members first'
                : `${t('holidays.applyHolidays')} (${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''})`
              }
            </Button>
            
            <Button
              onClick={removeAutoHolidays}
              disabled={isLoading || selectedMembers.length === 0}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {selectedMembers.length === 0 
                ? 'Select members first'
                : `${t('holidays.removeHolidays')} (${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''})`
              }
            </Button>
          </div>

          {/* Results */}
          {lastResult && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">
                    {t('holidays.lastUpdate')}: {lastResult.applied_count} {t('holidays.holidaysApplied')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Holidays Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{t('holidays.upcomingHolidays')}</h3>
              <div className="flex gap-2">
                {selectedCountries.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {Object.values(groupedHolidays).flat().length} filtered
                  </Badge>
                )}
                <Badge variant="secondary">
                  {upcomingHolidays.length} {t('holidays.total')}
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                {t('common.loading')}
              </div>
            ) : upcomingHolidays.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupedHolidays).map(([countryCode, holidays]) => (
                    <Card key={countryCode}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {getCountryName(countryCode)}
                          <Badge variant="outline" className="text-xs">
                            {countryCode} - {holidays.length} {t('holidays.total')}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {holidays.map((holiday, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {holiday.member_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{holiday.member_name}</div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(holiday.holiday_date), 'dd MMM yyyy', { locale: dateLocale })} - {holiday.holiday_name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(holiday.current_availability_status)}
                              {holiday.current_availability_status === 'not_set' && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t('holidays.willBeSet')}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                {t('holidays.noUpcoming')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}