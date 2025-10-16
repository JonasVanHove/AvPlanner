<div align="center">
  <img src="public/web-app-manifest-512x512.png" alt="AvPlanner Logo" width="120" height="120" />

  <h1>AvPlanner</h1>
  <p><strong>Plan availability. Align teams. Ship faster.</strong></p>

  <p>
    <a href="https://vercel.com/jonasvh39-gmailcoms-projects/v0-full-stack-availability-planner"><img src="https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel" /></a>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>
</div>

## Why AvPlanner?

AvPlanner is the fast, friendly way to track team availability. Built for high-velocity teams who need clarity at a glance—on desktop and mobile. Your schedule, your rules: weekend logic, admin controls, data export, and a polished UI that matches your brand.

### Highlights

- 🗓️ Interactive, keyboard-friendly calendar with bulk updates
- 👥 Team management with roles and access controls
- 🌍 Multilingual (EN/NL/FR), ready for international teams
- 📊 Yearly analytics with smart weekend logic (admin-configurable)
- 🎨 Themes, dark mode, and tasteful neon accents in dark UI
- ⚡ Real-time updates via Supabase
- 📤 Export to CSV/Excel/JSON
- 📱 Mobile-first interactions and gestures

## Screenshots

> Add your screenshots or animated GIFs here for maximum impact.
>
> Example:
> - Calendar view (light/dark)
> - Team overview (/my-teams)
> - Analytics & export

## Quick Start

Prerequisites: Node.js 18+, pnpm (or npm), Supabase project.

1) Clone & install
```bash
git clone https://github.com/JonasVanHove/availability-planner.git
cd availability-planner
pnpm install
```

2) Env vars
```bash
cp .env.example .env.local
```
Fill in Supabase keys and app settings.

3) Database (Supabase)
Run the SQL scripts in `scripts/` (or your chosen migration flow).

4) Dev server
```bash
pnpm dev
```
Open http://localhost:3000

## Tech Stack

- Next.js 14, React, TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Realtime)
- Deployed on Vercel

## Project Structure

```
app/                # Next.js App Router
components/         # UI + feature components
hooks/              # Custom hooks
lib/                # Utilities, providers
public/             # Static assets
scripts/            # Database scripts
styles/             # Tailwind and global styles
```

## Contributing

PR’s welcome! Please open an issue if you plan a larger change.

1. Fork the repo
2. Create a feature branch
3. Commit with clear messages
4. Open a PR with context and screenshots

## License

MIT — see [LICENSE](LICENSE).

## Credits

- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Backend by [Supabase](https://supabase.com/)
