# 🏅 Badge System Debug Guide

## Probleem
Badges worden niet automatisch toegekend na het updaten van availabilities.

## Oplossing - Stap voor Stap

### ✅ Stap 1: Verifieer dat SQL schema is uitgevoerd

**Check of de database functie bestaat:**

1. Open je Supabase Dashboard: https://bhgvasgfhblhvsijcuum.supabase.co
2. Ga naar **SQL Editor**
3. Run deze query:

```sql
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'check_and_award_badges'
) as function_exists;
```

**Als result = `false`:**
- De functie bestaat nog NIET
- Voer `database/gamification-schema.sql` uit in de SQL Editor

**Als result = `true`:**
- De functie bestaat ✅
- Ga naar stap 2

---

### ✅ Stap 2: Test de badge functie handmatig

In de Supabase SQL Editor, test de functie met JE EIGEN IDs:

```sql
-- Eerst: vind je member_id en team_id
SELECT 
  m.id as member_id,
  m.team_id,
  m.first_name,
  m.email,
  COUNT(DISTINCT a.date) as unique_days_filled
FROM members m
LEFT JOIN availability a ON a.member_id = m.id
WHERE m.email = 'JE_EMAIL_HIER@example.com'  -- ⚠️ VERVANG DIT!
GROUP BY m.id, m.team_id, m.first_name, m.email;
```

**Let op het resultaat:**
- Als `unique_days_filled >= 10`: Je zou badges moeten krijgen!
- Als `unique_days_filled < 10`: Je hebt nog niet genoeg availabilities

**Nu test de functie:**

```sql
-- Vervang de UUIDs met jouw member_id en team_id van hierboven
SELECT check_and_award_badges(
  'JOUW_MEMBER_ID_HIER'::uuid,
  'JOUW_TEAM_ID_HIER'::uuid
);
```

**Verwacht resultaat:**
```json
{
  "new_badges": [
    {"type": "activity_10", "id": "...", "week_year": "lifetime"},
    {"type": "activity_50", "id": "...", "week_year": "lifetime"}
  ]
}
```

**Als je een error krijgt:**
- Copy de exacte error message
- Check of de `user_badges` tabel bestaat
- Check of het CHECK constraint is updated (zie gamification-schema.sql regels 34-51)

---

### ✅ Stap 3: Test via de applicatie

1. **Start de dev server** (als die niet draait):
   ```powershell
   cd c:\Users\jovanhove\Downloads\GIT\AvPlanner
   pnpm dev
   ```

2. **Open de applicatie** in je browser: http://localhost:3000

3. **Open Developer Tools** (F12 in Chrome/Edge)

4. **Ga naar een team calendar** waar je member bent

5. **Update een availability** (klik op een dag, verander status)

6. **Check de Console logs** (Console tab in DevTools)

Je zou moeten zien:
```
🏅 [Calendar] Starting badge check for member: abc-123...
🏅 [Calendar] Calling /api/badges/check...
🏅 [API] Badge check initiated
🏅 [API] Checking badges for member: abc-123... in team: xyz-789...
🏅 [API] Calling check_and_award_badges RPC function...
🏅 [API] ✅ RPC function executed successfully
🏅 [API] Result: {...}
```

**Mogelijke errors:**

#### ❌ "function check_and_award_badges does not exist"
→ De SQL is nog niet uitgevoerd! Ga terug naar Stap 1.

#### ❌ "new row violates check constraint"
→ Het CHECK constraint moet geupdate worden:

```sql
-- Run dit in Supabase SQL Editor:
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;

ALTER TABLE public.user_badges
ADD CONSTRAINT user_badges_badge_type_check 
CHECK (badge_type IN (
  'timely_completion',
  'helped_other',
  'streak_3',
  'streak_10',
  'perfect_month',
  'activity_10',
  'activity_50',
  'activity_100',
  'activity_500',
  'activity_1000'
));
```

#### ❌ API returns 500 error
→ Check de console logs voor details
→ Check of je member.auth_user_id correct is ingesteld

---

### ✅ Stap 4: Check je badges

**In de applicatie:**
1. Klik op je **avatar** (of een ander member's avatar)
2. Je zou een badge dialog moeten zien met je badges

**In de database:**
```sql
-- Check alle badges voor jouw user
SELECT 
  ub.*,
  m.first_name,
  m.email
FROM user_badges ub
JOIN members m ON ub.member_id = m.id
WHERE m.email = 'JE_EMAIL@example.com'
ORDER BY ub.earned_at DESC;
```

---

## 🔍 Veelvoorkomende Problemen

### "Ik heb availabilities maar geen badges"

**Oorzaak 1:** Database functies niet uitgevoerd
→ Voer `gamification-schema.sql` uit

**Oorzaak 2:** Je hebt niet genoeg unieke dagen
→ Activity badges vereisen 10/50/100/500/1000 VERSCHILLENDE dagen

**Oorzaak 3:** Badges zijn al toegekend maar niet zichtbaar
→ Check de `user_badges` tabel direct (zie SQL query hierboven)

### "Badge notification wordt niet getoond"

Check dat je deze state variabelen hebt in je calendar component:
```tsx
const [newBadges, setNewBadges] = useState<any[]>([])
const [showBadgeNotification, setShowBadgeNotification] = useState(false)
```

En de BadgeNotification component:
```tsx
{showBadgeNotification && newBadges.length > 0 && (
  <BadgeNotification 
    badges={newBadges}
    onClose={() => {
      setShowBadgeNotification(false)
      setNewBadges([])
    }}
  />
)}
```

---

## 📊 Quick Status Check

Run dit script om een volledig overzicht te krijgen:

```powershell
cd c:\Users\jovanhove\Downloads\GIT\AvPlanner
node scripts/test-badges.js
```

Of de simplified versie:

```powershell
node scripts/award-badges-for-all-members.js
```

---

## 🆘 Hulp nodig?

Als je na deze stappen nog steeds problemen hebt:

1. **Collect logs:**
   - Browser console logs (tijdens availability update)
   - Supabase SQL error messages
   - Result van de SQL test queries

2. **Share info:**
   - Hoeveel unique dates heb je ingevuld?
   - Welke error zie je precies?
   - Bestaat de database functie? (Stap 1 query result)

3. **Common fix:**
   - 90% van de problemen = SQL niet uitgevoerd
   - Voer `gamification-schema.sql` VOLLEDIG uit in Supabase SQL Editor
   - Refresh de pagina en probeer opnieuw
