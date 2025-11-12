# Gamification Implementatie - Samenvatting

## ✅ Wat is geïmplementeerd

Het gamification systeem met badges is volledig geïmplementeerd in AvPlanner. Gebruikers kunnen nu badges verdienen voor:

1. **Tijdig plannen** 🎯 - Badge voor het invullen van de volgende week vóór het einde van de huidige week
2. **Anderen helpen** 🤝 - Badge voor het helpen invullen van andere teamleden hun planning

## 📦 Gemaakte Bestanden

### Database
- **`database/gamification-schema.sql`**
  - `user_badges` tabel voor opslag
  - Database functies voor badge logica
  - RLS policies voor beveiliging
  - Indexen voor performance

### API Routes
- **`app/api/badges/check/route.ts`** - Controleert en kent badges toe
- **`app/api/badges/user/route.ts`** - Haalt user badges op
- **`app/api/badges/leaderboard/route.ts`** - Team ranglijst

### UI Components
- **`components/badge-display.tsx`** - Badge iconen en lijst weergave
- **`components/badge-notification.tsx`** - Popup notificaties met confetti
- **`components/badge-progress.tsx`** - Voortgang indicator
- **`components/team-badges-page.tsx`** - Volledige leaderboard pagina

### Documentatie
- **`GAMIFICATION-README.md`** - Complete handleiding met technische details

### Vertalingen
- **`lib/i18n.ts`** - NL/EN/FR vertalingen voor alle badge teksten

### Integraties
- **`components/availability-calendar-redesigned.tsx`** - Badge checking geïntegreerd

## 🎯 Badge Systeem - Hoe het werkt

### Timely Completion Badge
**Wanneer:** Voor het einde van de week de volgende week volledig invullen

**Criteria:**
- Alle werkdagen (ma-vr) ingevuld van volgende week
- Of ma-zo als weekend setting aan staat
- Automatisch gecontroleerd na elke update

**Voorbeeld:**
```
Vandaag: Woensdag 13 november
Actie: Vul ma 18 t/m vr 22 november in
Result: 🎯 Badge verdiend!
```

### Team Helper Badge
**Wanneer:** Andere teamleden helpen hun planning in te vullen

**Criteria:**
- In edit mode
- 5+ dagen invullen voor een ander lid
- Binnen 7 dagen

**Voorbeeld:**
```
Jonas helpt Sarah's planning invullen
Na 5 dagen: 🤝 Badge verdiend!
```

## 🚀 Setup Instructies

### 1. Database Setup (Verplicht)
```sql
-- Ga naar Supabase Dashboard → SQL Editor
-- Plak de inhoud van: database/gamification-schema.sql
-- Klik op "Run"
```

Dit maakt aan:
- ✅ `user_badges` tabel
- ✅ Badge check functies
- ✅ RLS policies
- ✅ Hulpfuncties

### 2. Testen
De implementatie is klaar om te gebruiken:

1. **Start de app**: `npm run dev`
2. **Log in** met een account
3. **Ga naar een team**
4. **Vul volgende week in** (in edit mode)
5. **Badge notificatie verschijnt** met confetti! 🎉

### 3. Leaderboard Bekijken
Je kan een route/pagina toevoegen die `TeamBadgesPage` component gebruikt:

```tsx
import { TeamBadgesPage } from "@/components/team-badges-page"

export default function BadgesPage() {
  return <TeamBadgesPage teamId="..." teamName="..." userEmail="..." locale="nl" />
}
```

## � Waar kan je badges zien?

### 1. **Klik op Profielfoto** (Nieuw! ⭐)
De makkelijkste manier om badges te bekijken:
- **Klik op de avatar/profielfoto** van een teamlid in de kalender
- Er opent een dialog met:
  - Naam en profielfoto
  - Email adres
  - Verjaardag (als ingesteld)
  - **Alle verdiende badges** met tellers
  - Huidige status (beschikbaar/afwezig/etc.)

### 2. **Badge Notificaties** 
Wanneer je een badge verdient:
- Popup verschijnt rechtsboven
- Confetti animatie 🎉
- Sluit automatisch na 8 seconden
- Of klik om te sluiten

### 3. **Badge Leaderboard Pagina** (Optioneel)
Maak een route die `TeamBadgesPage` component gebruikt om:
- Top 10 teamleden te zien
- Badge breakdown per categorie
- Persoonlijke badge collectie

## �🎨 UI Features

### Badge Notificatie
- Popup in rechterbovenhoek
- Confetti animatie
- Auto-close na 8 seconden
- Sluit op click

### Badge Display
- Compacte iconen met tooltips
- Teller voor meerdere badges
- Drie groottes (sm/md/lg)
- Dark mode support

### Leaderboard
- Top 10 teamleden
- Medailles voor top 3 (🥇🥈🥉)
- Badge breakdown per categorie
- Responsive design

## 📊 Database Schema

```sql
user_badges
├── id (UUID, primary key)
├── user_id (UUID, → auth.users)
├── member_id (UUID, → team_members)
├── team_id (UUID, → teams)
├── badge_type (text: timely_completion | helped_other | streak_3 | ...)
├── week_year (text: "2024-W48")
├── earned_at (timestamptz)
└── metadata (jsonb)

UNIQUE(user_id, badge_type, week_year, team_id)
```

