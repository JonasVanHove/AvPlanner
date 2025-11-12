# 🎯 DEFINITIEVE OPLOSSING: Badge Systeem Werkt Niet

## Het Probleem
Error: `TypeError: fetch failed` bij alle Supabase API calls vanuit Next.js API routes.

Dit is een **bekend Windows + Node.js + Supabase probleem**.

## ✅ OPLOSSING (kies ÉÉN van deze):

### **Optie 1: Voeg Service Role Key toe** (AANBEVOLEN ⭐)

Deze heeft betere permissions EN lost het fetch probleem op.

1. **Open Supabase Dashboard:**
   https://bhgvasgfhblhvsijcuum.supabase.co

2. **Ga naar Settings → API**

3. **Kopieer de "service_role" key** (de lange key onder "Service role")
   ⚠️ Deze is geheim! Deel deze NOOIT publiekelijk!

4. **Voeg toe aan `.env.local`:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...JOUW_KEY_HIER
   ```

5. **Herstart dev server:**
   ```powershell
   # Stop (Ctrl+C), dan:
   pnpm dev
   ```

6. **Test:**
   - Update een availability in je app
   - Check console logs voor 🏅 emoji's
   - Je zou geen "fetch failed" meer moeten zien!

---

### **Optie 2: Node DNS Fix** (als Optie 1 niet werkt)

Stop dev server en start met:
```powershell
$env:NODE_OPTIONS="--dns-result-order=ipv4first"; $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dev
```

⚠️ Dit schakelt SSL verificatie uit - **ALLEEN voor development!**

---

### **Optie 3: Firewall/Antivirus**

Als beide niet werken:
1. Disable Windows Defender/Antivirus tijdelijk
2. Run PowerShell als Administrator
3. Check Windows Firewall voor Node.js blokkades

---

## 🧪 Test na oplossing:

```powershell
# Test 1: Check if badge system is ready
Invoke-RestMethod http://localhost:3000/api/badges/quick-test

# Verwacht resultaat: "passed": 3, "failed": 0
```

```powershell
# Test 2: Update een availability en check logs
# Je zou moeten zien:
# 🏅 [API] Badge check initiated
# 🏅 [API] ✅ RPC function executed successfully
```

---

## 📋 Checklist na fix:

- [ ] Service Role Key toegevoegd aan `.env.local`
- [ ] Dev server herstart
- [ ] Badge test endpoint geeft `ALL_PASS`
- [ ] Console logs tonen 🏅 zonder errors
- [ ] SQL schema uitgevoerd in Supabase (gamification-schema.sql)

---

## 🆘 Als het NOG STEEDS niet werkt:

Run deze diagnostic:

```powershell
# Check env variables
Get-Content .env.local | Select-String "SUPABASE"

# Test Supabase direct
Invoke-WebRequest -Uri "https://bhgvasgfhblhvsijcuum.supabase.co/rest/v1/" `
  -Headers @{"apikey"="JE_ANON_KEY_HIER"} `
  -UseBasicParsing
```

Als de laatste command een 200 geeft maar de API route nog steeds faalt, is het een Node.js issue. Gebruik dan Optie 2.

---

## 💡 Waarom gebeurt dit?

Windows + Node.js heeft soms problemen met:
- IPv6 vs IPv4 DNS resolution  
- SSL certificate validation
- Corporate proxies/firewalls

De Service Role Key lost dit op omdat het:
- Betere permissions heeft
- Via server-side code gaat (geen browser fetch quirks)
- Consistent werkt in production én development
