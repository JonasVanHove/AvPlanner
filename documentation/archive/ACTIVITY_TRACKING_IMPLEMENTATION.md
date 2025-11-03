# Activity Tracking - Availability Based Implementation

## Overzicht

Het activity tracking systeem is nu aangepast om **directe availability wijzigingen** te tonen in plaats van een aparte logging tabel. Dit betekent dat team admins de daadwerkelijke availability records kunnen zien zoals jij hebt aangegeven in het voorbeeld:

```json
[{
  "idx": 0,
  "id": "cf8e9401-8957-4320-8cf9-c9d98c75cad0",
  "member_id": "382f2818-67a8-4929-b220-d110ff9338af",
  "date": "2026-01-30",
  "status": "available",
  "created_at": "2025-09-30 12:29:18.963624+00"
}]
```

## Hoe het werkt

### 1. Database Aanpassingen
- **`updated_at` kolom**: Toegevoegd aan de `availability` tabel om wijzigingen te tracken
- **Trigger**: Automatisch bijwerken van `updated_at` bij elke wijziging
- **Nieuwe functie**: `get_recent_team_availability_changes()` die de daadwerkelijke availability records retourneert

### 2. API Endpoint (`/api/teams/activities`)
- **GET**: Haalt recente availability wijzigingen op voor een team
- **Alleen voor admins**: RLS policies zorgen ervoor dat alleen team admins toegang hebben
- **JSON response**: Directe availability data in het formaat dat je hebt aangegeven

### 3. UI Component (`TeamActivities`)
- **Toont daadwerkelijke availability**: In plaats van aparte log records
- **Status indicators**: Visuele weergave van de huidige status
- **Tijdsindicatie**: Laat zien of het een nieuwe record is of een wijziging
- **Filtering**: Op basis van aantal dagen terug

### 4. Integratie in My Teams
- **Alleen voor admins**: Component is alleen zichtbaar voor team admins en creators
- **Per team**: Elke team card toont zijn eigen recente availability wijzigingen
- **Collapsible**: De sectie kan ingeklapt worden om ruimte te besparen

## Installatie

### Stap 1: Database Schema Toepassen
```sql
-- Voer uit: scripts/availability_activities_schema.sql
-- Dit voegt de updated_at kolom, trigger en functies toe
```

### Stap 2: Oude Data Opruimen (optioneel)
```sql
-- Voer uit: scripts/cleanup_old_activities.sql
-- Dit verwijdert eventuele oude activity tracking tabellen
```

### Stap 3: Test de Functionaliteit
1. Ga naar `http://localhost:3000/my-teams`
2. Log in als team admin
3. Klik op "Recente Beschikbaarheid" bij een team
4. Maak een availability wijziging om te testen

## Data Structuur

De component toont nu availability records met:
- **Member informatie**: Naam, email, profielfoto
- **Datum**: Voor welke dag de beschikbaarheid geldt
- **Status**: Huidige beschikbaarheidsstatus
- **Tijdstip**: Wanneer het record is aangemaakt of gewijzigd
- **Type**: "Nieuw" of "Gewijzigd" indicator

## Voordelen van deze Aanpak

1. **Eenvoudiger**: Geen aparte logging tabel onderhouden
2. **Betrouwbaarder**: Directe koppeling met daadwerkelijke data
3. **Consistenter**: Altijd actueel met de huidige availability
4. **Efficiënter**: Minder database operaties nodig
5. **Flexibeler**: Kan eenvoudig uitgebreid worden met meer velden

## Security

- **RLS Policies**: Alleen team admins kunnen availability wijzigingen zien
- **API Protection**: Endpoints zijn beveiligd tegen ongeautoriseerde toegang
- **Team-scoped**: Admins zien alleen data van hun eigen teams