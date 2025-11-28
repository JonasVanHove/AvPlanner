# 🎮 Buddy Battle - Gamification System

Een Pokémon-geïnspireerd gamification systeem voor AvPlanner dat beschikbaarheid invullen beloont met punten, gevechten en achievements.

## 📋 Overzicht

Buddy Battle is een turn-based combat systeem met:
- **5 Buddy Types**: Blazor (🔥 fire), Aquabit (💧 water), Terrapix (🌍 earth), Zephyron (💨 air), Voltling (⚡ electric)
- **Punten Systeem**: 1 punt per ingevulde dag, 2 punten op feestdagen
- **Upgrade Systeem**: HP, Attack, Defense, Speed, Critical
- **Battle Systeem**: PvP, Tutorial Boss (Nikita), Quarterly Boss (Marie-Françoise)
- **Shop & Inventory**: Wekelijkse items, mystery boxes
- **Quests & Achievements**: Daily/weekly challenges

## 🎨 Design

- Game Boy Color retro esthetiek (160x144 feel)
- DMG Palette: `#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`
- 8-bit geluidseffecten via Web Audio API
- Scanline overlay voor authenticiteit

## 📁 Bestandsstructuur

```
AvPlanner/
├── app/
│   ├── api/buddy-battle/
│   │   ├── achievements/route.ts   # Achievements API
│   │   ├── admin/route.ts          # Admin API
│   │   ├── battle/route.ts         # Battle API
│   │   ├── buddy/route.ts          # Buddy CRUD
│   │   ├── inventory/route.ts      # Items API
│   │   ├── leaderboard/route.ts    # Rankings API
│   │   ├── points/route.ts         # Points webhook
│   │   ├── quests/route.ts         # Quests API
│   │   ├── shop/route.ts           # Shop API
│   │   ├── types/route.ts          # Buddy types data
│   │   └── upgrade/route.ts        # Stats upgrade API
│   └── team/[teamId]/buddy/
│       ├── page.tsx                # Main buddy page
│       ├── achievements/page.tsx   # Achievements screen
│       ├── admin/page.tsx          # Admin dashboard
│       ├── battle/page.tsx         # Battle screen
│       ├── inventory/page.tsx      # Inventory management
│       ├── leaderboard/page.tsx    # Rankings
│       ├── shop/page.tsx           # Shop screen
│       └── upgrade/page.tsx        # Stat upgrades
├── components/buddy-battle/
│   ├── index.ts                    # Exports
│   ├── achievements-screen.tsx     # Achievements UI
│   ├── admin-dashboard.tsx         # Admin panel
│   ├── battle-screen.tsx           # Combat UI
│   ├── buddy-battle-link.tsx       # Navigation link
│   ├── buddy-battle-page.tsx       # Main dashboard
│   ├── buddy-display.tsx           # Buddy sprite/HP/XP
│   ├── buddy-setup.tsx             # Character creation
│   ├── inventory-screen.tsx        # Items UI
│   ├── leaderboard-screen.tsx      # Rankings UI
│   ├── menu-panel.tsx              # Navigation
│   ├── points-awarded-toast.tsx    # Points notification
│   ├── quest-panel.tsx             # Quests UI
│   ├── shop-screen.tsx             # Shop UI
│   ├── stats-panel.tsx             # Stats display
│   ├── trainer-card.tsx            # Player profile
│   ├── upgrade-screen.tsx          # Upgrade UI
│   └── ui/
│       ├── retro-button.tsx        # UI components
│       └── retro-dialog.tsx        # Re-exports
├── database/
│   ├── buddy-battle-schema.sql     # Database schema
│   └── buddy-battle-cron-jobs.sql  # Daily maintenance
├── documentation/
│   └── BUDDY-BATTLE-INTEGRATION.md # Integration guide
├── hooks/
│   ├── use-buddy-points.ts         # Points hook
│   └── use-retro-sounds.ts         # 8-bit audio
├── lib/buddy-battle/
│   ├── api.ts                      # Supabase operations
│   ├── game-logic.ts               # Combat formulas
│   ├── index.ts                    # Exports
│   ├── points-calculation.ts       # Points logic
│   └── types.ts                    # TypeScript types
├── styles/
│   └── buddy-battle.css            # Retro styling
└── supabase/functions/
    └── buddy-battle-daily/         # Edge function for cron
        └── index.ts
```

## 🗃️ Database Setup

1. Run het SQL schema in Supabase:

```bash
# Via Supabase Dashboard > SQL Editor
# Kopieer en run: database/buddy-battle-schema.sql
```

2. Tabellen die worden aangemaakt:
   - `buddy_types` - De 5 buddy soorten
   - `player_buddies` - Speler buddies met stats
   - `buddy_abilities` - Abilities per buddy type
   - `buddy_battles` - Gevechtsgeschiedenis
   - `buddy_items` - Item definities
   - `buddy_player_inventory` - Speler items
   - `buddy_quests` - Quest definities
   - `buddy_player_quests` - Quest voortgang
   - `buddy_shop_inventory` - Wekelijkse shop
   - `buddy_achievements` - Achievement definities
   - `buddy_player_achievements` - Behaalde achievements
   - `buddy_activity_log` - Activiteiten log
   - `buddy_daily_analytics` - Admin analytics

