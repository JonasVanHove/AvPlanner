# 🚨 URGENT: Badge Systeem Fix

## Je Probleem
```
POST http://localhost:3000/api/badges/check-direct 404 (Not Found)
Details: TypeError: fetch failed
```

Dit is een **Node.js server-side fetch probleem** op Windows. De API route bestaat, maar kan niet met Supabase communiceren.

---

## ✅ OPLOSSING (Kies 1 van deze 3):

### **Optie 1: Herstart met TLS Disabled** ⚡ (Snelst, alleen development!)

Stop je dev server (Ctrl+C) en start zo:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dev
```

Dit schakelt SSL verificatie uit en lost het fetch probleem direct op.

⚠️ **Alleen voor development!** Gebruik dit NIET in production.

---

### **Optie 2: Voeg Service Role Key Toe** ⭐ (Beste oplossing)

1. Open: https://bhgvasgfhblhvsijcuum.supabase.co
2. Ga naar: **Settings** → **API**
3. Kopieer de **"service_role"** key (de lange key onder "Service role")
4. Voeg toe aan `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...JOUW_KEY_HIER
   ```
5. Herstart dev server:
   ```powershell
   pnpm dev
   ```

---

### **Optie 3: Gebruik Oude Check Endpoint** (Fallback als beide niet werken)

Verander in `availability-calendar-redesigned.tsx` lijn 932:

**Van:**
```tsx
const response = await fetch('/api/badges/check-direct', {
```

**Naar:**
```tsx
const response = await fetch('/api/badges/check', {
```

Maar dit zal waarschijnlijk DEZELFDE fetch error geven.

---

## 🧪 Test na Fix

### Test 1: Check of API routes werken
```powershell
Invoke-RestMethod http://localhost:3000/api/badges/ping
```

Verwacht:
```json
{
  "status": "ok",
  "message": "API routes are working!"
}
```

Als dit een **404** geeft → Herstart dev server
Als dit een **fetch failed** geeft → Gebruik Optie 1 of 2

### Test 2: Update een availability
- Open je app
- Verander een status
- Check console logs

Je zou moeten zien:
```
🏅 [Calendar] Calling /api/badges/check-direct...
🏅 [DIRECT] Badge check initiated
🏅 [DIRECT] Using service_role key
🏅 [DIRECT] ✅ Awarded activity_10!
```

---

## 🎯 Waarom Gebeurt Dit?

Windows + Node.js + Supabase = SSL problemen:
- Node's native `fetch()` heeft SSL certificaat issues
- Corporate firewalls/antivirus blokkeren uitgaande requests
- IPv6/IPv4 DNS resolution problemen

**De fix:**
- `NODE_TLS_REJECT_UNAUTHORIZED=0` → Skip SSL verificatie (dev only!)
- Service Role Key → Gebruikt betere auth + kan RLS bypassen

---

## ⚡ SNELLE FIX (30 seconden)

Stop dev server en run:
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dev
```

Open http://localhost:3000/api/badges/ping

Als je `"status": "ok"` ziet → Test een availability update!

---

## 🆘 Als Niks Werkt

Disable tijdelijk het badge systeem door deze regel te uncommenten in `availability-calendar-redesigned.tsx`:

```tsx
// Check for badge eligibility after update
// TEMPORARILY DISABLED DUE TO FETCH ISSUES
// console.log('🏅 [Calendar] Checking badges for updated member:', memberId)
// checkBadges(memberId)
```

Dan werkt de rest van je app gewoon door!