### Belangrijke Functies

```sql
check_timely_completion(member_id, team_id)
→ Returns boolean

check_helped_others(member_id, team_id)
→ Returns UUID[] (geholpen leden)

check_and_award_badges(member_id, team_id)
→ Returns jsonb met nieuwe badges

get_user_badges(email, team_id, limit)
→ Returns badge records

get_badge_leaderboard(team_id, limit)
→ Returns ranked members
```

## 🔧 Technische Details

### Auto-tracking
Het systeem houdt automatisch bij:
- Wie een update maakt (`changed_by_id`)
- Wanneer (`updated_at`)
- Of het auto-holiday was (`auto_holiday`)

### Weekend Handling
Respecteert team setting:
- **Standaard**: Alleen werkdagen (ma-vr) = 5 dagen
- **Met weekends**: Alle dagen (ma-zo) = 7 dagen

### RLS Security
- Users kunnen alleen badges zien in hun teams
- Badge insert via service role
- No updates/deletes (badges zijn permanent)

## 🌍 Multi-language

Alle teksten in 3 talen:
- 🇳🇱 Nederlands (nl)
- 🇬🇧 Engels (en)
- 🇫🇷 Frans (fr)

Voorbeelden:
```typescript
badge.timelyCompletion
  en: "Timely Planner"
  nl: "Tijdige Planner"
  fr: "Planificateur Ponctuel"

badge.helpedOther
  en: "Team Helper"
  nl: "Team Helper"
  fr: "Aide d'Équipe"
```

## 🎁 Toekomstige Features (Optioneel)

Deze zijn voorbereid maar nog niet geïmplementeerd:

### Streak Badges
- 🔥 **3-Week Streak**: 3 weken op rij tijdig
- 🏆 **10-Week Champion**: 10 weken op rij tijdig
- ⭐ **Perfect Month**: Hele maand perfect

### Implementatie Suggestie
Voeg een scheduled function toe (bijv. via Supabase Cron) die wekelijks:
1. Alle users controleert op streaks
2. Telt opeenvolgende weken met timely badges
3. Kent streak badges toe bij 3, 10, etc. weken

```sql
CREATE OR REPLACE FUNCTION check_streaks()
RETURNS void AS $$
BEGIN
  -- Loop door alle users
  -- Tel opeenvolgende timely_completion badges
  -- Ken streak badges toe indien nodig
END;
$$ LANGUAGE plpgsql;
```

## 📝 Gebruiksvoorbeeld

### In je React component:
```tsx
import { BadgeDisplay } from "@/components/badge-display"
import { BadgeNotificationComponent } from "@/components/badge-notification"

function MyComponent() {
  const [badges, setBadges] = useState([])
  const [newBadge, setNewBadge] = useState(null)

  // Fetch badges
  useEffect(() => {
    fetch(`/api/badges/user?email=${userEmail}`)
      .then(res => res.json())
      .then(data => setBadges(data.badges))
  }, [])

  return (
    <>
      <BadgeDisplay badges={badges} locale="nl" size="md" />
      
      {newBadge && (
        <BadgeNotificationComponent
          badge={newBadge}
          locale="nl"
          onClose={() => setNewBadge(null)}
        />
      )}
    </>
  )
}
```

## ✅ Checklist voor Deployment

- [ ] Database schema uitvoeren in Supabase
- [ ] Controleer RLS policies zijn actief
- [ ] Test badge toekenning lokaal
- [ ] Test in verschillende browsers
- [ ] Test op mobiel
- [ ] Controleer translations (NL/EN/FR)
- [ ] Deploy naar productie
- [ ] Monitor Supabase logs voor errors
- [ ] Feedback verzamelen van gebruikers

## 🐛 Troubleshooting

### Badge wordt niet toegekend
1. Check Supabase logs voor RPC errors
2. Verifieer `check_and_award_badges` functie bestaat
3. Controleer `changed_by_id` is correct
4. Test RLS policies handmatig

### Notificatie verschijnt niet
1. Check browser console voor errors
2. Verifieer state: `showBadgeNotification`
3. Controleer `confetti.ts` import

### Leaderboard leeg
1. Verifieer badges zijn toegekend in database
2. Check `get_badge_leaderboard` functie
3. Test API call handmatig: `/api/badges/leaderboard?teamId=xxx`

## 📞 Support

Voor vragen:
- Lees `GAMIFICATION-README.md` voor details
- Check database logs in Supabase
- Review browser console
- Test API endpoints met Postman/curl

## 🎉 Conclusie

Het gamification systeem is **volledig functioneel** en klaar voor gebruik! 

Gebruikers zullen nu:
- Badges verdienen voor tijdig plannen
- Badges verdienen voor hulp aan teamleden
- Confetti zien bij nieuwe badges
- Leaderboard kunnen bekijken
- Gemotiveerd worden om op tijd te plannen

**Veel plezier met de nieuwe feature!** 🚀
