'use client';

// =====================================================
// BUDDY BATTLE - Admin Dashboard Component
// Analytics and moderation for team administrators
// =====================================================

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '@/styles/buddy-battle.css';

import { RetroButton, RetroTabs, RetroProgress, RetroBadge, RetroCard } from './ui/retro-button';
import type { BuddyElement } from '@/lib/buddy-battle/types';
import { ELEMENT_COLORS } from '@/lib/buddy-battle/types';

interface DashboardStats {
  total_players: number;
  active_today: number;
  total_battles: number;
  total_points_distributed: number;
  boss_defeats: number;
  average_level: number;
  most_popular_element: BuddyElement;
  top_streaker: { name: string; days: number };
}

interface PlayerStats {
  user_id: string;
  trainer_name: string;
  buddy_name: string;
  element: BuddyElement;
  level: number;
  total_points: number;
  battles_won: number;
  streak_days: number;
  last_active: string;
  anxiety_level: number;
}

interface DailyAnalytics {
  date: string;
  active_users: number;
  points_earned: number;
  battles_fought: number;
  quests_completed: number;
}

export function AdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch(`/api/buddy-battle/admin?teamId=${teamId}`, { credentials: 'include' });
        const data = await response.json();
        
        setStats(data.stats);
        setPlayers(data.players || []);
        setAnalytics(data.analytics || []);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboard();
  }, [teamId]);
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
    });
  };
  
  if (loading) {
    return (
      <div className="buddy-battle-container flex items-center justify-center min-h-screen">
        <div className="retro-panel p-8">
          <div className="retro-loading mx-auto mb-4" />
          <p className="retro-text text-center">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="buddy-battle-container min-h-screen p-4">
      <div className="scanlines" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="retro-title">Admin Dashboard</h1>
            <p className="retro-text text-xs text-retro-gray">
              Buddy Battle Analytics & Management
            </p>
          </div>
          
          <RetroButton 
            onClick={() => router.push(`/team/${teamId}/buddy`)}
            variant="default"
            size="small"
          >
            ← Back to Game
          </RetroButton>
        </div>
        
        {/* Tabs */}
        <RetroTabs 
          tabs={[
            { id: 'overview', label: '📊 Overview' },
            { id: 'players', label: '👥 Players' },
            { id: 'analytics', label: '📈 Analytics' },
            { id: 'settings', label: '⚙️ Settings' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Total Players</p>
                <p className="retro-text-lg text-retro-lime">{stats.total_players}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Active Today</p>
                <p className="retro-text-lg text-retro-blue">{stats.active_today}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Total Battles</p>
                <p className="retro-text-lg text-retro-yellow">{stats.total_battles}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Boss Defeats</p>
                <p className="retro-text-lg text-retro-red">{stats.boss_defeats}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Points Distributed</p>
                <p className="retro-text-lg">✨ {stats.total_points_distributed}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Avg Level</p>
                <p className="retro-text-lg">{stats.average_level.toFixed(1)}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Popular Element</p>
                <div 
                  className="inline-block w-8 h-8 rounded mt-1"
                  style={{ backgroundColor: ELEMENT_COLORS[stats.most_popular_element] }}
                />
                <p className="retro-text text-xs mt-1">{stats.most_popular_element}</p>
              </div>
            </RetroCard>
            
            <RetroCard>
              <div className="text-center">
                <p className="retro-text text-xs text-retro-gray">Top Streak</p>
                <p className="retro-text-lg">🔥 {stats.top_streaker.days}</p>
                <p className="retro-text text-xxs text-retro-gray">{stats.top_streaker.name}</p>
              </div>
            </RetroCard>
          </div>
        )}
        
        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="mt-6">
            <div className="retro-panel overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-retro-gray">
                    <th className="retro-text text-xs text-left p-2">Trainer</th>
                    <th className="retro-text text-xs text-left p-2">Buddy</th>
                    <th className="retro-text text-xs text-center p-2">Element</th>
                    <th className="retro-text text-xs text-center p-2">Level</th>
                    <th className="retro-text text-xs text-center p-2">Points</th>
                    <th className="retro-text text-xs text-center p-2">Battles</th>
                    <th className="retro-text text-xs text-center p-2">Streak</th>
                    <th className="retro-text text-xs text-center p-2">Anxiety</th>
                    <th className="retro-text text-xs text-center p-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.user_id} className="border-b border-retro-gray/30">
                      <td className="retro-text text-xs p-2">{player.trainer_name}</td>
                      <td className="retro-text text-xs p-2">{player.buddy_name}</td>
                      <td className="p-2 text-center">
                        <span 
                          className="inline-block w-4 h-4 rounded"
                          style={{ backgroundColor: ELEMENT_COLORS[player.element] }}
                        />
                      </td>
                      <td className="retro-text text-xs text-center p-2">{player.level}</td>
                      <td className="retro-text text-xs text-center p-2 text-retro-lime">
                        {player.total_points}
                      </td>
                      <td className="retro-text text-xs text-center p-2">{player.battles_won}</td>
                      <td className="retro-text text-xs text-center p-2">
                        {player.streak_days > 0 ? `🔥 ${player.streak_days}` : '-'}
                      </td>
                      <td className="p-2">
                        <RetroProgress 
                          value={player.anxiety_level}
                          max={100}
                          label=""
                          variant={player.anxiety_level > 50 ? 'hp' : 'default'}
                        />
                      </td>
                      <td className="retro-text text-xs text-center p-2 text-retro-gray">
                        {formatDate(player.last_active)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {players.length === 0 && (
                <div className="text-center py-8">
                  <p className="retro-text text-retro-gray">No players yet</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="mt-6 space-y-4">
            <div className="retro-panel p-4">
              <h3 className="retro-text-lg mb-4">Daily Activity (Last 14 Days)</h3>
              
              <div className="space-y-2">
                {analytics.slice(0, 14).map(day => (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="retro-text text-xs w-16">{formatDate(day.date)}</span>
                    
                    <div className="flex-1">
                      <div className="flex gap-2 items-center">
                        <span className="retro-text text-xxs w-12">Users:</span>
                        <div className="flex-1 h-3 bg-gb-dark rounded overflow-hidden">
                          <div 
                            className="h-full bg-retro-blue"
                            style={{ 
                              width: `${(day.active_users / (stats?.total_players || 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="retro-text text-xxs w-8">{day.active_users}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="retro-text text-xxs text-retro-lime">
                        +{day.points_earned} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="retro-panel p-4">
                <h3 className="retro-text-lg mb-4">Engagement Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <p className="retro-text text-xs text-retro-gray">Daily Active Rate</p>
                    <p className="retro-text-lg">
                      {stats && stats.total_players > 0 
                        ? ((stats.active_today / stats.total_players) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="retro-text text-xs text-retro-gray">Battles Per Player</p>
                    <p className="retro-text-lg">
                      {stats && stats.total_players > 0 
                        ? (stats.total_battles / stats.total_players).toFixed(1)
                        : 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="retro-panel p-4">
                <h3 className="retro-text-lg mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <RetroButton variant="default" size="small" className="w-full">
                    🔄 Refresh Shop Items
                  </RetroButton>
                  <RetroButton variant="default" size="small" className="w-full">
                    🎁 Send Team Bonus
                  </RetroButton>
                  <RetroButton variant="default" size="small" className="w-full">
                    📢 Broadcast Message
                  </RetroButton>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="mt-6 space-y-4">
            <div className="retro-panel p-4">
              <h3 className="retro-text-lg mb-4">Game Settings</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="retro-text">Buddy Battle Enabled</p>
                    <p className="retro-text text-xs text-retro-gray">
                      Enable/disable the gamification system
                    </p>
                  </div>
                  <RetroButton variant="primary" size="small">
                    Enabled
                  </RetroButton>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="retro-text">Points per Availability</p>
                    <p className="retro-text text-xs text-retro-gray">
                      Points earned per filled day
                    </p>
                  </div>
                  <span className="retro-text text-retro-lime">1 pt</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="retro-text">Holiday Bonus</p>
                    <p className="retro-text text-xs text-retro-gray">
                      Extra points on holidays
                    </p>
                  </div>
                  <span className="retro-text text-retro-lime">+1 pt</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="retro-text">Boss Battle Schedule</p>
                    <p className="retro-text text-xs text-retro-gray">
                      Quarterly boss Marie-Françoise
                    </p>
                  </div>
                  <span className="retro-text text-retro-yellow">Q1, Q2, Q3, Q4</span>
                </div>
              </div>
            </div>
            
            <div className="retro-panel p-4">
              <h3 className="retro-text-lg mb-4 text-retro-red">Danger Zone</h3>
              
              <div className="space-y-2">
                <RetroButton variant="danger" size="small">
                  Reset All Player Progress
                </RetroButton>
                <p className="retro-text text-xxs text-retro-gray">
                  This will reset all buddies, points, and achievements. Cannot be undone.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
