# AvPlanner Gamification Guide - Buddy Battle System

## Overview

AvPlanner includes a complete gamification system with the **Buddy Battle** feature - a turn-based RPG game integrated into team availability planning. This guide covers all game mechanics, features, and how to use them.

## Quick Start

1. Go to your team's availability page
2. Click the "Buddy" button in the header (if you have access)
3. Enter the buddy password: `PapaYvo`
4. Create your first buddy character
5. Start battling other team members' buddies!

## Game Features

### 1. Buddy Characters

Each team member can create and customize a buddy character with:

- **Name**: Custom nickname for your buddy
- **Type**: Choose from 5 elemental types
  - 🔥 Fire: High attack, low defense
  - 💧 Water: Balanced stats
  - 🌍 Earth: High defense, low speed
  - 💨 Air: High speed, medium attack
  - ⚡ Electric: High special attack, medium defense
  
- **Base Stats**:
  - HP: Health points (100 base)
  - Attack: Physical damage (10 base)
  - Defense: Damage reduction (10 base)
  - Speed: Determines turn order (10 base)
  - Special Attack: Special move damage (10 base)
  - Special Defense: Special move resistance (10 base)
  - Critical Chance: Percentage chance for critical hits (5% base)

- **Color Customization**:
  - Primary Color: Main buddy color
  - Secondary Color: Accent color
  - Accent Color: Highlight color

### 2. Battle System

#### Battle Types

1. **Training Battle**: Practice mode against NPCs
   - No risk, no reward
   - Perfect for learning mechanics
   - Replayable unlimited times

2. **PvP Battle**: Player vs Player
   - Fight other team members' buddies
   - Win for high rewards, lose for small penalty
   - Ranked matchmaking coming soon

3. **Boss Battle**: Team challenge
   - Fight a powerful NPC boss
   - Quarterly events with seasonal bosses
   - Rewards unlock new features
   - Battle attempts tracked per quarter

4. **Tutorial Battle**: Learn the game
   - Guided introduction to mechanics
   - Must complete to unlock other battle types

#### Battle Mechanics

**Turn-Based Combat**:
1. Speed determines turn order (initiative)
2. Each turn: Choose action or pass
3. Actions include attacks, special moves, items, defend
4. Battle ends when one buddy reaches 0 HP

**Damage Calculation**:
```
Damage = (AttackStat × 1.2) - (OpponentDefense × 0.8) + Random(10%)
CriticalDamage = Damage × 1.5 (if critical hits)
SpecialDamage = (SpecialAttack × 1.5) - (SpecialDefense × 0.6)
```

**Effects System**:
- Burn: DoT damage over 3 turns
- Freeze: Lose turn 1/3 turns
- Stun: Lose next turn
- Poison: Gradual HP loss
- Buff/Debuff: Stat modifications
- Shields: Absorb damage

**Cooldown System**:
- Each move has cooldown turns
- Rare moves have longer cooldowns
- Cooldowns decrease each turn
- Cannot use move if on cooldown

### 3. Leveling & Experience

**Progression System**:
- **Levels**: 1-100 (maximum level)
- **Experience**: Earned from battles, quests, activities
- **Level Requirements**: Exponential growth
  - Level 1-10: 100 XP per level
  - Level 11-50: 250 XP per level
  - Level 51-100: 500 XP per level

**Stat Growth**:
- Base stats increase naturally with level
- Additional growth from stat upgrades (see below)
- Trainer level affects buddy potential

### 4. Points & Economy

**Buddy Points**:
- Earned daily from availability tracking
- 10 points for available day
- 15 points for perfect week (all days marked)
- 5 points for holidays recognized
- Used for stat upgrades and items

**Shop System**:
- Weekly rotating inventory
- Featured and limited-time items
- Prices vary by rarity
- Team-wide shop (same for all members)

**Item Types**:
- Consumable: Single-use items (potions, scrolls)
- Equipment: Stat-boosting gear
- Cosmetic: Visual upgrades
- Special: Event items

