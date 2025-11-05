# Admin Dashboard - Gebruikersbeheer Update

## Nieuw: Admin Users Management

De admin dashboard is uitgebreid met beheer van admin users. Hier is wat er nieuw is:

### 🆕 Nieuwe Functionaliteit

#### 1. Admin Users Tab
- **Locatie**: Admin Dashboard → "Admin Users" tab
- **Functionaliteit**: Overzicht van alle admin users
- **Informatie**: Email, naam, wie toegang heeft verleend, wanneer, en status

#### 2. Database Functies
- `get_admin_users(user_email)`: Haalt alle admin users op
- `grant_admin_access(user_email, granted_by)`: Verleent admin toegang
- `revoke_admin_access(user_email)`: Trekt admin toegang in

#### 3. Verbeterde UI
- **Tabs**: Teams en Admin Users gescheiden
- **Stats**: Aantal admin users wordt nu ook getoond
- **Tabellen**: Gestructureerde weergave van admin users

### 🛠️ Implementatie Details

#### Database Schema
```sql
-- Nieuwe tabel voor admin users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    granted_by TEXT,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Component Updates
- **AdminDashboard**: Uitgebreid met admin users management
- **Tabs**: Teams en Admin Users gescheiden
- **Stats**: 4 kaarten in plaats van 3

### 🔧 Gebruik

#### Admin Status Verlenen
```sql
-- Via database (direct)
SELECT grant_admin_access('nieuwe-admin@example.com', 'bestaande-admin@example.com');
```

#### Admin Status Controleren
```sql
-- In de applicatie
SELECT is_user_admin('user@example.com');
```

#### Admin Users Bekijken
- Log in als admin
- Ga naar Admin Dashboard
- Klik op "Admin Users" tab

### 🔄 Migratie

1. **Run migration-step1.sql** - Bevat alle nieuwe functies
2. **Test met 12-test-admin-functions.sql** - Bevat tests voor alle functies
3. **Extra test met 13-test-admin-users.sql** - Specifiek voor admin users

### 📋 Functies Overzicht

| Functie | Beschrijving | Toegang |
|---------|-------------|---------|
| `is_user_admin(email)` | Controleer admin status | Alle users |
| `get_admin_users(email)` | Haal admin users op | Alleen admins |
| `grant_admin_access(email, granted_by)` | Verleen admin toegang | Database direct |
| `revoke_admin_access(email)` | Trek admin toegang in | Database direct |
| `get_all_teams_admin(email)` | Haal alle teams op | Alleen admins |
| `delete_team_admin(team_id, email)` | Verwijder team | Alleen admins |

### 🔒 Beveiliging

- **RLS Policies**: Alleen admins kunnen admin functies gebruiken
- **Function Security**: Alle functies zijn SECURITY DEFINER
- **Separate Table**: admin_users tabel i.p.v. auth.users modificatie
- **Audit Trail**: Wie heeft wanneer admin toegang verleend

### 📝 Testen

1. **Basis Test**:
   ```sql
   SELECT grant_admin_access('jouw-email@example.com', 'system');
   SELECT * FROM get_admin_users('jouw-email@example.com');
   ```

2. **UI Test**:
   - Log in met admin account
   - Bezoek `/admin` 
   - Controleer beide tabs (Teams en Admin Users)

3. **Functionaliteit Test**:
   - Maak een tweede admin aan
   - Controleer of deze verschijnt in de lijst
   - Test revoke functionaliteit

### 🚀 Deployment

1. **Database**: Run `migration-step1.sql` in Supabase
2. **Frontend**: Component wordt automatisch geüpdatet
3. **Test**: Gebruik de test scripts om functionaliteit te verifiëren

### 📈 Voordelen

- **Beter Overzicht**: Duidelijk wie admin rechten heeft
- **Audit Trail**: Bijhouden van wie toegang heeft verleend
- **Flexibiliteit**: Makkelijk admin rechten verlenen/intrekken
- **Veiligheid**: Gescheiden van Supabase auth.users tabel

### 🎯 Volgende Stappen

1. Test de nieuwe functionaliteit
2. Verleen admin toegang aan jezelf via database
3. Gebruik de admin dashboard om teams en admin users te beheren
4. Documenteer welke users admin rechten moeten hebben

---

**Belangrijk**: Admin rechten kunnen alleen via de database verleend worden, niet via de UI. Dit is een bewuste veiligheidsmaatregel.
