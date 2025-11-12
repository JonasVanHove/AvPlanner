# 🚨 ACTIE VEREIST: Badge Systeem Setup

## Waarom je geen badges krijgt

De database **functies** bestaan nog niet in Supabase. Je moet éénmalig de SQL uitvoeren.

## ✅ Wat je MOET doen (2 minuten):

### Stap 1: Open Supabase
1. Ga naar: https://bhgvasgfhblhvsijcuum.supabase.co
2. Klik op **"SQL Editor"** in het linkermenu

### Stap 2: Voer SQL uit
1. Klik op **"+ New query"**
2. Open het bestand: `c:\Users\jovanhove\Downloads\GIT\AvPlanner\database\gamification-schema.sql`
3. **Selecteer ALLES** (Ctrl+A)
4. **Kopieer** (Ctrl+C)
5. **Plak** in de Supabase SQL Editor (Ctrl+V)
6. Klik op **"Run"** (of druk F5)

### Stap 3: Wacht op resultaat
Je zou moeten zien:
```
Success. No rows returned
```

Dit betekent dat alle functies en tabellen zijn aangemaakt!

### Stap 4: Test het
1. **Herstart je dev server:**
   ```powershell
   # Stop (Ctrl+C) en dan:
   pnpm dev
   ```

2. **Open de app** en **update een availability**

3. **Klik op je avatar** - je zou badges moeten zien! 🏅

## 🔍 Test of het werkt

Open in je browser:
```
http://localhost:3000/api/badges/test
```

Je zou moeten zien:
```json
{
  "summary": {
    "status": "ALL_PASS",
    "passed": 4,
    "failed": 0
  }
}
```

## ❓ Problemen?

### "Function does not exist"
→ SQL is niet uitgevoerd, ga terug naar Stap 1

### "TypeError: fetch failed"  
→ Herstart de dev server (Ctrl+C, dan `pnpm dev`)

### Nog steeds geen badges?
→ Check hoeveel **unieke dagen** je hebt ingevuld:
```sql
-- Run in Supabase SQL Editor:
SELECT 
  m.first_name,
  m.email,
  COUNT(DISTINCT a.date) as unique_days
FROM members m
LEFT JOIN availability a ON a.member_id = m.id
WHERE m.email = 'JOUW_EMAIL@example.com'  -- Verander dit!
GROUP BY m.id, m.first_name, m.email;
```

Je hebt **minimaal 10 unieke dagen** nodig voor de eerste badge!

## 🎉 Klaar!

Na de SQL run, zou het badge systeem volledig automatisch moeten werken. Elke keer dat iemand een availability update, worden badges automatisch gecheckt en toegekend.
