'use client';

// =====================================================
// BUDDY BATTLE - Team Overview Component
// Shows ALL team members with their buddies and availability status
// Like the AvPlanner team view but in retro style
// =====================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRetroSounds } from '@/hooks/use-retro-sounds';
import { supabase } from '@/lib/supabase';
import { RetroButton, RetroProgress } from './ui/retro-button';
import { PixelBuddy } from './buddy-display';
import { ELEMENT_COLORS, BuddyElement } from '@/lib/buddy-battle/types';
import { MemberAvatar } from '@/components/member-avatar';

interface TeamOverviewProps {
  teamId: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
  profile_image_url?: string;
  status: string;
  is_hidden: boolean;
  auth_user_id?: string;
  // Availability status for today
  todayStatus?: 'available' | 'unavailable' | 'need_to_check' | 'absent' | 'holiday' | 'remote' | null;
  // Buddy data (if exists)
  buddy?: {
    id: string;
    member_id: string;
    buddy_type_id: string;
    nickname: string;
    level: number;
    total_xp: number;
    current_hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    speed: number;
    wins: number;
    losses: number;
    buddy_type?: {
      id: string;
      name: string;
      element: string;
      base_color: string;
      secondary_color: string;
      accent_color: string;
    } | null;
  };
}

// Status color and emoji mapping
const STATUS_CONFIG = {
  available: { color: 'bg-green-500', emoji: '🟢', label: 'Beschikbaar' },
  remote: { color: 'bg-purple-500', emoji: '🟣', label: 'Remote' },
  unavailable: { color: 'bg-red-500', emoji: '🔴', label: 'Niet beschikbaar' },
  need_to_check: { color: 'bg-blue-500', emoji: '🔵', label: 'Moet checken' },
  absent: { color: 'bg-gray-500', emoji: '⚫', label: 'Afwezig' },
  holiday: { color: 'bg-yellow-500', emoji: '🟡', label: 'Vakantie' },
} as const;

