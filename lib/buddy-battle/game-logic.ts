// =====================================================
// BUDDY BATTLE - GAME LOGIC
// Core game mechanics, formulas, and calculations
// =====================================================

import {
  BuddyElement,
  PlayerBuddy,
  BattleBuddyState,
  BuddyAbility,
  ActiveEffect,
  StatType,
  UpgradeCost,
  GAME_CONSTANTS,
  ELEMENT_ADVANTAGES,
  NPCBoss,
  TUTORIAL_BOSS,
  QUARTERLY_BOSS,
} from './types';

// ===================
// LEVEL & XP SYSTEM
// ===================

/**
 * Calculate XP needed to reach a specific level
 * Formula: level * 10 + (level-1) * 5
 * Level 1: 10 XP, Level 2: 25 XP, Level 100: 1495 XP
 * Total XP to level 100: ~75,000 XP (about 200 days of good play)
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return level * 10 + (level - 1) * 5;
}

/**
 * Calculate total XP needed from level 1 to target level
 */
export function getTotalXPForLevel(targetLevel: number): number {
  let total = 0;
  for (let i = 2; i <= targetLevel; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number } {
  let level = 1;
  let xpRemaining = totalXP;
  
  while (level < GAME_CONSTANTS.MAX_LEVEL) {
    const xpNeeded = getXPForLevel(level + 1);
    if (xpRemaining < xpNeeded) {
      break;
    }
    xpRemaining -= xpNeeded;
    level++;
  }
  
  return {
    level,
    currentLevelXP: xpRemaining,
    nextLevelXP: level >= GAME_CONSTANTS.MAX_LEVEL ? 0 : getXPForLevel(level + 1),
  };
}

/**
 * Calculate XP reward from a battle
 * Tutorial battles give a bonus to help new players progress
 */
export function calculateBattleXP(
  opponentLevel: number,
  playerLevel: number,
  isVictory: boolean,
  isBoss: boolean = false,
  isTutorial: boolean = false
): number {
  if (!isVictory) return Math.floor(opponentLevel * 0.5); // Participation XP
  
  let baseXP = opponentLevel * 3;
  
  // Tutorial bonus - first few battles give more XP to kickstart progression
  if (isTutorial) {
    baseXP = Math.max(baseXP, 15); // Minimum 15 XP for tutorial win
  }
  
  // Level difference modifier
  const levelDiff = opponentLevel - playerLevel;
  if (levelDiff > 0) {
    baseXP *= 1 + (levelDiff * 0.1); // Bonus for fighting stronger opponents
  } else if (levelDiff < -10) {
    baseXP *= 0.5; // Reduced XP for very weak opponents
  }
  
  // Boss multiplier
  if (isBoss) {
    baseXP *= 2;
  }
  
  return Math.floor(baseXP);
}

// ===================
// POINT SYSTEM
// ===================

/**
 * Check if a date is a holiday for a given country
 */
export function isHoliday(date: Date, holidays: { date: string }[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(h => h.date === dateStr);
}

/**
 * Calculate points earned for a specific date
 */
export function calculatePointsForDate(
  hasAvailability: boolean,
  isHolidayDate: boolean
): number {
  if (!hasAvailability) return 0;
  return isHolidayDate ? GAME_CONSTANTS.HOLIDAY_POINT_VALUE : GAME_CONSTANTS.DAILY_POINT_VALUE;
}

/**
 * Calculate points for a date range
 */
export function calculatePointsForRange(
  availabilities: { date: string; status: string }[],
  holidays: { date: string }[],
  startDate: Date,
  endDate: Date
): { total: number; breakdown: { date: string; points: number; isHoliday: boolean }[] } {
  const breakdown: { date: string; points: number; isHoliday: boolean }[] = [];
  let total = 0;
  
  const validStatuses = ['available', 'remote', 'holiday'];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const availability = availabilities.find(a => a.date === dateStr);
    const hasValidAvailability = availability && validStatuses.includes(availability.status);
    const isHolidayDate = isHoliday(current, holidays);
    
    const points = hasValidAvailability ? (isHolidayDate ? 2 : 1) : 0;
    
    breakdown.push({
      date: dateStr,
      points,
      isHoliday: isHolidayDate,
    });
    
    total += points;
    current.setDate(current.getDate() + 1);
  }
  
  return { total, breakdown };
}

// ===================
// STAT UPGRADES
// ===================

/**
 * Calculate stat cap based on level
 * Level 1 buddies start with ~8-12 in most stats, ~18-25 HP
 * Stats can be upgraded within the cap for the current level
 */
export function getStatCap(level: number, statType: StatType): number {
  switch (statType) {
    case 'hp':
      // Level 1: 30, Level 50: 150, Level 100: 300
      return 30 + Math.floor(level * 2.7);
    case 'critical_chance':
      // Level 1: 10%, Level 100: 50%
      return Math.min(50, 10 + Math.floor(level * 0.4));
    default:
      // Level 1: 15, Level 50: 65, Level 100: 115
      return 15 + level;
  }
}

/**
 * Calculate upgrade cost for a stat
 */
export function calculateUpgradeCost(
  currentValue: number,
  statType: StatType,
  level: number
): UpgradeCost {
  const maxValue = getStatCap(level, statType);
  const isMaxed = currentValue >= maxValue;
  
  // Cost increases with current value
  let baseCost: number;
  if (statType === 'critical_chance') {
    baseCost = Math.ceil(currentValue / 5); // 1 point per 5% crit
  } else if (statType === 'hp') {
    baseCost = Math.ceil(currentValue / 50); // 1 point per 50 HP
  } else {
    baseCost = Math.ceil(currentValue / 10); // 1 point per 10 stat
  }
  
  const pointCost = Math.max(1, baseCost);
  
  // Calculate next value
  let nextValue: number;
  if (statType === 'critical_chance') {
    nextValue = Math.min(maxValue, currentValue + 1);
  } else if (statType === 'hp') {
    nextValue = Math.min(maxValue, currentValue + 10);
  } else {
    nextValue = Math.min(maxValue, currentValue + 2);
  }
  
  return {
    stat_type: statType,
    current_value: currentValue,
    next_value: nextValue,
    point_cost: pointCost,
    max_value: maxValue,
    is_maxed: isMaxed,
  };
}

/**
 * Get all available upgrades for a buddy
 */
export function getAvailableUpgrades(buddy: PlayerBuddy): UpgradeCost[] {
  const stats: { type: StatType; value: number }[] = [
    { type: 'hp', value: buddy.max_hp },
    { type: 'attack', value: buddy.attack },
    { type: 'defense', value: buddy.defense },
    { type: 'speed', value: buddy.speed },
    { type: 'special_attack', value: buddy.special_attack },
    { type: 'special_defense', value: buddy.special_defense },
    { type: 'critical_chance', value: buddy.critical_chance },
  ];
  
  return stats.map(s => calculateUpgradeCost(s.value, s.type, buddy.level));
}

// ===================
// BATTLE SYSTEM
// ===================

/**
 * Get element advantage multiplier
 */
export function getElementMultiplier(
  attackerElement: BuddyElement | 'neutral',
  defenderElement: BuddyElement
): number {
  if (attackerElement === 'neutral') return 1;
  
  const advantageAgainst = ELEMENT_ADVANTAGES[attackerElement as BuddyElement];
  
  if (advantageAgainst === defenderElement) {
    return GAME_CONSTANTS.ELEMENT_ADVANTAGE_MULTIPLIER;
  }
  
  // Check for disadvantage (reverse lookup)
  const disadvantageFrom = Object.entries(ELEMENT_ADVANTAGES).find(
    ([_, target]) => target === attackerElement
  )?.[0];
  
  if (disadvantageFrom === defenderElement) {
    return GAME_CONSTANTS.ELEMENT_DISADVANTAGE_MULTIPLIER;
  }
  
  return 1;
}

/**
 * Calculate damage for an ability
 * Formula: ((2 * Level / 5 + 2) * Power * (Atk/Def)) / 50 + 2
 * Modified from Pokemon formula for simpler calculations
 */
export function calculateDamage(
  attacker: BattleBuddyState,
  defender: BattleBuddyState,
  ability: BuddyAbility,
  attackerLevel: number,
  activeEffects: ActiveEffect[] = []
): { damage: number; isCritical: boolean; effectiveness: number } {
  // Determine attack/defense stats based on ability type
  let attackStat = ability.is_special ? attacker.special_attack : attacker.attack;
  let defenseStat = ability.is_special ? defender.special_defense : defender.defense;
  
  // Apply buffs/debuffs from active effects
  for (const effect of activeEffects) {
    if (effect.effect_type === 'buff' && effect.target === 'player') {
      attackStat *= 1 + (effect.value / 100);
    }
    if (effect.effect_type === 'debuff' && effect.target === 'opponent') {
      defenseStat *= 1 - (effect.value / 100);
    }
  }
  
  // Base damage calculation
  const levelModifier = (2 * attackerLevel / 5 + 2);
  const statRatio = attackStat / defenseStat;
  let baseDamage = (levelModifier * ability.damage_base * statRatio) / 50 + 2;
  
  // Element effectiveness
  const effectiveness = getElementMultiplier(ability.element, defender.element);
  baseDamage *= effectiveness;
  
  // Critical hit check
  let critChance = attacker.critical_chance;
  for (const effect of activeEffects) {
    if (effect.effect_type === 'critical_boost' && effect.target === 'player') {
      critChance *= 1 + (effect.value / 100);
    }
  }
  
  const isCritical = Math.random() * 100 < critChance;
  if (isCritical) {
    baseDamage *= GAME_CONSTANTS.CRITICAL_DAMAGE_MULTIPLIER;
  }
  
  // Random variance (85% - 100%)
  const randomFactor = 0.85 + Math.random() * 0.15;
  baseDamage *= randomFactor;
  
  return {
    damage: Math.max(1, Math.floor(baseDamage)),
    isCritical,
    effectiveness,
  };
}

/**
 * Check if ability hits based on accuracy
 */
export function checkAccuracy(accuracy: number): boolean {
  return Math.random() * 100 < accuracy;
}

/**
 * Determine who goes first in a turn
 */
export function determineFirstMover(
  playerSpeed: number,
  opponentSpeed: number,
  activeEffects: ActiveEffect[]
): 'player' | 'opponent' {
  let playerFinalSpeed = playerSpeed;
  let opponentFinalSpeed = opponentSpeed;
  
  for (const effect of activeEffects) {
    if (effect.effect_type === 'buff_speed') {
      if (effect.target === 'player') {
        playerFinalSpeed *= 1 + (effect.value / 100);
      } else {
        opponentFinalSpeed *= 1 + (effect.value / 100);
      }
    }
  }
  
  // If speeds are equal, random
  if (playerFinalSpeed === opponentFinalSpeed) {
    return Math.random() < 0.5 ? 'player' : 'opponent';
  }
  
  return playerFinalSpeed > opponentFinalSpeed ? 'player' : 'opponent';
}

/**
 * Apply healing effect
 */
export function applyHeal(
  currentHP: number,
  maxHP: number,
  healAmount: number
): { newHP: number; actualHeal: number } {
  const actualHeal = Math.min(healAmount, maxHP - currentHP);
  return {
    newHP: currentHP + actualHeal,
    actualHeal,
  };
}

/**
 * Create battle state for a player buddy
 */
export function createBattleState(
  buddy: PlayerBuddy,
  buddyTypeName: string,
  buddyElement: BuddyElement
): BattleBuddyState {
  return {
    buddy_id: buddy.id,
    name: buddy.nickname || buddyTypeName,
    is_npc: false,
    current_hp: buddy.current_hp,
    max_hp: buddy.max_hp,
    attack: buddy.attack,
    defense: buddy.defense,
    speed: buddy.speed,
    special_attack: buddy.special_attack,
    special_defense: buddy.special_defense,
    critical_chance: buddy.critical_chance,
    element: buddyElement,
    ability_cooldowns: {},
  };
}

/**
 * Create battle state for an NPC boss
 */
export function createNPCBattleState(npc: NPCBoss): BattleBuddyState {
  return {
    buddy_id: `npc_${npc.name.toLowerCase().replace(/\s/g, '_')}`,
    name: npc.name,
    is_npc: true,
    current_hp: npc.hp,
    max_hp: npc.hp,
    attack: npc.attack,
    defense: npc.defense,
    speed: npc.speed,
    special_attack: npc.special_attack,
    special_defense: npc.special_defense,
    critical_chance: npc.critical_chance,
    element: npc.element,
    ability_cooldowns: {},
  };
}

/**
 * Get current quarter identifier
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

/**
 * Check if boss battle is available this quarter
 */
export function isBossBattleAvailable(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // Boss available last week of each quarter (months 3, 6, 9, 12)
  const isQuarterEnd = [3, 6, 9, 12].includes(month);
  const isLastWeek = day >= 24;
  
  return isQuarterEnd && isLastWeek;
}

/**
 * Get days until next boss battle
 * Returns 0 if boss battle is currently available
 */
export function getDaysUntilBossBattle(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();
  
  // Check if boss is currently available
  if (isBossBattleAvailable()) {
    return 0;
  }
  
  // Quarter end months when boss is available (24th-end of month)
  const quarterEndMonths = [3, 6, 9, 12];
  
  // Find the next boss battle date
  let nextBossMonth: number;
  let nextBossYear = year;
  
  // Check if we're in a quarter end month but before the 24th
  if (quarterEndMonths.includes(month) && day < 24) {
    // Boss is later this month
    nextBossMonth = month;
  } else {
    // Find the next quarter end month
    nextBossMonth = quarterEndMonths.find(m => m > month) || 0;
    
    // If no month found this year, it's March next year
    if (nextBossMonth === 0) {
      nextBossMonth = 3; // March
      nextBossYear = year + 1;
    }
  }
  
  // Boss starts on the 24th of the quarter end month
  // Use UTC to avoid timezone issues
  const nextBossDate = new Date(nextBossYear, nextBossMonth - 1, 24, 0, 0, 0);
  const today = new Date(year, now.getMonth(), day, 0, 0, 0);
  
  // Calculate days difference
  const diffTime = nextBossDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get formatted countdown string for boss battle
 */
export function getBossBattleCountdown(): string {
  const days = getDaysUntilBossBattle();
  
  if (days === 0) {
    return 'NU!';
  } else if (days === 1) {
    return '1 dag';
  } else if (days < 30) {
    return `${days} dagen`;
  } else {
    const months = Math.round(days / 30);
    return `~${months} ${months === 1 ? 'maand' : 'maanden'}`;
  }
}

/**
 * Get tutorial boss
 */
export function getTutorialBoss(): NPCBoss {
  return TUTORIAL_BOSS;
}

/**
 * Get quarterly boss
 */
export function getQuarterlyBoss(): NPCBoss {
  return QUARTERLY_BOSS;
}

// ===================
// AI OPPONENT LOGIC
// ===================

/**
 * Simple AI to choose an ability for NPC opponents
 */
export function chooseNPCAbility(
  npc: BattleBuddyState,
  player: BattleBuddyState,
  availableAbilities: BuddyAbility[],
  activeEffects: ActiveEffect[]
): BuddyAbility {
  // Filter out abilities on cooldown
  const usableAbilities = availableAbilities.filter(
    ability => !npc.ability_cooldowns[ability.id] || npc.ability_cooldowns[ability.id] <= 0
  );
  
  if (usableAbilities.length === 0) {
    // Return basic tackle if all on cooldown
    return availableAbilities.find(a => a.name === 'Tackle') || availableAbilities[0];
  }
  
  // If NPC HP is low, prioritize healing if available
  const hpPercent = npc.current_hp / npc.max_hp;
  if (hpPercent < 0.3) {
    const healAbility = usableAbilities.find(a => a.effect_type === 'heal');
    if (healAbility) return healAbility;
  }
  
  // Prefer type-advantaged abilities
  const advantagedAbilities = usableAbilities.filter(
    a => getElementMultiplier(a.element, player.element) > 1
  );
  
  if (advantagedAbilities.length > 0 && Math.random() < 0.7) {
    return advantagedAbilities[Math.floor(Math.random() * advantagedAbilities.length)];
  }
  
  // Otherwise, choose based on damage potential with some randomness
  const weightedAbilities = usableAbilities.map(ability => ({
    ability,
    weight: ability.damage_base * (ability.accuracy / 100) + Math.random() * 10,
  }));
  
  weightedAbilities.sort((a, b) => b.weight - a.weight);
  return weightedAbilities[0].ability;
}

// ===================
// ANXIETY SYSTEM
// ===================

/**
 * Calculate anxiety change after a battle
 */
export function calculateAnxietyChange(
  isVictory: boolean,
  isBoss: boolean,
  currentAnxiety: number
): number {
  if (isVictory) {
    // Victory reduces anxiety
    const reduction = isBoss ? 10 : 2;
    return -Math.min(reduction, currentAnxiety);
  } else {
    // Loss increases anxiety
    const increase = isBoss ? GAME_CONSTANTS.ANXIETY_LOSS_INCREASE : 3;
    return Math.min(increase, GAME_CONSTANTS.MAX_ANXIETY - currentAnxiety);
  }
}

/**
 * Get anxiety debuff based on anxiety level
 * High anxiety reduces all stats
 */
export function getAnxietyDebuff(anxietyLevel: number): number {
  if (anxietyLevel < 20) return 0;
  if (anxietyLevel < 40) return 5;
  if (anxietyLevel < 60) return 10;
  if (anxietyLevel < 80) return 15;
  return 20;
}

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Format a number with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Get effectiveness text
 */
export function getEffectivenessText(multiplier: number): string {
  if (multiplier > 1) return "It's super effective!";
  if (multiplier < 1) return "It's not very effective...";
  return '';
}

/**
 * Generate a battle message
 */
export function generateBattleMessage(
  actorName: string,
  abilityName: string,
  damage: number,
  isCritical: boolean,
  effectiveness: number
): string {
  let message = `${actorName} used ${abilityName}!`;
  
  if (damage > 0) {
    message += ` It dealt ${damage} damage!`;
  }
  
  if (isCritical) {
    message += ' Critical hit!';
  }
  
  const effectText = getEffectivenessText(effectiveness);
  if (effectText) {
    message += ` ${effectText}`;
  }
  
  return message;
}

/**
 * Get trainer title based on level
 */
export function getTrainerTitle(level: number): string {
  if (level >= 100) return 'Legendary Master';
  if (level >= 80) return 'Grand Champion';
  if (level >= 60) return 'Master Trainer';
  if (level >= 40) return 'Expert Trainer';
  if (level >= 25) return 'Skilled Trainer';
  if (level >= 10) return 'Junior Trainer';
  return 'Novice Trainer';
}

/**
 * Get level milestone visual unlocks
 */
export function getLevelMilestoneUnlocks(level: number): string[] {
  const unlocks: string[] = [];
  
  if (level >= 10) unlocks.push('badge_frame_bronze');
  if (level >= 25) unlocks.push('badge_frame_silver');
  if (level >= 50) unlocks.push('badge_frame_gold');
  if (level >= 75) unlocks.push('badge_frame_platinum');
  if (level >= 100) unlocks.push('badge_frame_legendary');
  
  if (level >= 15) unlocks.push('buddy_aura_glow');
  if (level >= 30) unlocks.push('buddy_aura_sparkle');
  if (level >= 45) unlocks.push('buddy_aura_flame');
  if (level >= 60) unlocks.push('buddy_aura_lightning');
  if (level >= 80) unlocks.push('buddy_aura_rainbow');
  
  return unlocks;
}
