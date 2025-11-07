# Database Setup voor AvPlanner

## Problemen
### Probleem 0: "Database error saving new user" (Signup faalt)
Dit betekent dat het opslaan van een nieuwe gebruiker faalt in de database-laag. Oorzaken zijn meestal:
- Trigger `on_auth_user_created` bestaat niet of faalt
- RLS policies op `public.users` blokkeren de insert vanuit de trigger
- `public.users` tabel mist of heeft verkeerde owner/kolommen
- Duplicaat email in `auth.users` (soft-deleted/banned)

Zie de sectie Oplossingen → Signup Fout herstellen voor een stapsgewijze aanpak.

### Probleem 1: 404 RPC Functie Fouten
Je krijgt 404 fouten in de browser console voor ontbrekende Supabase RPC functies:
- `is_user_admin`
- `manual_link_auth_user` 
- `get_user_teams`
- `get_user_teams_with_status`

### Probleem 2: "relation 'teams' does not exist" 
Je krijgt deze fout op /my-teams omdat essentiële database tabellen ontbreken.

## Oplossingen

### Signup Fout herstellen: "Database error saving new user"
Voer deze stappen uit in Supabase Dashboard → SQL Editor.

1) Diagnose – Auth en Trigger controleren
- `database/scripts/7-check-auth-schema.sql`
- `database/scripts/2-verify-trigger-details.sql`
- `database/scripts/11-check-existing-users.sql` (controleer of het emailadres al bestaat / soft-deleted is)

2) Minimalistische trigger test (doet niets, alleen logt)
- Voer `database/scripts/8-minimal-test-trigger.sql` uit
- Probeer opnieuw te registreren
   - Werkt registratie nu wel? Dan zat het probleem in de insert naar `public.users`
   - Werkt het nog steeds niet? Dan zit het probleem in Supabase Auth zelf (voor de trigger)

3) Definitieve fix voor profiel-aanmaak bij signup
- Voer `database/scripts/fix-user-signup.sql` uit
   - Maakt/actualiseert `public.users`
   - Zet owner op `postgres`, activeert RLS en voegt correcte policies toe
   - (Re)maakt `on_auth_user_created` trigger en `public.handle_new_user()` functie (SECURITY DEFINER)
   - Zet de juiste grants

4) (Optioneel/Tijdelijk) RLS noodschakelaar
- Als signup door RLS blijft falen, kun je tijdelijk RLS uitschakelen met `database/scripts/4-emergency-disable-rls.sql` om te bevestigen dat policies de oorzaak zijn. Schakel RLS daarna weer in met de correcte policies uit stap 3.

5) Redirect URL configureren
- Ga naar Supabase → Authentication → URL Configuration
- Voeg je callback URL toe (bijv. `http://localhost:3000/auth/callback` en je productie domein)
- Dit is vereist zodat verificatielinks correct terugkeren naar de app

Na deze stappen moet aanmelden/registreren slagen zonder database-fouten.

## Voor Live Database met Ontbrekende Tabellen (jouw huidige situatie)

### Stap 1: Controleer Huidige Database Structuur
1. Ga naar je Supabase Dashboard → **SQL Editor**
2. Kopieer en plak `database-structure-check.sql`
3. Voer uit om te zien welke tabellen bestaan/ontbreken

### Stap 2: Maak Ontbrekende Tabellen Aan (VEILIG voor live data)
1. Kopieer en plak `database-migration-safe.sql`
2. Voer uit - dit script:
   - Maakt alleen ontbrekende tabellen aan
   - Behoudt alle bestaande data
   - Gebruikt `IF NOT EXISTS` voor veiligheid

### Stap 3: Installeer Database Functies
1. `database-missing-functions.sql` - Basis functies
2. `database-extended-functions.sql` - Uitgebreide functies  
3. `database-admin-functions.sql` - Admin functies

### Stap 4: Test Implementatie
1. `database-verify-functions.sql` - Controleer of alles werkt
2. Ga naar http://localhost:3000/my-teams om te testen

---

## Voor Parameter/Constraint Errors

### Stap 1: Clean Up Bestaande Functies
1. Ga naar je Supabase Dashboard
2. Navigeer naar **SQL Editor**  
3. **Kies een van deze opties:**
   - **Option A (Aanbevolen)**: `database-cleanup-safe.sql` - Veilige cleanup met CASCADE
   - **Option B**: `database-cleanup.sql` - Basis cleanup script
4. Voer het gekozen script uit om bestaande functies te verwijderen

**Let op:** Als je constraint errors krijgt zoals `cannot drop function validate_profile_image_url because other objects depend on it`, gebruik dan `database-cleanup-safe.sql`.

