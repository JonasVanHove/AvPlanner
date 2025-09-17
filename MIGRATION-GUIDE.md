# MIGRATION INSTRUCTIONS - EXTENDED ADMIN PANEL

## 📋 **Overzicht**
Deze migratie voegt uitgebreide admin functionaliteiten toe en zorgt ervoor dat team creators automatisch lid worden van hun teams.

## 🔧 **Aangepaste Bestanden**

### 1. **Database Migratie**
📁 `migration-admin-extended.sql`
- ✅ Parameter conflicten opgelost (`user_email` → `admin_email`)
- ✅ Team status systeem (active/inactive/archived)
- ✅ Database statistieken functie
- ✅ Uitgebreide team management
- ✅ User management voor admins
- ✅ Activity monitoring
- ✅ **Automatische team creator membership** (nieuwe trigger)

### 2. **Admin Components**
📁 `components/admin/admin-database-overview.tsx`
- ✅ Parameter namen geüpdatet naar `admin_email`
- ✅ Volledige database overview interface
- ✅ Team status management UI
- ✅ User management interface
- ✅ Activity monitoring dashboard

📁 `components/admin/admin-dashboard.tsx`
- ✅ Parameter namen geüpdatet naar `admin_email`
- ✅ Geïntegreerd met nieuwe database overview

### 3. **Admin Page**
📁 `app/admin/page.tsx`
- ✅ Nieuwe interface met overzicht dashboard
- ✅ Navigatie tussen Teams Dashboard en Database Overview
- ✅ Modern responsive design

### 4. **Supporting Files**
📁 `hooks/useAuth.ts`
- ✅ Nieuwe auth hook voor component herbruikbaarheid

## 🚀 **Uitvoering Stappen**

### Stap 1: Database Migratie Uitvoeren
```sql
-- Voer uit in je Supabase SQL Editor:
-- Kopieer en plak de inhoud van migration-admin-extended.sql
```

### Stap 2: Functies Verificatie
Controleer of deze functies beschikbaar zijn:
- `get_database_statistics(admin_email)`
- `get_all_teams_detailed(admin_email)`
- `update_team_status(team_id, new_status, admin_email)`
- `get_all_users_admin(admin_email)`
- `get_recent_activity(admin_email, limit_count)`
- `add_team_creator_as_member()` (trigger functie)

### Stap 3: Test Nieuwe Functionaliteiten
1. **Team Creation Test**: Maak een nieuw team aan - creator moet automatisch lid worden
2. **Admin Dashboard**: Ga naar `/admin` - bekijk nieuwe interface
3. **Database Overview**: Test alle tabs (Overview, Teams, Users, Activity)
4. **Team Status**: Test team status wijzigingen (active/inactive/archived)

## 🎯 **Nieuwe Functionaliteiten**

### **Automatische Team Membership**
```sql
-- Wanneer een team wordt aangemaakt:
-- 1. Team wordt opgeslagen in 'teams' tabel
-- 2. Trigger 'add_team_creator_as_member' wordt uitgevoerd
-- 3. Creator wordt automatisch toegevoegd aan 'members' tabel met 'admin' rol
```

### **Admin Dashboard Features**
- **Overview**: Database statistieken en metrics
- **Teams**: Uitgebreide team lijst met status management
- **Users**: User management met profile info
- **Activity**: Real-time activity monitoring

### **Team Status Management**
- **Active**: Team is volledig functioneel
- **Inactive**: Team is gepauzeerd maar niet gearchiveerd
- **Archived**: Team is gearchiveerd, members worden inactief

## ⚠️ **Belangrijke Opmerkingen**

1. **Parameter Naming**: Alle functies gebruiken nu `admin_email` instead van `user_email`
2. **Backward Compatibility**: Oude functie calls moeten geüpdatet worden
3. **Trigger Safety**: De trigger controleert of creator bestaat voordat membership wordt toegevoegd
4. **Role Assignment**: Team creators krijgen automatisch 'admin' rol in het team

## 🔐 **Security**

Alle functies hebben admin verificatie:
```sql
IF NOT is_user_admin(admin_email) THEN
  RAISE EXCEPTION 'Access denied: User is not an admin';
END IF;
```

## 📊 **Database Schema Wijzigingen**

### Teams Table
```sql
ALTER TABLE teams ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE teams ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE teams ADD COLUMN archived_by TEXT;
```

### Nieuwe Indexes
```sql
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_teams_archived_at ON teams(archived_at);
```

## ✅ **Verificatie Checklist**

- [ ] Database migratie uitgevoerd zonder errors
- [ ] Alle nieuwe functies beschikbaar in database
- [ ] Admin dashboard toegankelijk op `/admin`
- [ ] Team creation test: creator wordt automatisch lid
- [ ] Team status management werkt correct
- [ ] Database overview toont correcte statistieken
- [ ] User management interface functioneel
- [ ] Activity monitoring toont recent activity

## 🛠️ **Troubleshooting**

### Error: Parameter name "user_email" used more than once
✅ **Opgelost**: Alle functies gebruiken nu `admin_email` parameter

### Error: Team creator not automatically added
✅ **Opgelost**: Trigger `add_team_creator_as_member` toegevoegd

### Error: Admin functions not accessible
- Controleer of user admin rechten heeft in `admin_users` tabel
- Verificeer `is_user_admin()` functie werkt correct

---

**🎉 Implementatie Compleet!**
Het uitgebreide admin panel is nu klaar voor gebruik met alle nieuwe functionaliteiten.
