# AvPlanner

Application moderne de planification d'équipe et de gestion des absences, basée sur Next.js 15, React 19, Supabase et Tailwind CSS.

- English: [README.md](./README.md)
- Nederlands: [README_NL.md](./README_NL.md)

## Démarrage rapide

1. Prérequis
   - Node.js 20+
   - PNPM
   - Projet Supabase (URL + Anon key)

2. Installation
   - Copier `.env.local.example` vers `.env.local` (si présent) et compléter les variables
   - Installer les dépendances : `pnpm install`

3. Scripts
   - Dév: `pnpm dev`
   - Build: `pnpm build`
   - Start: `pnpm start`
   - Tests (unitaires): `pnpm test`
   - Vérification de code mort: `pnpm deadcode`

## Principales fonctionnalités

- Calendrier d'équipe avec mises à jour groupées
- Interface multilingue (i18n)
- Authentification Supabase et RLS
- Tableau de bord admin et gestion d'équipes

## Structure des dossiers (extrait)

- `app/` — routes Next.js (App Router)
- `components/` — composants UI et logique
- `hooks/`, `lib/` — logique réutilisable
- `documentation/` — guides & archive
- `database/scripts/` — scripts SQL groupés

## Dépannage

- Réinstaller les dépendances : `pnpm install`
- Problèmes de types ? `pnpm exec tsc --noEmit`
- Environnement de test : vérifier `jest-environment-jsdom`

## Licence

MIT, sauf mention contraire.
