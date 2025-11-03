# Team Creation with Auto-Member Setup

Deze implementatie zorgt ervoor dat wanneer een ingelogde user een team aanmaakt, deze automatisch als admin member wordt toegevoegd aan het team.

## Database Setup

### Stap 1: Voer het migration script uit
Kopieer de inhoud van `migration-step1.sql` naar je Supabase SQL Editor en voer het uit.

### Stap 2: Test de functionaliteit
Gebruik het test script `scripts/11-test-create-team-function.sql` om te controleren of alles correct werkt.

## Functionaliteit

### Voor ingelogde users:
1. User maakt team aan via de TeamForm
2. Database functie `create_team_with_creator()` wordt aangeroepen
3. Team wordt aangemaakt met `created_by` ingesteld op de user ID
4. User wordt automatisch toegevoegd als admin member van het team
5. User kan direct het team beheren

### Voor niet-ingelogde users:
1. User maakt team aan via de TeamForm
2. Team wordt aangemaakt zonder `created_by` waarde
3. Geen members worden automatisch toegevoegd
4. Team is "leeg" tot iemand zich aanmeldt

## Database Functies

### `create_team_with_creator()`
```sql
CREATE OR REPLACE FUNCTION create_team_with_creator(
  team_name TEXT,
  team_slug TEXT DEFAULT NULL,
  is_password_protected BOOLEAN DEFAULT FALSE,
  password_hash TEXT DEFAULT NULL,
  creator_email TEXT DEFAULT NULL
)
```

**Parameters:**
- `team_name`: Naam van het team
- `team_slug`: Optionele friendly URL slug
- `is_password_protected`: Of het team password protected is
- `password_hash`: Gehashte wachtwoord (indien protected)
- `creator_email`: Email van de creator (indien ingelogd)

**Returns:** Team informatie inclusief ID, naam, slug, invite_code, en protection status

## Frontend Implementatie

### TeamForm Component
De `TeamForm` component probeert eerst de database functie te gebruiken voor een atomaire operatie. Als dat faalt, valt het terug op de oude methode met handmatige member toevoeging.

### Voordelen van deze implementatie:
1. **Atomaire operaties**: Team creation en member toevoeging gebeuren in één database transactie
2. **Fallback mechanisme**: Als de database functie niet beschikbaar is, werkt het nog steeds
3. **Flexibiliteit**: Ondersteunt zowel ingelogde als niet-ingelogde users
4. **Consistentie**: Gegarandeerd dat de creator altijd admin rechten heeft

## Error Handling

De implementatie behandelt verschillende scenario's:
1. Database functie niet beschikbaar
2. User metadata niet beschikbaar
3. Duplicate slug errors
4. Missing database columns
5. Member toevoeging fails

## Testing

Test verschillende scenario's:
1. Ingelogde user maakt team aan
2. Niet-ingelogde user maakt team aan
3. Team met password protection
4. Team met custom URL slug
5. Error scenario's (duplicate slugs, etc.)

## Deployment

1. Voer `migration-step1.sql` uit in productie
2. Test met `scripts/11-test-create-team-function.sql`
3. Deploy de frontend changes
4. Monitor logs voor eventuele issues