### 5. Stat Upgrades

**Upgrade Points**: 
- Earn 1 point per week
- Store up to 100 points
- Spend on any stat

**Upgrade Costs**:
- HP/Defense: 50 points → +10 stat
- Attack/Sp.Attack: 50 points → +5 stat
- Speed/Crit Chance: 75 points → +2 stat

**Strategic Decisions**:
Choose upgrade path based on playstyle:
- **Tank Build**: High HP + Defense
- **Glass Cannon**: High Attack + Speed
- **Balanced**: Equal distribution
- **Special Build**: Special Attack + Sp. Defense

### 6. Inventory System

Each buddy has personal inventory with:
- Healing items (potions, tonics)
- Battle items (stat boosters, full restores)
- Cosmetics (costumes, accessories)
- Event items (limited-time rewards)

**Item Usage**:
- Outside battle: Full restore items
- During battle: Consumable items with turn cost
- Permanent items: Equipment bonuses until unequipped

### 7. Quest System

**Daily Quests** (Reset each day):
- Focus on short-term activities
- Example: "Win 2 battles", "Upgrade buddy 3 times"
- Reward: Points and bonus XP

**Weekly Quests** (Reset each Monday):
- More challenging goals
- Example: "Reach level 10", "Win 5 battles"
- Reward: Major points and special items

**Special Quests**:
- Limited-time challenges
- Event-based objectives
- Highest rewards

**Achievement Quests**:
- Long-term goals
- Unlock permanently
- Example: "Reach level 100", "Win 100 battles total"

### 8. Achievements & Titles

**Achievement Categories**:
- **Battler**: Battle-related achievements
- **Collector**: Item/buddy collection
- **Explorer**: Discovery-based
- **Climber**: Level milestones
- **Legend**: Rare/legendary achievements

**Reward Titles**:
- Display under character name
- Grant small stat bonuses (2-5%)
- Unlock cosmetics

**Examples**:
- "First Victory": Win first battle
- "Boss Slayer": Defeat boss battle
- "Win Streak": Win 10 consecutive battles
- "Level Milestone": Reach level 25, 50, 100
- "Collector": Collect all item types
- "Trader": Trade items 50 times
- "Team Player": Help 10 teammates
- "Perfect Attendance": Availability 100% for month
- "Legend": Unlock all achievements

### 9. Mystery Boxes

**Mechanics**:
- Randomized item containers
- Fixed cost (usually 100-500 points)
- Contains 1-5 items
- Weighted probability system

**Guaranteed Items**:
- Always contains at least 1 useful item
- Rarity: Common(40%) → Uncommon(30%) → Rare(20%) → Epic(8%) → Legendary(2%)

**Special Events**:
- Limited-time mystery boxes
- Seasonal themed contents
- Double drop events

### 10. Trainer Profiles

**Trainer Level**:
- Average of all buddy levels
- Affects item prices and battle rewards
- Max level: 100
- Progression tracked in profile

**Stats Tracked**:
- Total battles fought
- Battles won/lost percentage
- Bosses defeated
- Login streaks (longest & current)
- Items purchased
- Total points earned

**Profile Display**:
- Avatar (default or customized)
- Trainer title and level
- Public statistics
- Achievements showcase
- Buddy team composition

### 11. Team Dynamics

**Team Buffs**:
- Global bonuses for whole team
- XP boost: +10-50% all XP
- Point boost: +10-50% all points
- Shop discount: -10-50% item prices
- Crit boost: +10-50% critical chance

**Team Events**:
- Triggered automatically
- "Boss Defeated": When team defeats boss
- "Team Milestone": At team milestones
- "Weekly Champion": Top performer
- "Special Event": Announcements

**Collaboration**:
- Help teammates complete availability
- Support badge rewards
- Team leaderboards
- Shared boss fights

### 12. Daily Mechanics

**Daily Activity**:
- Login streak tracking
- Daily availability points
- Daily quest resets
- HP regeneration

