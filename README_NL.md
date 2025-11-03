# AvPlanner

Een moderne teamplanning- en afwezigheidsapplicatie met Next.js 15, React 19, Supabase en Tailwind CSS.

- Engelse versie: [README.md](./README.md)
- Française: [README_FR.md](./README_FR.md)

## Snel starten

1. Vereisten
   - Node.js 20+ (aanbevolen)
   - PNPM
   - Supabase project (URL + Anon key)

2. Installatie
   - Kopieer `.env.local.example` naar `.env.local` (indien aanwezig) en vul de variabelen in
   - Installeer dependencies: `pnpm install`

3. Scripts
   - Ontwikkelserver: `pnpm dev`
   - Build: `pnpm build`
   - Start: `pnpm start`
   - Tests (unit): `pnpm test`
   - Dead code check: `pnpm deadcode`

## Belangrijkste features

- Teamkalender met bulk-updates
- Meertalige UI (i18n)
- Supabase-authenticatie en RLS
- Admin-dashboard en teambeheer

## Mapstructuur (uittreksel)

- `app/` — Next.js routes (App Router)
- `components/` — UI- en logica-componenten
- `hooks/`, `lib/` — herbruikbare logica
- `documentation/` — handleidingen & archief
- `database/scripts/` — SQL-scripts gebundeld

## Probleemoplossing

- Installeer dependencies opnieuw: `pnpm install`
- Typefouten? `pnpm exec tsc --noEmit`
- Testomgeving: zorg dat `jest-environment-jsdom` is geïnstalleerd

## Licentie

MIT, tenzij anders vermeld.
