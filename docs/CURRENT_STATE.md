# Current state (read this instead of exploring the repo)

## Stack and versions

Next.js 16.4.2 (App Router, Turbopack, **no experimental flags**: see `docs/adr/0002-next-flags.md`), React 19.3, TypeScript 5,
Tailwind v4, Supabase (`@supabase/ssr`, `supabase-js` 2), lucide-react, radix-ui Slot, class-variance-authority.
Node >= 22. Fonts via `next/font/google`: Atkinson Hyperlegible Next (body) and Bricolage Grotesque (headlines).
Unit tests: `node --test scripts/test-*.mjs` (42 tests, TypeScript compiled in-test). E2e: Playwright + axe in `e2e/`
(`npm run e2e`) against a demo-mode **production build on port 3100** (desktop 1280 px and phone 390 px).
Prettier (+ tailwind plugin) with a pre-commit hook (simple-git-hooks + lint-staged). CI: `.github/workflows/ci.yml`.
Architecture diagram: `docs/ARCHITECTURE.md`.
~6,600 lines in `app/`, `components/`, `lib/`.

## Routes

- `/` landing (with a playable mini Memory Match), `/auth/login`, `/auth/signup`, `/auth/callback`
- `/family` people list, PIN panel; `/family/profiles/[id]` progress, name, settings, remove;
  `/family/profiles/[id]/life-story` photos and names
- `/play` who is playing; `/play/[id]` home; `/play/[id]/games/[game]` a game (five game ids)
- `/patient/*` and `/caregiver/*` have no pages; `next.config.ts` redirects them to `/play` and `/family`.
- A hidden game's URL (`/play/[id]/games/...`) sends the person back to `/play/[id]` (`components/play/game-access.tsx`).

## Database

`supabase/setup_cognicare.sql` sets up the current schema for a new project. It includes profiles, care profiles,
game sessions and difficulty, Life Story photos with a private storage bucket, reminders, and reminder events.
RLS check: `supabase/tests/rls_reminders.sql` (rolls back). Future schema changes need new migrations.
RLS is owner-scoped everywhere. A helper schema `private` holds SECURITY DEFINER functions.

## Patterns to reuse

- **Store interfaces, two backends:** `lib/profiles/store.ts`, `lib/life-story/store.ts` (`cloud` + `local`). Cloud reads are
  cached in localStorage; photos cached in IndexedDB (`lib/life-story/photo-cache.ts`).
- **Local-first sessions:** `lib/games/session-history.ts` (per profile, localStorage) + `lib/supabase/sync.ts` (upload only
  what the cloud lacks; shared in-flight promise; 12 s timeout; clears the device after a successful sign-out sync).
- **Patient mode:** `components/play/*`; `usePlay()` gives the profile; PIN lock in `lib/profiles/pin.ts`
  (PBKDF2 hash; a convenience lock, not security) and `components/pin/*`; rest suggestion in `lib/play/session-timer.ts`.
- **Design system:** tiles with a lip (`tile` utility in `app/globals.css`), `components/ui/button.tsx`, per-game colours
  in `lib/games/theme.ts`. Tokens meet WCAG AA contrast.
- **Errorless questions:** `components/games/choice-rounds-game.tsx` (wrong answers fade, retry, only first try counts).
- **Which games show:** `lib/games/visible-games.ts` (general games only if `showGeneralGames`; Memory Match also with
  4+ photos; Who is this? with 3+ photos). `GameAccess` guards game pages.
- **New columns before the migration is run:** the cloud profile store retries with the old columns on error
  `42703`/`PGRST204` and explains when a save needs the update. Reuse this when adding columns.
- **Gentle adaptation:** `lib/games/memory-match.ts` `evaluateDifficulty` (two games at the same level), `lib/profiles/support.ts`.

## Gotchas (each cost time once)

- E2e runs against `next build && next start` on port 3100 (dev-mode compiles were too slow). Locally an existing
  server on 3100 is reused, so rebuild after code changes or stop it first.
- The pre-commit hook rewrites staged files with Prettier; run `npm run format:check` before pushing.
- ESLint `react-hooks/purity`: don't call `Date.now()`/`Math.random()` while rendering (wrap in a `timestamp()` helper used
  only in effects/handlers). `react-hooks/set-state-in-effect`: set state from async callbacks or `queueMicrotask`.
- `next build` needs internet for Google Fonts. In a sandbox, stub the fonts in a scratch copy.
- Server pages that read `params`/`searchParams` must sit inside a `<Suspense>`.
- `createClient()` returns `null` without Supabase env vars: that is **demo mode** (local backends). Keep it working.
- The exit PIN is client-side only. Do not store anything private behind it.
- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Keep / change / delete

- **Keep:** auth + RLS, profiles, patient mode + PIN, Life Story + photo cache, sync pattern, design system, errorless game
  UI, Memory Match with photos, Who is this?, tests.
- **Change next (Phase 1):** `/play/[id]` home becomes the **Today board**. `lib/site.ts` still describes the app as
  brain games; reword it with the Phase 1 home work.
- **Done in Phase 0:** old pages and components deleted, reminder tables dropped, general games opt-in.