## 🎯 Game Mechanics

### Punten Verdienen
- **1 punt** per dag beschikbaarheid ingevuld
- **2 punten** op feestdagen
- **Streak bonus**: +1 punt per 7 dagen streak

### Element Advantages (Rock-Paper-Scissors)
```
🔥 Fire    → beats 💨 Air
💧 Water   → beats 🔥 Fire
🌍 Earth   → beats ⚡ Electric
💨 Air     → beats 🌍 Earth
⚡ Electric → beats 💧 Water
```

### Battle Formulas
```typescript
// Damage calculation
damage = (attack * abilityPower * elementMultiplier * critMultiplier) / defense

// XP for level
xp = Math.floor(100 * Math.pow(1.15, level - 1))

// Upgrade cost
cost = Math.floor(5 * Math.pow(1.5, currentValue / 10))
```

### Bosses
- **Nikita** (Tutorial Boss): Level 5, 100 HP, verschijnt bij eerste battle
- **Marie-Françoise** (Quarterly Boss): Level 50, 500 HP, verschijnt elk kwartaal

### Anxiety System
- Verlies = +10 Anxiety
- Hoge Anxiety (>50) = stat penalties
- Dagelijkse beschikbaarheid = -5 Anxiety

## 🖥️ Gebruik

### Voor Spelers

1. Navigeer naar `/team/[teamId]/buddy`
2. Kies je starter buddy (eenmalig)
3. Verdien punten door beschikbaarheid in te vullen
4. Upgrade stats in de Upgrade sectie
5. Vecht tegen teamgenoten of bosses
6. Koop items in de Shop
7. Voltooi quests voor extra beloningen

### Voor Admins

1. Navigeer naar `/team/[teamId]/buddy/admin`
2. Bekijk team statistieken
3. Monitor speler activiteit
4. Stuur team bonussen
5. Beheer game settings

## 🔧 API Endpoints

| Endpoint | Method | Beschrijving |
|----------|--------|--------------|
| `/api/buddy-battle/buddy` | GET | Haal buddy op |
| `/api/buddy-battle/buddy` | POST | Maak buddy aan |
| `/api/buddy-battle/buddy` | PATCH | Update buddy |
| `/api/buddy-battle/types` | GET | Buddy types lijst |
| `/api/buddy-battle/battle` | POST | Start/turn/end battle |
| `/api/buddy-battle/shop` | GET | Shop items |
| `/api/buddy-battle/shop` | POST | Koop item / mystery box |
| `/api/buddy-battle/upgrade` | GET/POST | Stats en upgrade |
| `/api/buddy-battle/inventory` | GET | Inventory ophalen |
| `/api/buddy-battle/inventory` | POST | Use/equip item |
| `/api/buddy-battle/leaderboard` | GET | Rankings per categorie |
| `/api/buddy-battle/quests` | GET | Active quests ophalen |
| `/api/buddy-battle/quests` | POST | Claim quest rewards |
| `/api/buddy-battle/points` | POST | Award points (webhook) |
| `/api/buddy-battle/achievements` | GET | Player achievements |
| `/api/buddy-battle/achievements` | POST | Check/award achievements |
| `/api/buddy-battle/admin` | GET | Admin dashboard stats |
| `/api/buddy-battle/admin` | POST | Admin acties |

## 📚 Documentatie

- **[BUDDY-BATTLE-README.md](./BUDDY-BATTLE-README.md)** - Dit bestand, algemene overview
- **[documentation/BUDDY-BATTLE-INTEGRATION.md](./documentation/BUDDY-BATTLE-INTEGRATION.md)** - Integratie handleiding

## 🔗 Integratie

### Availability Hook
Wanneer een gebruiker beschikbaarheid invult, roep de points webhook aan:

```typescript
// Na het opslaan van availability
await fetch('/api/buddy-battle/points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memberId: member.id,
    teamId: team.id,
    date: selectedDate,
  }),
});
```

### Team Pagina Link
Voeg de Buddy Battle link toe aan je team pagina:

```tsx
import { BuddyBattleLink } from '@/components/buddy-battle';

// In je team component
<BuddyBattleLink teamId={teamId} />
```

## 🎵 Audio

8-bit geluiden worden gegenereerd met Web Audio API:
- `select` - Menu navigatie
- `attack` - Aanval uitvoeren
- `hit` - Schade ontvangen
- `critical` - Critical hit
- `level_up` - Level omhoog
- `victory` - Gevecht gewonnen
- `defeat` - Gevecht verloren
- `achievement` - Achievement behaald
- `purchase` - Item gekocht
- `error` - Fout/niet mogelijk

## 🚀 Toekomstige Features

- [ ] Team Events met gezamenlijke doelen
- [ ] Seasonal Championships met exclusive rewards
- [ ] Meer buddy types en evoluties
- [ ] Trading systeem
- [ ] Guilds/Clans
- [ ] Daily login bonussen
- [ ] Buddy cosmetics en skins

## 📝 License

Onderdeel van AvPlanner - Intern gebruik
