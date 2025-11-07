# AvPlanner API - Snelstart Gids (Nederlands)

## Overzicht

De AvPlanner API geeft je programmatische toegang tot team beschikbaarheid data. Je kunt beschikbaarheid ophalen voor teams via hun invite code of slug, met optionele wachtwoord authenticatie voor beveiligde teams.

**Basis URL**: `https://your-domain.com/api/availability`

## Belangrijkste Endpoints

### 1. Team Beschikbaarheid Ophalen
```
GET /api/availability/{teamCode}
```

Haal beschikbaarheid op voor een team met flexibele datum filtering.

**Parameters**:
- `teamCode`: Team invite code of slug (verplicht)
- `password`: Team wachtwoord (indien nodig)
- `startDate`: Begindatum (YYYY-MM-DD)
- `endDate`: Einddatum (YYYY-MM-DD)
- `week`: Weeknummer (1-53, vereist `year`)
- `year`: Jaar voor week parameter

**Voorbeeld**:
```bash
# Alle beschikbaarheid
curl "https://your-domain.com/api/availability/TEAM123"

# Met wachtwoord
curl "https://your-domain.com/api/availability/TEAM123?password=geheim123"

# Datum bereik
curl "https://your-domain.com/api/availability/TEAM123?startDate=2025-01-01&endDate=2025-01-31"

# Specifieke week
curl "https://your-domain.com/api/availability/TEAM123?week=5&year=2025"
```

### 2. Team Samenvatting
```
GET /api/availability/{teamCode}/summary
```

Krijg statistieken over team beschikbaarheid zonder gedetailleerde member data.

**Voorbeeld**:
```bash
curl "https://your-domain.com/api/availability/TEAM123/summary?startDate=2025-01-01&endDate=2025-01-31"
```

### 3. Dag Beschikbaarheid
```
GET /api/availability/{teamCode}/day/{date}
```

Gedetailleerde beschikbaarheid voor een specifieke dag.

**Voorbeeld**:
```bash
curl "https://your-domain.com/api/availability/TEAM123/day/2025-01-15"
```

### 4. Week Beschikbaarheid
```
GET /api/availability/{teamCode}/week/{year}/{week}
```

Beschikbaarheid voor een hele week (Maandag-Zondag, ISO week).

**Voorbeeld**:
```bash
curl "https://your-domain.com/api/availability/TEAM123/week/2025/3"
```

## Authenticatie voor Beveiligde Teams

Voor teams met wachtwoordbeveiliging, voeg de password parameter toe:

```bash
curl "https://your-domain.com/api/availability/TEAM123?password=jouwwachtwoord"
```

## Status Waarden

| Status | Beschrijving |
|--------|--------------|
| `available` | Lid is beschikbaar |
| `unavailable` | Lid is niet beschikbaar |
| `maybe` | Lid is mogelijk beschikbaar |
| `null` | Geen data voor deze datum |

## Response Formaat

Succesvolle responses zijn in JSON formaat:

```json
{
  "team": {
    "id": "uuid",
    "name": "Development Team",
    "slug": "dev-team",
    "invite_code": "TEAM123",
    "is_password_protected": false
  },
  "members": [
    {
      "id": "member-uuid",
      "first_name": "Jan",
      "last_name": "Jansen",
      "email": "jan@example.com",
      "role": "admin",
      "status": "active",
      "availability": "available"
    }
  ],
  "availability": [
    {
      "id": "avail-uuid",
      "member_id": "member-uuid",
      "date": "2025-01-15",
      "status": "available"
    }
  ]
}
```

## Foutmeldingen

### 401 - Ongeautoriseerd
```json
{
  "error": "Password required",
  "message": "This team is password-protected. Please provide a password."
}
```

of

```json
{
  "error": "Invalid password"
}
```

### 404 - Niet Gevonden
```json
{
  "error": "Team not found"
}
```

## JavaScript Voorbeeld

```javascript
async function getTeamAvailability(teamCode, password) {
  const url = new URL(`https://your-domain.com/api/availability/${teamCode}`);
  if (password) {
    url.searchParams.append('password', password);
  }
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

// Gebruik
try {
  const data = await getTeamAvailability('TEAM123', 'geheim123');
  console.log(`Team: ${data.team.name}`);
  console.log(`Members: ${data.members.length}`);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Python Voorbeeld

```python
import requests

def get_team_availability(team_code, password=None, start_date=None, end_date=None):
    url = f"https://your-domain.com/api/availability/{team_code}"
    params = {}
    
    if password:
        params['password'] = password
    if start_date:
        params['startDate'] = start_date
    if end_date:
        params['endDate'] = end_date
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

# Gebruik
try:
    data = get_team_availability('TEAM123', password='geheim123')
    print(f"Team: {data['team']['name']}")
    print(f"Members: {len(data['members'])}")
except requests.HTTPError as e:
    print(f"Error: {e.response.json()}")
```

## Best Practices

1. **Gebruik het meest specifieke endpoint**: Als je data voor één dag nodig hebt, gebruik dan `/day/{date}` in plaats van een groot datumbereik op te halen.

2. **Cache responses**: Beschikbaarheid verandert niet vaak. Cache responses voor redelijke periodes (bijv. 5-15 minuten).

3. **Error handling**: Implementeer goede error handling voor alle HTTP status codes.

4. **Datum formaten**: Gebruik altijd ISO 8601 datum formaat (YYYY-MM-DD).

5. **Week berekeningen**: Weeknummers volgen de ISO 8601 standaard waarbij weken starten op maandag.

## Volledige Documentatie

Voor uitgebreide documentatie, code voorbeelden en alle mogelijke parameters, zie [API.md](./API.md).

## Ondersteuning

Voor vragen of problemen met de API, neem contact op met support of maak een issue aan in de project repository.
