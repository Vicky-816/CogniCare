# Project Progress Tracker

**Project:** Adaptive Cognitive Gaming Platform for Elderly Users
**Team:** Yash (25001003145) & Vicky Gupta (25001003139). Supervisor: Ms. Abhilasha Yadav
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase · Recharts · PWA/IndexedDB

Legend: ✅ done · 🚧 in progress · ⬜ not started

---

## Phase overview

| #   | Phase                                          | Synopsis section | Status                                                                                        |
| --- | ---------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| 0   | Foundation (tracker, UI kit, theme, structure) | 1.2, 2.1         | ✅                                                                                            |
| 1   | Supabase setup + authentication + roles        | 2.2, 2.10        | ✅                                                                                            |
| 2   | Database schema + Row-Level Security           | 2.9              | ✅                                                                                            |
| 3   | Patient dashboard + first game (memory match)  | 2.3              | ✅                                                                                            |
| 4   | Adaptive difficulty engine (Levels 1–5)        | 2.4              | ✅ (rules live in `lib/games/memory-match.ts`)                                                |
| 5   | Remaining cognitive activities                 | 2.3              | ✅ (sequence, pattern, daily routine)                                                         |
| 6   | Reminders                                      | 2.5              | ⬜ (database tables exist, no screens yet)                                                    |
| 7   | Caregiver dashboard + charts                   | 2.7              | 🚧 (linking to patients works; dashboard and Recharts charts not built)                       |
| 8   | Voice (TTS / speech input) + multilingual      | 2.6              | ⬜                                                                                            |
| 9   | Offline mode (PWA + IndexedDB) + sync          | 2.8              | 🚧 (games save on the device with localStorage and sync to Supabase; PWA/IndexedDB not built) |
| 10  | Accessibility pass, polish, deploy             | 3.2              | 🚧 (large text, contrast, focus rings, skip link done)                                        |

---

## Phase 0: Foundation 🚧

- [x] Progress tracker (this file)
- [ ] shadcn/ui initialised (`components.json`, `lib/utils.ts`)
- [ ] Base components: Button, Card
- [ ] Elderly-friendly theme: large base text, high contrast, ≥ 48px touch targets, strong focus ring
- [ ] Readable font (Atkinson Hyperlegible, designed for low-vision readers)
- [ ] App name + metadata (replaces "Create Next App")
- [ ] Landing page
- [ ] Placeholder `/patient` and `/caregiver` areas with their own layouts
- [ ] `npm run build` and `npm run lint` pass

**How to see it:** `npm run dev`, then open http://localhost:3000

## Phase 1: Supabase + authentication ⬜

- [ ] Create Supabase project (manual step, done by the team)
- [ ] `.env.local` with Supabase URL + anon key
- [ ] Supabase client helpers (browser + server)
- [ ] Sign up (choose role: patient / caregiver) and log in pages
- [ ] Route protection: `/patient/*` for patients, `/caregiver/*` for caregivers
- [ ] Log out

## Phase 2: Database + security ⬜

- [ ] Tables: `profiles`, `caregiver_links`, `activities`, `sessions`, `difficulty_state`, `reminders`, `reminder_logs`
- [ ] Foreign keys + indexes
- [ ] Row-Level Security policies (patients see own data; caregivers see linked patients)
- [ ] SQL migrations committed under `supabase/migrations/`

## Phase 3: Patient dashboard + first game ⬜

- [ ] Patient home: big tiles for Games / Reminders / My Progress
- [ ] Shared game shell (instructions → play → completion screen)
- [ ] Memory matching game
- [ ] Session recording: score, accuracy, attempts, mistakes, completion, response time, difficulty, timestamp

## Phase 4: Adaptive difficulty ⬜

- [ ] Rule-based engine in `lib/adaptive/` (pure functions, unit tested)
- [ ] Rolling window of recent sessions
- [ ] Increase / keep / decrease level (1–5) per activity
- [ ] Store per-user, per-activity difficulty state

## Phase 5: Remaining activities ⬜

- [ ] Sequence recall
- [ ] Pattern completion
- [ ] Object identification
- [ ] Daily routine recall

