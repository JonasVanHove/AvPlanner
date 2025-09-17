# Admin Dashboard Setup

Deze implementatie voegt een admin dashboard toe voor het beheren van alle teams in de applicatie.

## Database Setup

### Stap 1: Voer het migration script uit
Voer `migration-step1.sql` uit in je Supabase SQL Editor. Dit voegt toe:
- `is_admin` kolom aan `auth.users` tabel
- `is_user_admin()` functie om admin status te controleren  
- `get_all_teams_admin()` functie om alle teams op te halen
- `delete_team_admin()` functie om teams te verwijderen

### Stap 2: Maak een user admin
Admin status kan **alleen** handmatig in de database worden ingesteld:

```sql
UPDATE auth.users 
SET is_admin = TRUE 
WHERE email = 'jouw-email@example.com';
```

### Stap 3: Test de functionaliteit
Gebruik het test script `scripts/12-test-admin-functions.sql` om te testen.

## Toegang tot Admin Dashboard

1. Log in als admin user
2. Ga naar `/admin` of gebruik de "Admin Panel" link in het dropdown menu
3. Het dashboard toont automatisch alle teams met beheer opties

## Functies

### Admin Dashboard Features:
- ✅ **Overzicht van alle teams** - Naam, invite code, member count, creator
- ✅ **Team statistics** - Totaal aantal teams, protected teams, totaal members
- ✅ **Team verwijdering** - Met bevestiging dialog
- ✅ **Veilige toegang** - Alleen voor geverifieerde admins
- ✅ **Live data** - Refresh functie voor actuele gegevens

### Security Features:
- ✅ **Database-level security** - Alle functies controleren admin status
- ✅ **Frontend access control** - Admin panel alleen zichtbaar voor admins
- ✅ **Confirmation dialogs** - Dubbele bevestiging voor destructieve acties
- ✅ **Error handling** - Graceful handling van access denied

## Database Functies

### `is_user_admin(user_email TEXT)`
Controleert of een user admin rechten heeft.

### `get_all_teams_admin(user_email TEXT)`
Haalt alle teams op met uitgebreide informatie (alleen voor admins).

### `delete_team_admin(team_id_param UUID, user_email TEXT)`
Verwijdert een team volledig inclusief alle members en availability data.

## Routes

### `/admin`
De hoofdroute voor het admin dashboard. Bevat:
- Authentication check
- Admin verification
- Team management interface

## Veiligheid

### Admin Role Management:
- Admin status kan **alleen** in database worden ingesteld
- Geen frontend interface voor admin role toewijzing
- Alle admin functies zijn beschermd door database-level security

### Access Control:
- Alle RPC functies controleren admin status
- Frontend components verbergen admin features voor non-admins
- Graceful error handling voor unauthorized access

## Deployment

1. Voer `migration-step1.sql` uit in productie
2. Maak een user admin via database query
3. Test toegang met `scripts/12-test-admin-functions.sql`
4. Deploy de frontend changes
5. Verifieer dat admin dashboard werkt

## Monitoring

Het admin dashboard logt belangrijke acties:
- Team deletions worden gelogd met NOTICE
- Failed access attempts worden afgehandeld
- Error states worden getoond aan gebruikers

## Troubleshooting

### "Access denied" error:
- Controleer of user `is_admin = TRUE` heeft in database
- Verifieer dat RPC functies correct zijn geïnstalleerd

### Admin panel niet zichtbaar:
- Controleer of admin status check werkt
- Verifieer dat Shield icon correct is geïmporteerd

### Team deletion fails:
- Controleer foreign key constraints
- Verifieer CASCADE settings op team relations
