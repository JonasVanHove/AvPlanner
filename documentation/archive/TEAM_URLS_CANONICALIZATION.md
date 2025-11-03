# Team URL Canonicalization

This project treats a team's invite_code as the canonical identifier for routing. Friendly slugs still work as entry points, but the app will normalize URLs to the invite_code form to keep links consistent and avoid ambiguity.

## What canonicalization does

- Any team page under `/team/[slug]` will redirect client-side to `/team/{invite_code}` when `[slug]` is a friendly slug instead of the invite_code.
- The same applies to settings: `/team/[slug]/settings` -> `/team/{invite_code}/settings`.
- Subpaths are preserved on redirect (e.g., `/team/my-friendly-slug/week/2025/10/28` becomes `/team/ABCD1234/week/2025/10/28`).
- The My Teams UI already links to canonical URLs using invite_code, so canonicalization mainly catches manual or legacy links.

## Where it lives

- Calendar: `app/team/[slug]/page.tsx`
  - Resolves the team by invite_code or slug.
  - If the incoming segment differs from `invite_code`, it `router.replace()` to `/team/{invite_code}{suffix}` and stops further processing.
- Settings: `app/team/[slug]/settings/page.tsx`
  - Resolves the team and performs the same `router.replace()` to `/team/{invite_code}/settings` when needed.
- Middleware: `middleware.ts` currently passes through; canonicalization is client-side for now to avoid DB lookups at the edge.

## Behavior and edge cases

- Team not found
  - Calendar page shows a "Team not found" state with the attempted code displayed.
  - Settings page shows an error banner; no redirect loop occurs.
- Password-protected teams
  - Canonical redirect still happens; after landing on the canonical path, the password prompt appears as usual (no bypasses).
- Multiple teams per user
  - No change. My Teams continues to route to `/team/{invite_code}` for the selected team; canonicalization just ensures friendly slugs normalize if used.
- Unauthenticated users
  - Calendar page loads public info or password prompt as before; canonical redirect is independent of auth state.
- SEO/SSR
  - Redirect is currently client-side, so crawlers may briefly see the non-canonical URL. If SEO strictness is required, consider adding a server-side/middleware redirect with a cached slug→invite_code mapping to avoid per-request DB calls.

## How to validate quickly

1. From My Teams, click "Manage Team" or "View Calendar" and observe URLs use `/team/{invite_code}` (canonical).
2. Manually visit a friendly slug URL, e.g. `/team/efficiency-team/settings`.
   - You should land on `/team/{invite_code}/settings` for that team.
3. If the team is password-protected, the password form still shows after redirect.
4. Visit an unknown code like `/team/unknown-code`.
   - You should see the "Team not found" state.

## Future improvement (optional)

- Add an opt-in server-side canonical redirect in `middleware.ts` backed by a static map or edge cache for popular slugs to improve SEO and reduce client work.
