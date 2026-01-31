// =====================================================
// BUDDY BATTLE - Buddy Types API
// GET: Fetch available buddy types for selection
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

// Static buddy types data
const BUDDY_TYPES = [
  {
    id: 'blazor',
    name: 'Blazor',
    element: 'fire',
    description: 'A fiery companion with explosive attack power. Strong against Air, weak against Water.',
    base_stats: {
      hp: 85,
      attack: 95,
      defense: 70,
      speed: 85,
      critical: 15,
    },
    sprite_color: '#ef4444', // red
    abilities: ['Flame Strike', 'Ember Shield', 'Inferno Burst'],
    personality: 'Passionate and determined. Never backs down from a challenge.',
    lore: 'Born from the eternal flames of the Planning Forge, Blazor embodies the burning dedication of consistent availability.',
  },
  {
    id: 'aquabit',
    name: 'Aquabit',
    element: 'water',
    description: 'A fluid defender with excellent survivability. Strong against Fire, weak against Electric.',
    base_stats: {
      hp: 100,
      attack: 75,
      defense: 90,
      speed: 70,
      critical: 12,
    },
    sprite_color: '#3b82f6', // blue
    abilities: ['Tidal Wave', 'Aqua Barrier', 'Healing Rain'],
    personality: 'Calm and adaptable. Flows around obstacles with grace.',
    lore: 'Emerged from the depths of the Schedule Sea, Aquabit represents the flexibility needed in team planning.',
  },
  {
    id: 'terrapix',
    name: 'Terrapix',
    element: 'earth',
    description: 'A sturdy tank with unbreakable defenses. Strong against Electric, weak against Air.',
    base_stats: {
      hp: 120,
      attack: 80,
      defense: 100,
      speed: 50,
      critical: 10,
    },
    sprite_color: '#84cc16', // lime
    abilities: ['Earthquake', 'Stone Wall', 'Nature\'s Blessing'],
    personality: 'Patient and reliable. A steady presence in any team.',
    lore: 'Carved from the Foundation Mountains, Terrapix symbolizes the solid reliability of dependable teammates.',
  },
  {
    id: 'zephyron',
    name: 'Zephyron',
    element: 'air',
    description: 'A swift attacker that strikes before others can react. Strong against Earth, weak against Fire.',
    base_stats: {
      hp: 70,
      attack: 85,
      defense: 60,
      speed: 110,
      critical: 20,
    },
    sprite_color: '#06b6d4', // cyan
    abilities: ['Gust Slash', 'Wind Barrier', 'Tornado Strike'],
    personality: 'Free-spirited and unpredictable. Always one step ahead.',
    lore: 'Born from the Winds of Change, Zephyron embodies the agility needed to adapt to shifting schedules.',
  },
  {
    id: 'voltling',
    name: 'Voltling',
    element: 'electric',
    description: 'A balanced fighter with shocking critical hits. Strong against Water, weak against Earth.',
    base_stats: {
      hp: 80,
      attack: 90,
      defense: 75,
      speed: 95,
      critical: 25,
    },
    sprite_color: '#eab308', // yellow
    abilities: ['Thunder Bolt', 'Static Shield', 'Lightning Chain'],
    personality: 'Energetic and enthusiastic. Brings excitement to every battle.',
    lore: 'Sparked to life in the Storm of Productivity, Voltling represents the electric energy of engaged team members.',
  },
];

// Element advantage chart
const ELEMENT_CHART = {
  fire: { strong: 'air', weak: 'water' },
  water: { strong: 'fire', weak: 'electric' },
  earth: { strong: 'electric', weak: 'air' },
  air: { strong: 'earth', weak: 'fire' },
  electric: { strong: 'water', weak: 'earth' },
};

export async function GET(request: NextRequest) {
  try {
    // Return all buddy types with their details
    return NextResponse.json({
      buddy_types: BUDDY_TYPES,
      element_chart: ELEMENT_CHART,
      total_types: BUDDY_TYPES.length,
    });
    
  } catch (error) {
    console.error('Buddy types error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
