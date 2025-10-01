'use client'

import { useEffect, useState } from 'react'
import { useTranslation, type Locale } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar, Clock, Filter, Search, X, ChevronDown, User, Activity, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { nl, enUS, fr } from 'date-fns/locale'

interface ActivityItem {
  idx: number
  id: string
  member_id: string
  member_name: string
  member_email: string
  profile_image_url: string | null
  date: string
  status: string
  created_at: string
  updated_at: string | null
  auto_holiday?: boolean // Whether this is an auto-applied holiday
  changed_by_id?: string | null // Who made the change (null if self-change)
  changed_by_name?: string | null
  changed_by_email?: string | null
  changed_by_profile_url?: string | null
}

type SortOption = 'date_changed' | 'activity_date' | 'member_name' | 'status'
type StatusFilter = 'all' | 'available' | 'unavailable' | 'need_to_check' | 'absent' | 'holiday' | 'remote'

interface TeamActivitiesProps {
  teamId: string
  isVisible?: boolean
  locale?: Locale
}

const getStatusDisplayName = (status: string, t: any) => {
  const statusMap: { [key: string]: { label: string; color: string; emoji: string } } = {
    available: { 
      label: t('activities.statusAvailable'), 
      color: 'bg-green-500',
      emoji: '✅' 
    },
    unavailable: { 
      label: t('activities.statusUnavailable'), 
      color: 'bg-red-500',
      emoji: '❌'
    },
    need_to_check: { 
      label: t('activities.statusNeedToCheck'), 
      color: 'bg-yellow-500',
      emoji: '❓'
    },
    absent: { 
      label: t('activities.statusAbsent'), 
      color: 'bg-gray-500',
      emoji: '⚫'
    },
    holiday: { 
      label: t('activities.statusHoliday'), 
      color: 'bg-yellow-500',
      emoji: '🌴'
    },
    remote: { 
      label: t('activities.statusRemote'), 
      color: 'bg-purple-500',
      emoji: '🏠'
    }
  }
  return statusMap[status] || { label: status, color: 'bg-gray-400', emoji: '❔' }
}

