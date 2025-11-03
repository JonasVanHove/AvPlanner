# Member Order Functionaliteit Setup

## Overzicht
Deze functionaliteit voegt de mogelijkheid toe om teamleden omhoog en omlaag te verplaatsen in de availability planner edit mode.

## Setup Instructies

### 1. Database Migration Uitvoeren
Voer het `migration-admin-extended.sql` script uit in je Supabase SQL Editor:

1. Log in op je Supabase dashboard
2. Ga naar "SQL Editor"
3. Kopieer de inhoud van `migration-admin-extended.sql`
4. Voer het script uit

### 2. Verificatie
Na het uitvoeren van de migration, test de nieuwe functionaliteit:

1. Voer het test script uit: `scripts/test-member-order-functions.sql`
2. Controleer dat de functies bestaan:
   - `move_member_up`
   - `move_member_down` 
   - `update_member_order`
3. Controleer dat de `order_index` kolom bestaat in de `members` tabel

### 3. Frontend Testen
1. Open een team in edit mode
2. Je zou omhoog/omlaag pijlen moeten zien naast elke member
3. Test het verplaatsen van members
4. Controleer de browser console voor debug informatie

## Troubleshooting

### Error: "De database functie 'move_member_up' bestaat niet"
- Voer de migration script opnieuw uit
- Controleer of er geen errors waren tijdens uitvoering

### Error: "Access denied: User does not have edit rights"
- Zorg dat je ingelogd bent
- Controleer dat je admin of can_edit rechten hebt in het team

### Members worden niet in de juiste volgorde getoond
- Controleer of de `order_index` kolom gevuld is (run het migration script)
- Refresh de pagina om de nieuwe sortering te zien

### Debug Informatie
Open de browser console (F12) om debug informatie te zien:
- Member data wordt gelogd bij elke move actie
- Supabase RPC call details
- Error details bij problemen

## Database Schema Changes

### Nieuwe Kolommen
- `members.order_index` (INTEGER): Sorteervolgorde van members

### Nieuwe Functies
- `update_member_order()`: Hoofdfunctie voor reordering
- `move_member_up()`: Verplaats member omhoog
- `move_member_down()`: Verplaats member omlaag
- `set_member_order_index()`: Trigger voor nieuwe members

### Beveiligingsregels
- Alleen admins en can_edit users kunnen volgorde wijzigen
- Automatische validatie van order indices
- Team membership verificatie

## Frontend Changes

### Nieuwe Props
- `userEmail` toegevoegd aan AvailabilityCalendarRedesigned

### Nieuwe UI Elementen
- ChevronUp/ChevronDown knoppen in edit mode
- Tooltips voor gebruikersinstructies
- Disabled states voor begin/eind van lijst

### Updated Queries
- Members worden nu gesorteerd op `order_index` en dan `created_at`
