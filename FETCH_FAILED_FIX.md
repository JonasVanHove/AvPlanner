# 🔧 Quick Fix: Badge System "fetch failed" Error

## Het probleem
De error "TypeError: fetch failed" gebeurt omdat Node.js's native fetch() problemen heeft met Supabase's SSL certificaten in je development omgeving (Windows specifiek).

## ✅ SNELLE OPLOSSING

### Optie 1: Herstart dev server met Node opties

Stop je dev server (Ctrl+C) en start opnieuw met:

```powershell
$env:NODE_OPTIONS="--dns-result-order=ipv4first"; pnpm dev
```

### Optie 2: Voeg toe aan package.json

Verander het `dev` script in `package.json`:

```json
"scripts": {
  "dev": "NODE_OPTIONS='--dns-result-order=ipv4first' next dev",
  ...
}
```

Dan gewoon:
```powershell
pnpm dev
```

### Optie 3: Gebruik de Supabase Service Role Key

Als bovenstaande niet werkt, gebruik een Service Role client (heeft meer rechten):

1. Ga naar Supabase Dashboard → Settings → API
2. Kopieer de "service_role" key (geheim!)
3. Voeg toe aan `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhb...jouw-key
   ```
4. De API route zal automatisch deze gebruiken

## 🧪 Test na fix:

```powershell
# Test API:
Invoke-RestMethod http://localhost:3000/api/badges/quick-test

# Update een availability en check console logs
```

## 📋 Als niks werkt:

Het is waarschijnlijk een Windows firewall/antivirus issue. Probeer:
1. Disable antivirus tijdelijk
2. Check Windows Firewall regels voor Node.js
3. Run PowerShell als Administrator

## ⚡ Nuclear Option: Skip badge system temporarily

Als je snel wilt doorgaan zonder badges, comment deze regel uit in `availability-calendar-redesigned.tsx`:

```tsx
// checkBadges(memberId)  // Temporarily disabled
```

Dan werkt de rest van je app wel!
