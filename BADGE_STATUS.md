## 🎯 Status: Badge Systeem Fix

### ✅ Wat We Weten:
1. API routes werken (`/api/badges/ping` geeft `ok`)
2. Supabase URL en Anon Key zijn correct ingesteld
3. Service Role Key **ontbreekt** (niet kritisch, maar helpt wel)
4. Het probleem is: **"TypeError: fetch failed"** → Node.js SSL issue

### 🚀 Wat Je NU Moet Doen:

**Stap 1: Stop je dev server**
- Ga naar je terminal waar `pnpm dev` draait
- Druk op `Ctrl+C` om te stoppen

**Stap 2: Start opnieuw met TLS workaround**
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dev
```

**Stap 3: Test of het werkt**
```powershell
# In een andere terminal:
Invoke-RestMethod http://localhost:3000/api/badges/quick-test
```

Je zou moeten zien:
- `"status": "ALL_PASS"` of minstens dat de basic query werkt

**Stap 4: Test badges in de app**
- Open je app: http://localhost:3000
- Ga naar een team calendar
- Update een availability (verander een status)
- Check de browser console (F12)

Je zou moeten zien:
```
🏅 [Calendar] Calling /api/badges/check-direct...
🏅 [DIRECT] Badge check initiated
🏅 [DIRECT] Found X unique dates
```

### 📊 Verwachting:
- Als je **10+ unieke dagen** hebt ingevuld → Je krijgt `activity_10` badge
- Als je **50+ unieke dagen** hebt ingevuld → Je krijgt `activity_50` badge
- Etc.

### ⚠️ Als Het NOG STEEDS Faalt:

Dan moeten we de Service Role Key toevoegen:

1. Ga naar: https://bhgvasgfhblhvsijcuum.supabase.co
2. Klik: **Settings** → **API**
3. Scroll naar beneden naar "Project API keys"
4. Kopieer de **"service_role"** key (de lange key, NIET de anon key)
5. Voeg toe aan `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...HELE_LANGE_KEY
   ```
6. Herstart dev server opnieuw

### 🔍 Debug Checklist:

- [ ] Dev server herstart met `NODE_TLS_REJECT_UNAUTHORIZED="0"`
- [ ] `/api/badges/ping` geeft `ok`
- [ ] `/api/badges/quick-test` geeft resultaten (niet meer "fetch failed")
- [ ] Availability update triggert badge check in console
- [ ] Badges verschijnen in database/UI

### 📝 Volgende Stappen:

Na succesvolle test:
1. Voeg Service Role Key toe (voor productie)
2. Verwijder `NODE_TLS_REJECT_UNAUTHORIZED="0"` (niet veilig voor productie)
3. Test badges met echte users
4. Check leaderboard (`/api/badges/leaderboard?teamId=xxx`)

---

**Vraag:** Heb je de dev server al herstart met de TLS fix? Laat me weten wat de console logs zeggen! 🚀