## Phase 6: Reminders ⬜

- [ ] Caregiver creates reminders (medicine, hydration, activity, appointment)
- [ ] Title, category, time, recurrence, completion status
- [ ] Patient views today's reminders and marks them done
- [ ] Browser notifications where supported

## Phase 7: Caregiver dashboard ⬜

- [ ] Link caregiver ↔ patient
- [ ] Recent sessions table
- [ ] Charts (Recharts): accuracy, response time, difficulty over time, activity frequency
- [ ] Reminder completion + "needs attention" highlights (reduced activity, missed reminders)

## Phase 8: Voice + multilingual ⬜

- [ ] Text-to-speech for instructions and reminders (SpeechSynthesis)
- [ ] Basic speech input (Web Speech API) where supported
- [ ] Language resource files (English + Hindi to start)
- [ ] Language switcher

## Phase 9: Offline + sync ⬜

- [ ] Web app manifest + service worker (installable PWA)
- [ ] IndexedDB store for session results
- [ ] Sync queue with `pending` / `synced` / `failed` status, retry, no duplicates
- [ ] Online/offline indicator

## Phase 10: Polish + deploy ⬜

- [ ] Accessibility audit (keyboard, contrast, screen reader labels)
- [ ] Mobile / tablet testing
- [ ] Deploy to Vercel
- [ ] Demo data / seed accounts

---

## Folder structure (planned)

```
app/
  page.tsx                 Landing page
  (auth)/login, signup     Phase 1
  patient/                 Patient area (games, reminders, progress)
  caregiver/               Caregiver area (dashboard, reminders, patients)
components/
  ui/                      shadcn/ui components
  games/                   Game components (Phase 3+)
lib/
  utils.ts                 shadcn helper (cn)
  site.ts                  App name + shared constants
  supabase/                Supabase clients (Phase 1)
  adaptive/                Difficulty engine (Phase 4)
  offline/                 IndexedDB + sync (Phase 9)
  i18n/                    Language resources (Phase 8)
  voice/                   Speech helpers (Phase 8)
supabase/migrations/       SQL schema + RLS (Phase 2)
docs/PROGRESS.md           This file
```

## Decisions log

| Date       | Decision                                                                             | Reason                                                                                     |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 2026-10-16 | Use real URL segments `/patient` and `/caregiver` (not route groups)                 | Makes role-based route protection in Phase 1 a simple path check                           |
| 2026-10-16 | Atkinson Hyperlegible as the main font                                               | Designed by the Braille Institute for low-vision readers                                   |
| 2026-10-16 | Light theme only for now                                                             | Highest contrast and least confusion; dark mode can be added later                         |
| 2026-10-16 | Keep `cacheComponents: true` from the starter config                                 | Per-user pages in Phase 1+ must read auth data inside `<Suspense>`                         |
| 2026-10-28 | Difficulty only changes after two games AT THE SAME level                            | Before this, one good game right after moving up moved the player up again                 |
| 2026-10-28 | Each game level has six questions; a game picks three at random                      | Before this, all three rounds of Pattern Practice / Daily Routine showed the same question |
| 2026-10-28 | Games start from the device history immediately; account sync runs in the background | The game used to wait for a network request before showing                                 |
| 2026-10-28 | Local history is cleared on sign-out only after a successful sync                    | Protects privacy on shared tablets without losing unsynced games                           |

## Remodification phase (people-centred rework)

Why: generic memory games already exist on every app store. The evidence for dementia care favours stimulation that is
social, enjoyable and personal, so the app is being reworked around the person and their family.

| Part | What                                                                                                 | Status |
| ---- | ---------------------------------------------------------------------------------------------------- | ------ |
| R1   | Care profiles, patient mode (no patient login), family area, exit PIN, results saved per person      | ✅     |
| R2   | Calm mode: failure-free feedback, hidden scores, gentle rest reminder, support levels 1-3            | ✅     |
| R3   | Life Story: family photos and names (private Supabase Storage, cached on the device for offline use) | ✅     |
| R4   | Personalised games: Memory Match from own photos, "Who is this?"                                     | ✅     |

