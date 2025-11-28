// =====================================================
// BUDDY BATTLE - Library Index
// Export all library functions
// =====================================================

// Types
export * from './types';

// Game logic
export {
  calculateDamage,
  getXPForLevel,
  calculateUpgradeCost,
  getElementMultiplier,
  chooseNPCAbility,
  getStatCap,
} from './game-logic';

// API functions
export {
  getBuddyTypes,
  getPlayerBuddy,
  createPlayerBuddy,
  updateBuddyColors,
  upgradeBuddyStat,
  getTeamBuddies,
  calculateAndAwardPoints,
  createPointTransaction,
  getTrainerProfile,
  updateLoginStreak,
  getLeaderboard,
  purchaseItem,
  getShopItems,
  getPlayerInventory,
  getActiveQuests,
  claimQuestReward,
  getPlayerAchievements,
  awardAchievement,
  getActiveTeamBuffs,
  logActivity,
  getBattleHistory,
} from './api';

// Points calculation
export {
  calculateAndAwardPoints as calculatePoints,
  awardXP,
} from './points-calculation';