**HP System**:
- HP fully restores at midnight
- Can use items for instant heal
- Critical for battles (can't battle at 0 HP)
- Shown in header status

**Auto-Login**:
- Automatic streak counting
- Passive XP accumulation
- Daily quest availability

## Advanced Strategies

### Building an Optimal Team

1. **Early Game** (Levels 1-20):
   - Focus on HP and Attack
   - Complete training battles
   - Grind daily quests
   - Save points for crucial upgrades

2. **Mid Game** (Levels 21-60):
   - Specialize in role (tank/DPS/balanced)
   - Battle other players
   - Invest in strategy items
   - Complete special quests

3. **Late Game** (Levels 61-100):
   - Perfect your build
   - Tackle boss battles
   - Collect rare items
   - Compete in tournaments

### Type Advantages

```
Fire    → beats → Earth
Earth   → beats → Air
Air     → beats → Water
Water   → beats → Fire
Electric→ beats → Water (special)
```

Use type advantage for 20% bonus damage!

### Item Priority Spending

1. **Health Potions**: Essential (10-50 points)
2. **Stat Boosters**: Strategic (30-100 points)
3. **Cosmetics**: Optional (50-200 points)
4. **Special Items**: Event-based (100-500 points)

## Common Questions

**Q: How do I get more buddy points?**
A: Mark your availability daily! 10 points per day, 15 for perfect weeks.

**Q: Can I reset my buddy?**
A: Yes, for 500 points you can reset and create a new buddy.

**Q: What happens if my buddy loses a battle?**
A: You lose 5% of current level's XP requirement. PvP losses are less harming than boss battles.

**Q: Are there pay-to-win mechanics?**
A: No! All features are accessible through normal gameplay. No real money involved.

**Q: Can teammates battle together vs boss?**
A: Coming soon! Co-op boss battles planned for Q2 2026.

**Q: How are leaderboards calculated?**
A: By total level, then by battles won, then by points earned.

## Upcoming Features

- [ ] Co-op battles (2-4 players vs boss)
- [ ] Trading system (trade items between players)
- [ ] Guilds / Clans (team-based organizations)
- [ ] Seasonal tournaments (ranked matches)
- [ ] Buddy evolution (level 50+ transformations)
- [ ] Custom moves creation
- [ ] Battle replay system
- [ ] PvP rankings and seasons
- [ ] Livestream battles
- [ ] Cosmetic skins shop

## Settings & Preferences

**Battle Settings**:
- Animation speed (Fast/Normal/Slow)
- Sound effects (On/Off)
- Background music (On/Off)
- Battle messages (Verbose/Simple)

**Privacy Settings**:
- Public profile (Show/Hide)
- Battle history visibility
- Statistics sharing
- Leaderboard opt-in

## Troubleshooting

**Bug: Buddy won't level up**
- Verify XP is being earned in battles
- Check buddy is active (not deleted)
- Ensure battles are being saved

**Bug: Items not appearing**
- Refresh inventory
- Check item availability date range
- Verify purchase was successful

**Bug: Battle won't start**
- Check both buddies have HP > 0
- Verify team membership
- Try different battle type

**Bug: Points not incrementing**
- Mark availability first
- Check daily reset timing
- Verify availability marks are saved

## Resources

- **Game Dashboard**: `/team/:slug/buddy`
- **Trainer Profile**: `/profile`
- **Buddy Battles**: `/team/:slug/buddy/battles`
- **Shop**: `/team/:slug/buddy/shop`
- **Inventory**: `/team/:slug/buddy/inventory`
- **Leaderboards**: `/team/:slug/buddy/leaderboards`
- **Events**: `/team/:slug/buddy/events`

## Support

Having issues? 
- Check the FAQ above
- Review in-game tutorials
- Report bugs via GitHub Issues
- Contact support team

---

**Pro Tip**: The best way to succeed is to maintain perfect availability! Daily marks = Daily points = Stronger buddies = Better battles! 🚀🎮