export function TeamOverview({ teamId }: TeamOverviewProps) {
  const router = useRouter();
  const { sounds } = useRetroSounds();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'level' | 'wins' | 'name' | 'status'>('name');
  const [filterBuddy, setFilterBuddy] = useState<'all' | 'with' | 'without'>('all');
  
  useEffect(() => {
    fetchTeamData();
  }, [teamId]);
  
  async function fetchTeamData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      // Get team name
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();
      
      if (team) {
        setTeamName(team.name);
      }
      
      // Get ALL team members (active, not hidden)
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, first_name, last_name, email, profile_image, profile_image_url, status, is_hidden, auth_user_id')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .eq('is_hidden', false)
        .order('first_name');
      
      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }
      
      console.log('📋 Members found:', members?.length, members?.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
      
      // Get today's date for availability
      const today = new Date().toISOString().split('T')[0];
      console.log('📅 Today:', today);
      
      // Get today's availability for all members
      const memberIds = members?.map(m => m.id) || [];
      const { data: availabilities, error: availError } = await supabase
        .from('availability')
        .select('member_id, status')
        .in('member_id', memberIds)
        .eq('date', today);
      
      console.log('🎯 Availabilities for today:', availabilities, 'Error:', availError);
      
      // Create availability map
      const availabilityMap = new Map(
        availabilities?.map(a => [a.member_id, a.status]) || []
      );
      
      console.log('🗺️ Availability map:', [...availabilityMap.entries()]);
      
      // Get all buddies for this team - simpler query first
      const { data: buddies, error: buddiesError } = await supabase
        .from('player_buddies')
        .select('*')
        .eq('team_id', teamId);
      
      console.log('🐾 Buddies found:', buddies?.length, buddies?.map(b => ({ id: b.id, member_id: b.member_id, nickname: b.nickname })));
      
      if (buddiesError) {
        console.error('Error fetching buddies:', buddiesError);
      }
      
      // Now get buddy types separately
      const { data: buddyTypes } = await supabase
        .from('buddy_types')
        .select('id, name, element, base_color, secondary_color, accent_color');
      
      console.log('🎨 Buddy types found:', buddyTypes?.length, buddyTypes);
      
      // Create buddy type map
      const buddyTypeMap = new Map(
        buddyTypes?.map(bt => [bt.id, bt]) || []
      );
      
      // Create buddy map by member_id with enriched buddy_type data
      const buddyMap = new Map(
        buddies?.map(b => [
          b.member_id, 
          {
            ...b,
            buddy_type: buddyTypeMap.get(b.buddy_type_id) || null
          }
        ]) || []
      );
      
      console.log('🗺️ Buddy map:', [...buddyMap.entries()]);
      
      // Combine members with availability and buddy data
      const combinedMembers: TeamMember[] = (members || []).map(member => {
        const buddy = buddyMap.get(member.id);
        const todayStatus = availabilityMap.get(member.id) as TeamMember['todayStatus'] || null;
        console.log(`👤 ${member.first_name}: status = ${todayStatus}, buddy =`, buddy ? buddy.nickname : 'none');
        return {
          ...member,
          todayStatus,
          buddy: buddy,
        };
      });
      
      setTeamMembers(combinedMembers);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  // Filter members
  const filteredMembers = teamMembers.filter(member => {
    if (filterBuddy === 'with') return !!member.buddy;
    if (filterBuddy === 'without') return !member.buddy;
    return true;
  });
  
  // Sort members
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'level':
        const aLevel = a.buddy?.level || 0;
        const bLevel = b.buddy?.level || 0;
        return bLevel - aLevel || (a.buddy?.total_xp || 0) - (b.buddy?.total_xp || 0);
      case 'wins':
        const aWins = a.buddy?.wins || 0;
        const bWins = b.buddy?.wins || 0;
        return bWins - aWins;
      case 'status':
        // Sort by availability status (available first, then remote, etc)
        const statusOrder = ['available', 'remote', 'need_to_check', 'holiday', 'absent', 'unavailable', null];
        return statusOrder.indexOf(a.todayStatus || null) - statusOrder.indexOf(b.todayStatus || null);
      case 'name':
      default:
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    }
  });
  
  // Stats
  const membersWithBuddy = teamMembers.filter(m => m.buddy).length;
  const membersWithoutBuddy = teamMembers.length - membersWithBuddy;
  const availableToday = teamMembers.filter(m => m.todayStatus === 'available' || m.todayStatus === 'remote').length;
  
  if (loading) {
    return (
      <div className="buddy-battle-container min-h-screen flex items-center justify-center">
        <div className="scanlines" />
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading Team...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="buddy-battle-container min-h-screen p-4">
      <div className="scanlines" />
      
      {/* Header */}
      <header className="mb-6">
        <h1 className="retro-title text-center mb-2">👥 TEAM OVERZICHT 👥</h1>
        <p className="retro-text text-center text-gb-light-green">
          {teamName}
        </p>
        <p className="retro-text text-center text-xs text-gb-dark-green mt-1">
          {teamMembers.length} Leden • {membersWithBuddy} met Buddy • {availableToday} Beschikbaar vandaag
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto">
        {/* Filters & Sort Options */}
        <div className="retro-panel p-3 mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="retro-text text-sm">Filter:</span>
              <button
                className={`retro-btn text-xs ${filterBuddy === 'all' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setFilterBuddy('all'); }}
              >
                Alle ({teamMembers.length})
              </button>
              <button
                className={`retro-btn text-xs ${filterBuddy === 'with' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setFilterBuddy('with'); }}
              >
                Met Buddy ({membersWithBuddy})
              </button>
              <button
                className={`retro-btn text-xs ${filterBuddy === 'without' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setFilterBuddy('without'); }}
              >
                Zonder ({membersWithoutBuddy})
              </button>
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="retro-text text-sm">Sort:</span>
              <button
                className={`retro-btn text-xs ${sortBy === 'name' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setSortBy('name'); }}
              >
                Naam
              </button>
              <button
                className={`retro-btn text-xs ${sortBy === 'status' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setSortBy('status'); }}
              >
                Status
              </button>
              <button
                className={`retro-btn text-xs ${sortBy === 'level' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setSortBy('level'); }}
              >
                Level
              </button>
              <button
                className={`retro-btn text-xs ${sortBy === 'wins' ? 'retro-btn-primary' : ''}`}
                onClick={() => { sounds.select(); setSortBy('wins'); }}
              >
                Wins
              </button>
            </div>
          </div>
        </div>
        
        {/* Team Members Grid */}
        {sortedMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedMembers.map((member) => {
              const isCurrentUser = member.auth_user_id === currentUserId;
              const statusConfig = member.todayStatus ? STATUS_CONFIG[member.todayStatus] : null;
              const buddy = member.buddy;
              const buddyType = buddy?.buddy_type;
              const elementColor = buddyType?.element 
                ? (ELEMENT_COLORS[buddyType.element as BuddyElement] || '#0984e3')
                : '#666';
              
              return (
                <div 
                  key={member.id}
                  className={`retro-panel p-3 ${isCurrentUser ? 'ring-2 ring-retro-yellow' : ''}`}
                >
                  <div className="flex gap-3">
                    {/* Left Column: Avatar + Buddy */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      {/* Member Avatar with Status Indicator - using shared component */}
                      <div className="relative">
                        <MemberAvatar
                          firstName={member.first_name}
                          lastName={member.last_name}
                          profileImage={member.profile_image_url || member.profile_image}
                          size="lg"
                          statusIndicator={{
                            show: false  // We render our own status dot below
                          }}
                          locale="nl"
                          memberId={member.id}
                          teamId={teamId}
                          email={member.email}
                        />
                        {/* Custom status dot for retro UI - bigger and with black border */}
                        <div 
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
                            member.todayStatus && STATUS_CONFIG[member.todayStatus] 
                              ? STATUS_CONFIG[member.todayStatus].color 
                              : 'bg-gray-500'
                          }`}
                          title={member.todayStatus && STATUS_CONFIG[member.todayStatus] 
                            ? STATUS_CONFIG[member.todayStatus].label 
                            : 'Geen status'}
                        />
                      </div>
                      
                      {/* Buddy Mini Preview */}
                      {buddy && buddyType && (
                        <div 
                          className="w-12 h-12"
                          style={{ 
                            background: `linear-gradient(180deg, ${elementColor}30 0%, transparent 100%)`,
                            borderRadius: '4px'
                          }}
                        >
                          <PixelBuddy
                            type={buddyType.name || 'unknown'}
                            primaryColor={buddyType.base_color || elementColor}
                            secondaryColor={buddyType.secondary_color || '#fff'}
                            accentColor={buddyType.accent_color || '#333'}
                            element={buddyType.element || 'neutral'}
                          />
                        </div>
                      )}
                      {buddy && !buddyType && (
                        <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-xl">🐾</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column: Info */}
                    <div className="flex-1 min-w-0">
                      {/* Member Name Row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="retro-text text-sm font-bold truncate">
                          {member.first_name} {member.last_name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-retro-yellow text-black px-1 rounded flex-shrink-0">JIJ</span>
                        )}
                      </div>
                      
                      {/* Buddy Info or No Buddy */}
                      {buddy ? (
                        <div className="space-y-1">
                          {/* Buddy Name & Element */}
                          <div className="flex items-center gap-2">
                            <span className="retro-text text-retro-lime text-xs truncate">
                              {buddy.nickname || buddyType?.name || 'Buddy'}
                            </span>
                            {buddyType?.element && (
                              <span 
                                className="text-xs px-1 py-0.5 rounded text-white"
                                style={{ backgroundColor: elementColor }}
                              >
                                {buddyType.element}
                              </span>
                            )}
                          </div>
                          
                          <p className="retro-text text-xs text-gb-dark-green">
                            Lv.{buddy.level || 1} • {buddy.total_xp || 0} XP
                          </p>
                          
                          {/* HP Bar - compact */}
                          <div className="h-2 bg-gray-700 rounded overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-green-400"
                              style={{ width: `${((buddy.current_hp || 0) / (buddy.max_hp || 100)) * 100}%` }}
                            />
                          </div>
                          
                          {/* Quick Stats Row */}
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-400">W:{buddy.wins || 0}</span>
                            <span className="text-red-400">L:{buddy.losses || 0}</span>
                            <span className="text-gray-400">⚔️{buddy.attack || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <span className="text-xl">🥚</span>
                          <span className="retro-text text-xs text-gb-dark-green">
                            Nog geen Buddy
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="retro-panel p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="retro-text text-gb-light-green mb-2">
              Geen teamleden gevonden
            </p>
            <p className="retro-text text-sm">
              Probeer een ander filter.
            </p>
          </div>
        )}
        
        {/* Team Stats Summary */}
        {teamMembers.length > 0 && (
          <div className="retro-panel p-4 mt-6">
            <h3 className="retro-text-lg text-center mb-4 text-retro-lime">📊 Team Statistieken</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="retro-text text-2xl text-retro-yellow">
                  {teamMembers.length}
                </p>
                <p className="retro-text text-xs">Teamleden</p>
              </div>
              <div>
                <p className="retro-text text-2xl text-retro-lime">
                  {membersWithBuddy}
                </p>
                <p className="retro-text text-xs">Met Buddy</p>
              </div>
              <div>
                <p className="retro-text text-2xl text-retro-yellow">
                  {availableToday}
                </p>
                <p className="retro-text text-xs">Beschikbaar</p>
              </div>
              <div>
                <p className="retro-text text-2xl text-retro-lime">
                  {membersWithBuddy > 0 
                    ? Math.round(teamMembers.filter(m => m.buddy).reduce((sum, m) => sum + (m.buddy?.level || 0), 0) / membersWithBuddy)
                    : 0
                  }
                </p>
                <p className="retro-text text-xs">Gem. Level</p>
              </div>
            </div>
            
            {/* Availability breakdown */}
            <div className="border-t border-gb-dark-green mt-4 pt-4">
              <p className="retro-text text-sm text-center mb-2">Beschikbaarheid Vandaag:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const count = teamMembers.filter(m => m.todayStatus === key).length;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-1">
                      <span>{config.emoji}</span>
                      <span className="retro-text text-xs">{count}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1">
                  <span>❔</span>
                  <span className="retro-text text-xs">
                    {teamMembers.filter(m => !m.todayStatus).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Back Button */}
        <div className="text-center mt-6">
          <RetroButton onClick={() => {
            sounds.cancel();
            router.push(`/team/${teamId}/buddy`);
          }}>
            ← Terug naar Menu
          </RetroButton>
        </div>
      </div>
    </div>
  );
}
