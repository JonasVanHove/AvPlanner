# Gamification System - Badges

## Overzicht

Het gamification systeem beloont gebruikers met badges voor het tijdig invullen van hun beschikbaarheid en het helpen van andere teamleden.

## Database Setup

1. **Voer het database schema uit in Supabase:**
   ```sql
   -- Ga naar Supabase Dashboard → SQL Editor
   -- Kopieer en plak de inhoud van: database/gamification-schema.sql
   -- Voer het script uit
   ```

2. **Controleer of alle tabellen en functies zijn aangemaakt:**
   - `user_badges` - Opslag van verdiende badges
   - `check_timely_completion()` - Controleert tijdige completion
   - `check_helped_others()` - Controleert hulp aan anderen
   - `check_and_award_badges()` - Hoofdfunctie voor badge toekenning
   - `get_user_badges()` - Haalt badges op voor een gebruiker
   - `get_badge_leaderboard()` - Ranglijst per team

## Badge Types

## 🎯 Badge Systeem - Hoe het werkt

### Waar kan je badges zien?

#### 1. Klik op Avatar/Profielfoto ⭐ **NIEUW**
De makkelijkste manier om badges te bekijken:

1. **Klik op de profielfoto** van jezelf of een teamlid in de kalender
2. Er opent een dialog met:
   - Naam en profielfoto
   - Email adres (indien beschikbaar)
   - Verjaardag met leeftijd
   - **Badge collectie** met iconen en tellers
   - Huidige beschikbaarheid status

**Features:**
- ✅ Werkt voor alle teamleden
- ✅ Toon alleen badges voor dat specifieke team
- ✅ Real-time loading van badges
- ✅ Responsive design (werkt op mobiel)

**Hoe te gebruiken:**
```tsx
// In availability-calendar-redesigned.tsx
<MemberAvatar
  firstName={member.first_name}
  lastName={member.last_name}
  profileImage={member.profile_image}
  size="md"
  locale={locale}
  memberId={member.id}      // ✨ Belangrijk!
  teamId={teamId}            // ✨ Belangrijk!
  email={member.email}       // ✨ Belangrijk!
  birthDate={member.birth_date}
  clickable={true}           // ✨ Maakt avatar klikbaar
/>
```

**Voorbeeld Dialog:**
```
┌─────────────────────────────────┐
│ 👤 Jonas Van Hove              │
│    🟢 Beschikbaar               │
├─────────────────────────────────┤
│ 📧 jonas@vanhove.be            │
│ 📅 13 november 🎂              │
├─────────────────────────────────┤
│ 🏆 Mijn Badges                  │
│                                 │
│  🎯 🤝 🔥                       │
│   2   1   1                     │
│                                 │
│  4 badges verdiend             │
└─────────────────────────────────┘
```

#### 2. Badge Notificaties
Automatisch wanneer je een badge verdient:
- Popup rechtsboven met confetti 🎉
- Toont badge type en details
- Auto-close na 8 seconden

#### 3. Badge Leaderboard (Optioneel)
Maak een pagina met `TeamBadgesPage` component voor:
- Team ranglijst
- Badge statistieken
- Competitie tussen leden

### Timely Completion Badge
**Verdiend wanneer:** De gebruiker de volgende week volledig heeft ingevuld voor het einde van de huidige week.

**Criteria:**
- Voor einde van de week (zondag 23:59)
- Alle vereiste dagen ingevuld voor volgende week
- Weekdagen (ma-vr) zijn standaard vereist
- Als `weekendsAsWeekdays` is ingeschakeld, zijn ook za-zo vereist

**Voorbeeld:**
- Vandaag is woensdag 13 november
- Gebruiker vult maandag 18 nov t/m vrijdag 22 nov in
- Badge wordt toegekend zodra alle dagen zijn ingevuld

### 2. Team Helper Badge 🤝
**Verdiend wanneer:** De gebruiker heeft geholpen om de planning van andere teamleden in te vullen.