export function TeamActivities({ teamId, isVisible = true, locale = "en" }: TeamActivitiesProps) {
  const { t } = useTranslation(locale)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [daysBack, setDaysBack] = useState(7)
  
  // Sort and filter state
  const [sortBy, setSortBy] = useState<SortOption>('date_changed')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [memberFilter, setMemberFilter] = useState<string>('')

  const fetchActivities = async () => {
    if (!teamId || !isVisible) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/teams/activities?teamId=${teamId}&daysBack=${daysBack}&limit=50`)
      
      if (!response.ok) {
        const errorText = await response.text()
        
        if (response.status === 403) {
          throw new Error(t('activities.errorNoAccess'))
        }
        if (response.status === 401) {
          throw new Error(t('activities.errorNotLoggedIn'))
        }
        throw new Error(t('activities.errorGeneric').replace('{status}', response.status.toString()).replace('{message}', errorText))
      }

      const data = await response.json()
      const rawActivities = data.activities || []
      
      // Use the activities as returned by the API (already includes correct changed_by info)
      const enhancedActivities = rawActivities
      
      console.log('🔍 Team Activities Debug - Raw activities:', rawActivities.length)
      console.log('🔍 Sample activity:', enhancedActivities[0])
      console.log('🖼️ Profile URLs check:', enhancedActivities.slice(0,3).map((a: any) => ({
        member: a.member_name,
        memberImg: a.profile_image_url,
        changerImg: a.changed_by_profile_url
      })))
      
      setActivities(enhancedActivities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  // Sort and filter function
  const applyFiltersAndSort = () => {
    let filtered = [...activities]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter)
    }

    // Apply member filter
    if (memberFilter.trim()) {
      const filterLower = memberFilter.toLowerCase().trim()
      filtered = filtered.filter(activity => 
        activity.member_name.toLowerCase().includes(filterLower) ||
        activity.member_email.toLowerCase().includes(filterLower)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'date_changed':
          aValue = new Date(a.updated_at || a.created_at).getTime()
          bValue = new Date(b.updated_at || b.created_at).getTime()
          break
        case 'activity_date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'member_name':
          aValue = a.member_name.toLowerCase()
          bValue = b.member_name.toLowerCase()
          break
        case 'status':
          aValue = a.status.toLowerCase()
          bValue = b.status.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredActivities(filtered)
  }

  useEffect(() => {
    if (isVisible) {
      fetchActivities()
    }
  }, [teamId, isVisible, daysBack])

  // Apply filters and sorting when activities or filter/sort options change
  useEffect(() => {
    applyFiltersAndSort()
  }, [activities, sortBy, sortDirection, statusFilter, memberFilter])

  if (!isVisible) return null

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>
                  {t('activities.recentAvailability')}
                </span>
                {activities.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activities.length}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-4 mb-4">
              {/* Period and Refresh */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('activities.period')}
                </span>
                <select 
                  value={daysBack} 
                  onChange={(e) => setDaysBack(parseInt(e.target.value))}
                  className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value={1}>{t('activities.lastDay')}</option>
                  <option value={3}>{t('activities.last3Days')}</option>
                  <option value={7}>{t('activities.lastWeek')}</option>
                  <option value={14}>{t('activities.last2Weeks')}</option>
                  <option value={30}>{t('activities.lastMonth')}</option>
                </select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchActivities}
                  className="ml-2"
                >
                  {t('activities.refresh')}
                </Button>
              </div>

              {/* Sorting and Filtering */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {/* Sort by */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {t('activities.sortBy')}
                  </span>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-800 flex-1"
                  >
                    <option value="date_changed">{t('activities.sortDateChanged')}</option>
                    <option value="activity_date">{t('activities.sortActivityDate')}</option>
                    <option value="member_name">{t('activities.sortName')}</option>
                    <option value="status">{t('activities.sortStatus')}</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="p-1 h-auto"
                  >
                    {sortDirection === 'desc' ? '↓' : '↑'}
                  </Button>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {t('activities.status')}
                  </span>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-800 flex-1"
                  >
                    <option value="all">{t('activities.allStatuses')}</option>
                    <option value="available">{t('activities.statusAvailable')}</option>
                    <option value="unavailable">{t('activities.statusUnavailable')}</option>
                    <option value="need_to_check">{t('activities.statusNeedToCheck')}</option>
                    <option value="absent">{t('activities.statusAbsent')}</option>
                    <option value="holiday">{t('activities.statusHoliday')}</option>
                    <option value="remote">{t('activities.statusRemote')}</option>
                  </select>
                </div>

                {/* Member filter */}
                <div className="flex items-center gap-2 md:col-span-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {t('activities.searchName')}
                  </span>
                  <input
                    type="text"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    placeholder={t('activities.typeNameOrEmail')}
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-800 flex-1"
                  />
                  {memberFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMemberFilter('')}
                      className="p-1 h-auto text-xs"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {filteredActivities.length} {t('activities.of')} {activities.length} {t('activities.items')}
                  {(statusFilter !== 'all' || memberFilter.trim()) && (
                    <> ({t('activities.filtered')})</>
                  )}
                </span>
                {(statusFilter !== 'all' || memberFilter.trim()) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter('all')
                      setMemberFilter('')
                    }}
                    className="text-xs p-1 h-auto"
                  >
                    {t('activities.clearFilters')}
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('activities.loading')}
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchActivities}
                  className="mt-2"
                >
                  {t('activities.tryAgain')}
                </Button>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {activities.length === 0 ? (
                  <>
                    <p className="text-sm">
                      {t('activities.noRecent')}
                    </p>
                    <p className="text-xs mt-1">
                      {t('activities.recentHelp')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">
                      {t('activities.noResultsForFilters')}
                    </p>
                    <p className="text-xs mt-1">
                      {t('activities.tryAdjustingFilters')}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {t('activities.noActivitiesFound')}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t('activities.tryAdjustingFilters')}
                      </p>
                    </div>
                  ) : (
                    filteredActivities.map((activity) => {
                      const statusInfo = getStatusDisplayName(activity.status, t)
                      const changeDate = activity.updated_at || activity.created_at
                      const isNewRecord = !activity.updated_at
                      const changedByDifferentPerson = activity.auto_holiday || (activity.changed_by_id != null && activity.changed_by_id !== activity.member_id)
                      
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all"
                        >
                          {/* Member Avatar with Status Indicator */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              {activity.profile_image_url && (
                                <AvatarImage 
                                  src={activity.profile_image_url} 
                                  alt={`${activity.member_name}'s profile`}
                                />
                              )}
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                                {activity.member_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                                activity.member_email?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {/* Status badge on avatar */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-white flex items-center justify-center shadow-sm">
                              <span className="text-xs">
                                {statusInfo.emoji}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Main Activity Description */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  {changedByDifferentPerson ? (
                                    <>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                                        {activity.changed_by_name === 'System' ? t('activities.system') : (activity.changed_by_name || t('activities.unknown'))}
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('activities.changedAvailabilityFor')}
                                      </span>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {activity.member_name || activity.member_email?.split('@')[0]}
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('activities.to')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {activity.member_name || activity.member_email?.split('@')[0]}
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('activities.hasChangedAvailabilityTo')}
                                      </span>
                                    </>
                                  )}
                                  {isNewRecord && (
                                    <Badge variant="secondary" className="text-xs py-0 px-2">
                                      {t('activities.new')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Date and Time Info */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{t('activities.forDate')} {format(new Date(activity.date), 'dd MMM yyyy', { locale: locale === 'nl' ? nl : locale === 'fr' ? fr : enUS })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {isNewRecord ? t('activities.setOn') : t('activities.changedOn')} {format(new Date(changeDate), 'dd MMM HH:mm', { locale: locale === 'nl' ? nl : locale === 'fr' ? fr : enUS })}
                                </span>
                              </div>
                            </div>

                            {/* Show who made the change when it's different from the member */}
                            {changedByDifferentPerson && (
                              <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                <Avatar className="h-4 w-4">
                                  {activity.changed_by_profile_url && (
                                    <AvatarImage src={activity.changed_by_profile_url} />
                                  )}
                                  <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200">
                                    {activity.changed_by_name?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{t('activities.changedBy')} {activity.changed_by_name === 'System' ? t('activities.system') : (activity.changed_by_name || t('activities.unknown'))}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}


