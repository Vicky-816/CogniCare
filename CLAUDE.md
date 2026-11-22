# CogniCare: a caregiver-led companion for people living with dementia

Capstone project (B.Tech CSE, JC Bose University YMCA, Faridabad). The owner is **non-technical**: explain simply,
give exact click/command steps, and never run destructive commands without asking.

## What it is

A PWA with two modes: **patient mode** (`/play`, a tablet used by the person) and the **family area** (`/family`, used
by the carer). It supports daily living (Today board, reminders, familiar voices, music, photos) and relieves carers.
It is **not a medical device**. Never claim to diagnose, treat, slow or improve dementia.

## Read on demand (do not preload)

- `docs/PRODUCT_SPEC.md`: features, data model, security, accessibility, evaluation
- `docs/BUILD_PLAN.md`: phases with exit criteria (work one phase at a time)
- `docs/CURRENT_STATE.md`: what exists today, patterns to reuse, gotchas
- `docs/PROGRESS.md`: update at the end of every phase

## Commands

`npm run dev` · `npm run lint` · `npm test` · `npm run build` · `npx tsc --noEmit` · `npm run e2e` (added in Phase 0)
Before saying a task is done: tsc + lint + tests pass, and any touched user flow has an e2e test.

## Non-negotiables

1. **Patient mode is calm and errorless:** no scores, levels, timers, red colour or cross marks; targets at least 48px;
   text at least 18px; one obvious action per screen. See the `patient-ui-rules` skill.
2. **Local-first:** patient mode keeps working offline after first load. Writes go to the device first, then sync.
3. **Privacy:** every row owner/member-scoped with RLS; photos and voice in private buckets; no third-party trackers;
   no personal data in logs or error reports.
4. **Every table:** RLS on, policies written, idempotent timestamped migration in `supabase/migrations/`.
   See the `db-migration` skill.
5. **Ask before adding a dependency.** No secrets in git. Never point MCP or the CLI at a production Supabase project.
6. **Accessibility:** WCAG 2.2 AA. Every new screen gets an axe check in e2e. See the `verify-ui` skill.

## Conventions

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 tokens in `app/globals.css` (never hard-code colours).
- Data access goes through store interfaces with a `cloud` (Supabase) and a `local` (browser) backend, so the whole app
  runs in demo mode with no Supabase. New data follows the same pattern (`lib/profiles/store.ts`, `lib/life-story/store.ts`).
- Per-person data is keyed by `profileId`. A signed-in account owns profiles.
- Small commits, conventional messages (`feat:`, `fix:`, `docs:`). One phase = one branch/PR.
- After each phase: update `docs/PROGRESS.md`, then **stop** and give the owner a short manual test checklist.

## Compact instructions

When compacting keep: failing test output, the list of changed files, open decisions and the current phase.