### Stap 2: Voer de Database Functies uit
1. Kopieer en plak de inhoud van `database-missing-functions.sql`
2. Voer het script uit door op **Run** te klikken

### Stap 3: Voer Extended Functies uit
1. Kopieer en plak de inhoud van `database-extended-functions.sql`
2. Voer het script uit

### Stap 4: Voer Admin Functies uit  
1. Kopieer en plak de inhoud van `database-admin-functions.sql`
2. Voer het script uit

### Stap 5: Configureer Row Level Security (Optioneel maar Aanbevolen)
1. In dezelfde SQL Editor
2. Kopieer en plak de inhoud van `database-rls-policies.sql`  (als aanwezig)
3. Als je 500-fouten krijgt door RLS recursion ("infinite recursion detected"), voer tijdelijk
   `database/fixes/2025-11-05-rls-emergency-fix.sql` uit om policies te resetten naar veilige, niet-recursieve basis
4. Voer het gekozen script uit

### Stap 6: Admin Gebruikers Configureren
In het bestand `database-missing-functions.sql` staan enkele hardcoded admin emails:
- `jonas@vanhove.be`
- `admin@avplanner.com` 
- `jovanhove@gmail.com`

**Pas deze aan naar jouw admin email(s):**
1. Open `database-missing-functions.sql`
2. Zoek naar de `is_user_admin` functie
3. Vervang de emails in de lijst door jouw admin email(s)
4. Voer het script opnieuw uit in Supabase

### Stap 7: Test de Implementatie
Na het uitvoeren van de scripts:
1. Refresh je browser
2. Ga naar de My Teams pagina
3. De 404 fouten zouden moeten verdwijnen

## Functie Beschrijvingen

### `is_user_admin(user_email text)`
Controleert of een gebruiker admin rechten heeft door:
- Te kijken of ze een admin rol hebben in een team
- Te controleren tegen een lijst van hardcoded admin emails

### `manual_link_auth_user(user_email text)`
Linkt een geverifieerde gebruiker aan bestaande member records in teams op basis van email adres.

### `get_user_teams(user_email text)`
Haalt alle teams op waar een gebruiker lid van is, met team en member informatie.

### `get_user_teams_with_status(user_email text)`  
Uitgebreide versie die ook member counts en recente activiteit toevoegt.

### `validate_profile_image_url(url text)`
Valideert profile image URLs (gebruikt in table constraints).

## Troubleshooting

### Als je nog steeds errors krijgt:
1. **Controleer Supabase connectie**: Zorg dat je `.env.local` correct is geconfigureerd
2. **Controleer database schema**: Zorg dat alle tabellen bestaan met de juiste kolommen  
3. **Controleer permissions**: De RLS policies moeten correct zijn ingesteld
4. **Check browser console**: Voor meer specifieke error berichten

### Veelvoorkomende problemen:
- **Verkeerde admin email**: Pas de hardcoded emails aan in de `is_user_admin` functie
- **RLS policies te restrictief**: Mogelijk moeten de policies aangepast worden
- **Ontbrekende foreign keys**: Controleer dat alle tabellen correct gelinkt zijn

## Bestand Overzicht

### **Voor Live Database Issues (jouw situatie):**
- `database-structure-check.sql` - **NIEUW**: Controleert welke tabellen bestaan
- `database-migration-safe.sql` - **NIEUW**: Veilige tabel migratie voor live data

### **Voor Functie Management:**
- `database-missing-functions.sql` - Basis RPC functies 
- `database-extended-functions.sql` - Uitgebreide functies
- `database-admin-functions.sql` - Admin functies

### **Voor Cleanup (bij errors):**
- `database-cleanup.sql` - Basis cleanup script
- `database-cleanup-safe.sql` - Veilige cleanup met CASCADE

### **Voor Beveiliging & Testing:**
- `database-rls-policies.sql` - Row Level Security policies  
- `database-verify-functions.sql` - Verificatie script
- `database-setup-readme.md` - Deze instructies

## Installatie Volgorde
1. **Cleanup** (bij errors): `database-cleanup-safe.sql` (aanbevolen) of `database-cleanup.sql`
2. **Basis functies**: `database-missing-functions.sql`
3. **Extended functies**: `database-extended-functions.sql`  
4. **Admin functies**: `database-admin-functions.sql`
5. **Optioneel beveiliging**: `database-rls-policies.sql`
6. **Test installatie**: `database-verify-functions.sql`

## Volgende Stappen
Na het oplossen van deze database issues zou je applicatie volledig functioneel moeten zijn voor:
- User authentication en team membership
- Admin functionaliteiten  
- Team management
- Availability tracking