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
  changed_by_name?: string
  changed_by_email?: string
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
  const statusMap: { [key: string]: { label: string; color: string } } = {
    available: { 
      label: t('activities.statusAvailable'), 
      color: 'bg-green-500' 
    },
    unavailable: { 
      label: t('activities.statusUnavailable'), 
      color: 'bg-red-500' 
    },
    need_to_check: { 
      label: t('activities.statusNeedToCheck'), 
      color: 'bg-yellow-500' 
    },
    absent: { 
      label: t('activities.statusAbsent'), 
      color: 'bg-gray-500' 
    },
    holiday: { 
      label: t('activities.statusHoliday'), 
      color: 'bg-blue-500' 
    },
    remote: { 
      label: t('activities.statusRemote'), 
      color: 'bg-purple-500' 
    }
  }
  return statusMap[status] || { label: status, color: 'bg-gray-400' }
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
      
      // For now, assume the member made the change themselves (we can enhance this later)
      const enhancedActivities = rawActivities.map((activity: any) => ({
        ...activity,
        changed_by_name: activity.member_name,
        changed_by_email: activity.member_email,
        changed_by_profile_url: activity.profile_image_url
      }))
      
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('activities.period')}
                </span>
                <select 
                  value={daysBack} 
                  onChange={(e) => setDaysBack(parseInt(e.target.value))}
                  className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800"
                >
                  <option value={1}>
                    {t('activities.lastDay')}
                  </option>
                  <option value={3}>
                    {t('activities.last3Days')}
                  </option>
                  <option value={7}>
                    {t('activities.lastWeek')}
                  </option>
                  <option value={14}>
                    {t('activities.last2Weeks')}
                  </option>
                  <option value={30}>
                    {t('activities.lastMonth')}
                  </option>
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
                    <option value="date_changed">
                      {t('activities.sortDateChanged')}
                    </option>
                    <option value="activity_date">
                      {t('activities.sortActivityDate')}
                    </option>
                    <option value="member_name">
                      {t('activities.sortName')}
                    </option>
                    <option value="status">
                      {t('activities.sortStatus')}
                    </option>
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
                    <option value="all">
                      {t('activities.allStatuses')}
                    </option>
                    <option value="available">
                      {t('activities.statusAvailable')}
                    </option>
                    <option value="unavailable">
                      {t('activities.statusUnavailable')}
                    </option>
                    <option value="need_to_check">
                      {t('activities.statusNeedToCheck')}
                    </option>
                    <option value="absent">
                      {t('activities.statusAbsent')}
                    </option>
                    <option value="holiday">
                      {t('activities.statusHoliday')}
                    </option>
                    <option value="remote">
                      {t('activities.statusRemote')}
                    </option>
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
                      const changedByDifferentPerson = activity.changed_by_email !== activity.member_email
                      
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {/* Member Avatar */}
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            {activity.profile_image_url && (
                              <AvatarImage 
                                src={activity.profile_image_url} 
                                alt={`${activity.member_name}'s profile`}
                              />
                            )}
                            <AvatarFallback className="text-xs">
                              {activity.member_name?.charAt(0)?.toUpperCase() || 
                              activity.member_email?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            {/* Header: Member name and activity date */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {activity.member_name || activity.member_email}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(activity.date),  'dd MMM yyyy', { locale: locale === 'nl' ? nl : locale === 'fr' ? fr : enUS })}
                              </div>
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                                <span className="text-xs font-medium">
                                  {statusInfo.label}
                                </span>
                              </div>
                              {isNewRecord && (
                                <Badge variant="secondary" className="text-xs py-0 px-1">
                                  {t('activities.new')}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Changed by info */}
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {changedByDifferentPerson && (
                                <Avatar className="h-4 w-4">
                                  {activity.changed_by_profile_url && (
                                    <AvatarImage src={activity.changed_by_profile_url} />
                                  )}
                                  <AvatarFallback className="text-xs">
                                    {activity.changed_by_name?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <User className="h-3 w-3" />
                              <span>
                                {changedByDifferentPerson 
                                  ? t('activities.changedBy').replace('{name}', activity.changed_by_name || '')
                                  : (isNewRecord 
                                    ? t('activities.setSelf')
                                    : t('activities.changedBySelf')
                                    )
                                }
                              </span>
                              <Clock className="h-3 w-3 ml-1" />
                              <span>
                                {format(new Date(changeDate),  'dd MMM HH:mm', { locale: locale === 'nl' ? nl : locale === 'fr' ? fr : enUS })}
                              </span>
                            </div>
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


