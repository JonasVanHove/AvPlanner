# Quick Setup Instructions

## Database Migration

### 1. Voer Migration Uit
1. Ga naar **Supabase Dashboard** > **SQL Editor**
2. Kopieer en plak de volledige inhoud van `migration-step1.sql`
3. Klik **Run** om de migration uit te voeren

### 2. Test Without Login
1. Ga naar de landing page
2. Klik **Create Team** (zonder in te loggen)
3. Maak een team aan met een naam
4. Controleer of het team succesvol wordt aangemaakt

### 3. Test With Login
1. Registreer een nieuwe account
2. Ga naar **My Teams** dashboard
3. Klik **Create Team** vanuit het dashboard
4. Controleer of het team wordt aangemaakt met jou als creator

## Troubleshooting

### Error: "Could not find the 'created_by' column"
- **Oplossing**: Voer eerst `migration-step1.sql` uit in Supabase SQL Editor
- **Fallback**: De app werkt ook zonder migration, maar zonder admin functionaliteit

### Error: "Could not find the 'email' column"
- **Oplossing**: Voer de migration uit, dit voegt alle ontbrekende kolommen toe

### Teams niet zichtbaar na registratie
- **Oplossing**: Teams worden automatisch gelinkt op basis van email adres
- **Check**: Zorg dat je hetzelfde email adres gebruikt als toen je team member was

## Features na Migration

### ✅ Zonder Inloggen
- Teams aanmaken
- Teams joinen via invite code
- Basic functionaliteit

### ✅ Met Inloggen
- Teams worden automatisch gelinkt op basis van email
- Admin rechten voor teams die je hebt aangemaakt
- Role management (admin, can_edit, member)
- User dashboard met overzicht van alle teams

## Header Navigation

### Voor Guests (niet ingelogd)
- **Language selector** - Rechts bovenaan
- **Login + Register buttons** - Naast language selector

### Voor Authenticated Users (ingelogd)
- **Language selector** - Rechts bovenaan
- **User dropdown** - Avatar + naam met:
  - "My Teams" - Ga naar team dashboard
  - "Logout" - Uitloggen

De header is nu logischer ingedeeld met duidelijke visuele hiërarchie! 🎉