**Criteria:**
- Gebruiker is in edit mode
- Vult availability in voor een ander teamlid
- Heeft minimaal 5 dagen ingevuld voor dat lid
- Binnen de laatste 7 dagen

**Voorbeeld:**
- Jonas is in edit mode
- Hij vult de planning in voor Sarah (die bv. op verlof is)
- Na 5+ dagen invullen krijgt Jonas de Team Helper badge

### 3. Streak Badges 🔥
**Toekomstige features:**
- 3-Week Streak: 3 weken op rij tijdig ingevuld
- 10-Week Champion: 10 weken op rij tijdig ingevuld
- Perfect Month: Hele maand alles tijdig ingevuld

## Technische Details

### API Endpoints

#### POST /api/badges/check
Controleert en kent badges toe na availability update.
```typescript
Body: { 
  memberId: string,  // ID van het teamlid
  teamId: string     // ID van het team
}

Response: {
  success: boolean,
  newBadges: Array<{
    type: 'timely_completion' | 'helped_other',
    id: string,
    week_year: string,
    helped_count?: number
  }>
}
```

#### GET /api/badges/user
Haalt alle badges op voor een gebruiker.
```typescript
Query: { 
  email: string,
  teamId?: string,  // Optioneel: filter per team
  limit?: number    // Default: 50
}

Response: {
  success: boolean,
  badges: Badge[],
  count: number
}
```

#### GET /api/badges/leaderboard
Haalt de badge ranglijst op voor een team.
```typescript
Query: { 
  teamId: string,
  limit?: number  // Default: 10
}

Response: {
  success: boolean,
  leaderboard: Array<{
    member_id: string,
    member_name: string,
    total_badges: number,
    timely_badges: number,
    helper_badges: number,
    streak_badges: number
  }>
}
```

### UI Componenten

#### BadgeDisplay
Toont badges als iconen met tooltips.
```tsx
import { BadgeDisplay } from "@/components/badge-display"

<BadgeDisplay 
  badges={badges}
  locale="nl"
  size="md"  // sm | md | lg
  showCount={true}
/>
```

#### BadgeList
Toont gedetailleerde lijst van badges.
```tsx
import { BadgeList } from "@/components/badge-display"

<BadgeList 
  badges={badges}
  locale="nl"
/>
```

#### BadgeNotificationComponent
Toont popup notificatie met confetti bij nieuwe badge.
```tsx
import { BadgeNotificationComponent } from "@/components/badge-notification"

<BadgeNotificationComponent
  badge={newBadge}
  locale="nl"
  onClose={() => setShowNotification(false)}
/>
```

#### BadgeProgress
Toont voortgang voor volgende badge.
```tsx
import { BadgeProgress } from "@/components/badge-progress"

<BadgeProgress
  memberId={memberId}
  teamId={teamId}
  locale="nl"
  weekendsAsWeekdays={false}
/>
```

#### TeamBadgesPage
Volledige pagina met leaderboard en persoonlijke badges.
```tsx
import { TeamBadgesPage } from "@/components/team-badges-page"

<TeamBadgesPage
  teamId={teamId}
  teamName="My Team"
  userEmail="user@example.com"
  locale="nl"
/>
```

## Integratie in Availability Calendar

De badge checking is automatisch geïntegreerd in de `availability-calendar-redesigned.tsx`:

1. Na elke availability update wordt `checkBadges()` aangeroepen
2. Als nieuwe badges zijn verdiend, wordt een notificatie getoond
3. Confetti effect wordt getriggerd
4. Badge wordt opgeslagen in database

### Automatische Tracking

Het systeem houdt automatisch bij:
- Wie een availability update heeft gemaakt (`changed_by_id`)
- Wanneer de update is gemaakt (`updated_at`)
- Of het een automatische holiday update was (`auto_holiday`)

