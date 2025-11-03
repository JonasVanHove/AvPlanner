# Profiel & Team Management Systeem

## 🎯 Nieuwe Functionaliteiten

### 👤 Profiel Systeem
- **Globale Profielfoto**: Elke user heeft één profielfoto die overal wordt gebruikt
- **Profiel Updaten**: First name, last name en profielfoto
- **Storage Integratie**: Veilige upload naar Supabase storage
- **Avatar Fallback**: Initialen als fallback voor profielfoto

### 🏢 Team Management
- **Teams Overzicht**: Alle teams waar user lid van is
- **Team Status**: Active, Inactive, Left
- **Team Verlaten**: Bevestiging vereist, creators kunnen niet zomaar vertrekken
- **Status Toggle**: Tijdelijk inactief zetten (pause/resume)
- **Role Weergave**: Admin, Can Edit, Member met badges

### 📊 Uitgebreide Statistieken
- **User Stats**: Total teams, active teams, admin roles
- **Team Stats**: Member count, status distribution
- **Last Active**: Tracking van laatste activiteit

## 🗄️ Database Schema Updates

### Members Tabel Uitbreidingen
```sql
-- Nieuwe kolommen
ALTER TABLE members ADD COLUMN profile_image_url TEXT;
ALTER TABLE members ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE members ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Status check constraint
CHECK (status IN ('active', 'inactive', 'left'))
```

### Storage Bucket
```sql
-- Bucket: profile-images
-- Public: true
-- RLS Policies: Users kunnen alleen hun eigen foto's uploaden/wijzigen
```

## 🔧 Database Functies

### Profiel Management
```sql
-- Profiel updaten
update_user_profile(user_email, profile_image_url, first_name, last_name)

-- Profiel ophalen
get_user_profile(user_email) → user info + stats
```

### Team Management
```sql
-- Teams ophalen met status
get_user_teams_with_status(user_email) → teams + role + status

-- Team verlaten
leave_team(team_id, user_email) → check permissions + update status

-- Status togglen
toggle_team_status(team_id, user_email) → active ↔ inactive

-- Team members met profielen
get_team_members_with_profiles(team_id, user_email) → members + profiles
```

## 🎨 React Components

### UserTeamsOverview
- **Locatie**: `components/user-teams-overview.tsx`
- **Features**:
  - Teams tabel met alle info
  - Status badges (Active, Inactive, Left)
  - Role badges (Admin, Can Edit, Member)
  - Action buttons (View, Toggle Status, Leave)
  - Statistieken dashboard
  - Bevestiging dialogs

### UserProfileForm
- **Locatie**: `components/user-profile-form.tsx`
- **Features**:
  - Profiel foto upload
  - Naam velden
  - Validatie (2MB max, image types)
  - Success/error feedback
  - Avatar preview

### ProfilePage
- **Locatie**: `app/profile/page.tsx`
- **Features**:
  - Tabs (My Teams, Profile)
  - Authentication check
  - Responsive design
  - Auto-refresh na updates

## 🔐 Beveiliging

### RLS Policies
- **Profile Images**: Users kunnen alleen hun eigen foto's beheren
- **Team Access**: Alleen team members kunnen team info zien
- **Leave Restrictions**: Creators kunnen niet vertrekken zonder andere admins

### Validatie
- **Image Upload**: Type en size validatie
- **Required Fields**: First name en last name verplicht
- **URL Validation**: Profiel URL validatie

## 🚀 Gebruik

### 1. Database Setup
```sql
-- Run deze files in volgorde:
-- 1. migration-profile-teams.sql
-- 2. 16-storage-setup.sql (na bucket aanmaken)
```

### 2. Storage Setup
1. Ga naar Supabase Storage
2. Maak bucket 'profile-images' (Public)
3. Run storage setup script

### 3. Frontend Setup
```bash
# Componenten zijn klaar
# Navigeer naar /profile om te gebruiken
```

## 📋 User Journey

### Profiel Updaten
1. **Ga naar `/profile`**
2. **Klik op "Profile" tab**
3. **Upload profielfoto** (optioneel)
4. **Vul naam in** (verplicht)
5. **Save changes**

### Team Management
1. **Ga naar `/profile`**
2. **Bekijk "My Teams" tab**
3. **Zie alle teams** met status en role
4. **Acties per team**:
   - 🗓️ **View**: Open team kalender
   - ⏸️ **Pause**: Zet status op inactive
   - ▶️ **Resume**: Zet status op active
   - 🚪 **Leave**: Verlaat team (bevestiging vereist)

### Team Verlaten
1. **Klik Leave button**
2. **Bevestig in dialog**
3. **Restrictions**:
   - Creators kunnen niet vertrekken zonder andere admins
   - Actie is permanent (heruitnodiging nodig)

## 🎯 Voordelen

### Voor Users
- **Consistent profiel** overal in de app
- **Duidelijk overzicht** van alle teams
- **Flexibel team management** (pause/resume/leave)
- **Veilige foto upload** met validatie

### Voor Admins
- **Gebruiker tracking** via last_active
- **Status monitoring** van team members
- **Profile data** voor betere UX
- **Clean data** door proper status management

## 🔄 Testing

### Test Scripts
```sql
-- Test profiel functionaliteit
-- scripts/15-test-profile-teams.sql

-- Test storage setup
-- scripts/16-storage-setup.sql
```

### Frontend Testing
1. **Upload profielfoto** → Controleer storage
2. **Update profiel** → Controleer database
3. **Toggle team status** → Controleer UI updates
4. **Leave team** → Controleer permissions

## 📈 Database Impact

### Nieuwe Tabellen
- Geen nieuwe tabellen
- Uitbreidingen van bestaande `members` tabel

### Performance
- **Indexen toegevoegd** voor status en last_active
- **Efficient queries** met proper JOINs
- **Minimal storage** impact

### Storage
- **Profile images** bucket
- **RLS policies** voor veiligheid
- **Cleanup triggers** voor oude foto's

## 🎉 Resultaat

Je hebt nu een volledig profiel & team management systeem met:

✅ **Globale profielfoto's** die overal gebruikt worden
✅ **Complete team overzichten** met status management
✅ **Veilige team verlaat functionaliteit** met bevestiging
✅ **Flexibele status management** (active/inactive/left)
✅ **Responsive UI** met moderne React components
✅ **Veilige storage** met RLS policies
✅ **Uitgebreide validatie** en error handling

Het systeem is klaar voor gebruik! 🚀
