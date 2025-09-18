"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export interface TodayAvailability {
  [memberId: string]: "available" | "unavailable" | "need_to_check" | "absent" | "holiday" | "remote" | undefined
}

export function useTodayAvailability(memberIds: string[] = []) {
  const [todayAvailability, setTodayAvailability] = useState<TodayAvailability>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState<string>('')

  useEffect(() => {
    if (memberIds.length === 0) return

    // Only refetch if memberIds changed significantly or it's a new day
    const today = new Date().toISOString().split('T')[0]
    if (lastFetch !== today || Object.keys(todayAvailability).length === 0) {
      fetchTodayAvailability()
      setLastFetch(today)
    }
  }, [memberIds])

  const fetchTodayAvailability = async () => {
    if (memberIds.length === 0) return

    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('availability')
        .select('member_id, status')
        .eq('date', today)
        .in('member_id', memberIds)

      if (error) throw error

      const todayStatuses: TodayAvailability = {}
      
      // Initialize all members as undefined
      memberIds.forEach(id => {
        todayStatuses[id] = undefined
      })
      
      // Set actual statuses for members who have availability set
      data?.forEach(item => {
        todayStatuses[item.member_id] = item.status
      })
      
      setTodayAvailability(todayStatuses)
    } catch (error) {
      console.error('Error fetching today availability:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = () => {
    fetchTodayAvailability()
  }

  return {
    todayAvailability,
    isLoading,
    refresh
  }
}