Dit gebeurt in de `updateAvailability` functie:
```typescript
const currentUserMember = members.find(m => m.email === userEmail)
const changedById = currentUserMember?.id || null

await supabase.from("availability").upsert([{ 
  member_id: memberId, 
  date, 
  status,
  changed_by_id: changedById,
  auto_holiday: false
}])

// Check for badges
if (changedById) {
  checkBadges(changedById)
}
```

## Translations

Alle badge teksten zijn beschikbaar in NL, EN, en FR via `lib/i18n.ts`:

```typescript
// Badge names
"badge.timelyCompletion"
"badge.helpedOther"
"badge.streak3"
"badge.streak10"
"badge.perfectMonth"

// UI texts
"badge.earned"
"badge.myBadges"
"badge.leaderboard"
"badge.progress"
// etc.
```

## Weekend Behavior

Het systeem respecteert de `weekendsAsWeekdays` setting per team:

- **Weekends als rust (default):** Alleen ma-vr moeten ingevuld zijn (5 dagen)
- **Weekends als werkdagen:** Ook za-zo moeten ingevuld zijn (7 dagen)

Deze setting wordt:
1. Opgeslagen in `localStorage` per team
2. Gebruikt door de badge check functie in de database
3. Opgeslagen in team settings (`teams.settings` JSONB kolom)

## Testing

### Test Scenario 1: Timely Completion Badge
1. Log in als gebruiker
2. Ga naar edit mode
3. Vul alle dagen in van volgende week (ma-vr of ma-zo)
4. Badge notificatie moet verschijnen met confetti

### Test Scenario 2: Team Helper Badge
1. Log in als admin/gebruiker met edit rechten
2. Ga naar edit mode
3. Vul 5+ dagen in voor een ander teamlid
4. Badge notificatie moet verschijnen

### Test Scenario 3: Leaderboard
1. Ga naar de badges pagina
2. Controleer of de ranglijst correct wordt getoond
3. Top 3 krijgen medailles (🥇🥈🥉)
4. Badge aantallen per categorie zijn zichtbaar

## Troubleshooting

### Badge wordt niet toegekend
- Controleer of RPC functie bestaat: `check_and_award_badges`
- Controleer RLS policies op `user_badges` tabel
- Controleer of `changed_by_id` correct wordt meegegeven
- Check browser console voor API errors

### Notificatie verschijnt niet
- Controleer of `BadgeNotificationComponent` is geïmporteerd
- Check state: `showBadgeNotification` en `newBadges`
- Controleer confetti import (`lib/confetti.ts`)

### Leaderboard is leeg
- Controleer of `get_badge_leaderboard` functie bestaat
- Controleer of er daadwerkelijk badges zijn toegekend
- Check RLS policies voor team_members en user_badges

### Badges worden dubbel toegekend
- Database heeft UNIQUE constraint op `(user_id, badge_type, week_year, team_id)`
- Bij conflict wordt geen nieuwe badge toegevoegd (`ON CONFLICT DO NOTHING`)

## Toekomstige Uitbreidingen

### Geplande Features
- [ ] Streak tracking (3, 10, x weken op rij)
- [ ] Perfect month badge
- [ ] Badge statistieken per lid
- [ ] Team achievements
- [ ] Exporteer badges naar PDF/CSV
- [ ] Push notifications voor nieuwe badges
- [ ] Badge showcase op profiel pagina

### Database Optimalisaties
- Materialized view voor leaderboard (snellere queries)
- Periodieke cleanup van oude badges (optioneel)
- Aggregatie tabellen voor statistieken

## Support

Voor vragen of problemen:
- Check deze README
- Check database logs in Supabase
- Check browser console voor frontend errors
- Review API responses in Network tab

## Changelog

### Version 1.0.0 (Initial Release)
- ✅ Database schema met user_badges tabel
- ✅ Timely Completion badge
- ✅ Team Helper badge
- ✅ Badge notification met confetti
- ✅ Badge display componenten
- ✅ Leaderboard systeem
- ✅ Multi-language support (NL/EN/FR)
- ✅ Automatic badge checking na updates
