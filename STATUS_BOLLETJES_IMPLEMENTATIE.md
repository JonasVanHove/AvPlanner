# Status Bolletjes Implementatie

## Overzicht

Er is een status bolletje systeem geïmplementeerd dat de aanwezigheid van vandaag weergeeft voor elke gebruiker op alle pagina's waar teamleden worden getoond.

## Nieuwe Componenten

### 1. `useTodayAvailability` Hook
**Locatie:** `hooks/use-today-availability.ts`

Een React hook die de aanwezigheid van vandaag ophaalt voor een lijst van member IDs.

**Kenmerken:**
- Automatische caching per dag
- Efficiënte batch queries
- Loading states
- Refresh functionaliteit

**Gebruik:**
```tsx
const { todayAvailability, isLoading, refresh } = useTodayAvailability(memberIds)
```

### 2. Verbeterde `MemberAvatar` Component
**Locatie:** `components/member-avatar.tsx`

**Nieuwe features:**
- Status indicator bolletjes
- Tooltip ondersteuning
- Betere naam parsing
- Consistente kleuren met rest van app

**Status kleuren:**
- 🟢 Groen: `available` (Beschikbaar)
- 🟣 Paars: `remote` (Op Afstand)  
- 🔴 Rood: `unavailable` (Niet Beschikbaar)
- 🔵 Blauw: `need_to_check` (Moet Nakijken)
- ⚫ Grijs: `absent` (Afwezig)
- 🟡 Geel: `holiday` (Vakantie)
- ⚪ Lichtgrijs: Geen status ingesteld

## Geïmplementeerd op Pagina's

### 1. User Dashboard (`components/auth/user-dashboard.tsx`)
- Status bolletjes voor alle teamleden in teamoverzicht
- Toont aanwezigheid van vandaag
- Tooltip met status uitleg

### 2. Team Settings (`app/team/[slug]/settings/page.tsx`)
- Status bolletjes voor alle teamleden in settings
- Grotere avatars (size="lg")
- Status info naast andere member details

### 3. Admin Database Overview (`components/admin/admin-database-overview.tsx`)
- Status bolletjes voor gebruikers in admin panel
- Helpt admins snel zien wie beschikbaar is

## Technische Details

### Database Queries
- Gebruikt bestaande `availability` tabel
- Query filtert op `date = today`
- Batch queries voor performance
- Geen extra database wijzigingen nodig

### Performance Optimalisaties
- Daily caching in de hook
- Conditional fetching
- Batch queries voor meerdere users
- Minimale re-renders

### Styling
- Consistent met bestaande design system
- Dark mode ondersteuning
- Responsive design
- Accessibility (tooltips, ARIA labels)

## Gebruik van de Status Indicator

```tsx
<MemberAvatar
  firstName={member.first_name}
  lastName={member.last_name}
  profileImage={member.profile_image_url}
  size="md"
  statusIndicator={{
    show: true,
    status: todayAvailability[member.member_id],
    tooltip: "Aangepaste tooltip tekst" // optioneel
  }}
/>
```

## Voordelen

1. **Overzichtelijk**: Directe visuele feedback over beschikbaarheid
2. **Universeel**: Status wordt consistent getoond op alle pagina's
3. **Performance**: Efficiënte data fetching met caching
4. **Gebruiksvriendelijk**: Tooltips voor duidelijkheid
5. **Responsive**: Werkt op alle schermformaten
6. **Toegankelijk**: Goede contrast verhoudingen en hover states

## Toekomstige Uitbreidingen

- Configureerbare kleuren per team
- Historische status trends in tooltips  
- Click handlers voor status wijzigingen
- Status voor andere datums dan vandaag
- Push notifications voor status wijzigingen