### R1 decisions

| Date       | Decision                                                                               | Why                                                                                       |
| ---------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-11-10 | A family member signs in and manages "care profiles"; the person playing never logs in | Asking a person with dementia to create an account and remember a password is unrealistic |
| 2026-11-10 | `/patient` and `/caregiver` became `/play` (patient mode) and `/family`                | One signed-in account, two modes                                                          |
| 2026-11-10 | The exit PIN is a convenience lock, stored only as a salted hash                       | It prevents accidental exits; nothing private depends on it                               |
| 2026-11-10 | Profiles live in Supabase, with a local demo backend when Supabase is not configured   | Lets the whole app be demonstrated offline                                                |
| 2026-11-10 | The old caregiver-approval tables stay in the database, but their screens are hidden   | May return later as "share a profile with another family member"                          |

### R2-R4 decisions

| Date       | Decision                                                                                                                        | Why                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 2026-11-12 | In patient mode a wrong answer is never marked: the answer fades, the game says "Let us look again", and the person tries again | Avoids failure and distress; only first-try answers count towards the accuracy the family sees |
| 2026-11-12 | Patient mode shows no scores, levels, mistakes or timers. The family area shows all of them                                     | The person plays; the carer reads the data                                                     |
| 2026-11-12 | Difficulty still adapts, silently. A "support level" (1-3) caps the level and the number of answers                             | Family control without medical labels                                                          |
| 2026-11-12 | The session length only suggests a rest, it never locks anyone out                                                              | A person must never be cut off mid-game                                                        |
| 2026-11-12 | Photos are shrunk to about 800 px JPEGs, stored in a private bucket, and cached on the device (IndexedDB)                       | Privacy, small storage, and games that work offline                                            |
| 2026-11-12 | "Who is this?" appears only when there are at least 3 photos; photo Memory Match needs at least 4                               | A game that cannot be played is never shown                                                    |

## CogniCare pivot (care companion), branch `pivot/care-companion`

Plan: `docs/BUILD_PLAN.md`. CogniCare supports daily life and carers; it is not a medical device.

| Phase | What                                                                         | Status |
| ----- | ---------------------------------------------------------------------------- | ------ |
| 0     | Clean base: dead code removed, e2e + axe, CI, Prettier, migration, games off | ✅     |
| 1     | Today board, schedule builder, reminders, onboarding                         | ⬜     |

### Phase 0 (2026-11-13)

- [x] Old `/patient` and `/caregiver` pages and the caregiver-approval components deleted (redirects kept)
- [x] Playwright + axe e2e: smoke, accessibility on every page, no sideways scroll at 360 px, general-games toggle
- [x] Experimental Next.js flags removed (`docs/adr/0002-next-flags.md`)
- [x] Prettier + pre-commit hook; whole repo formatted in one commit (`.git-blame-ignore-revs`)
- [x] GitHub Actions CI (demo mode, no secrets)
- [x] Migration `20261113000100_phase0_cleanup.sql`: old reminder tables dropped, `timezone` and `show_general_games`
- [x] The four general games are hidden unless the carer turns on "Show general games"
- [x] `docs/ARCHITECTURE.md`, `docs/adr/0001-keep-base.md`, `docs/CURRENT_STATE.md` updated
- [ ] Owner: run the migration in the **development** Supabase project

### Phase 0 decisions

| Date       | Decision                                                                        | Why                                                                   |
| ---------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 2026-11-13 | Keep the existing codebase as the base                                          | Auth, RLS, profiles, Life Story and sync already work and are tested  |
| 2026-11-13 | Remove `cacheComponents`, `partialPrefetching` and `agentFeedback`              | Left pages stayed mounted with old state; no caching APIs were in use |
| 2026-11-13 | General games hidden by default; Memory Match still shows with 4+ family photos | A daily-life companion first; personal photo games stay meaningful    |
| 2026-11-13 | E2e runs against a production build in demo mode                                | Fast, stable, and needs no Supabase project or secrets                |
| 2026-11-13 | The app keeps working if the new columns are missing, and says when to update   | The owner runs migrations by hand; demo mode must never break         |
