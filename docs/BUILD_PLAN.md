# Build plan: one phase at a time

Each phase ends with: checks green, `docs/PROGRESS.md` updated, a commit, and a manual test checklist for the owner.
Do not start the next phase until the owner says so. Details for every feature are in `docs/PRODUCT_SPEC.md`.

## Phase 0: Clean base and tooling

- Delete everything listed under "Delete in Phase 0" in `docs/CURRENT_STATE.md`. Remove dead exports.
- Decide whether to keep the experimental Next flags (`cacheComponents`, `partialPrefetching`, `agentFeedback`). Keep them
  only if all tests pass and nothing hidden-page related needs workarounds; otherwise remove for stability, and record why.
- Add **Playwright** (`npm run e2e`) running against demo mode, with **axe-core**; a `/play` smoke test, an a11y check on
  every existing screen, and a 360 px overflow test.
- Add **GitHub Actions** CI (install, tsc, lint, unit, build, e2e), Prettier + a pre-commit hook, `.env.example` review.
- Add `docs/ARCHITECTURE.md` (mermaid diagram of modes, stores, sync) and `docs/adr/0001-keep-base.md`.
- New migration: drop the unused old `reminders`/`reminder_completions`; add `care_profiles.timezone`
  (default `Asia/Kolkata`) and `care_profiles.show_general_games boolean default false`.
- Hide the four generic games unless `show_general_games` is on (a toggle in the profile settings).
  Exit: clean tree, CI green, no dead routes, demo mode still works.

## Phase 1: Today board and reminders (in-app)

Features F1, F2, F12 of the spec: the Today board as the new `/play/[id]` home, the schedule builder in the family area
(photo + spoken text + recurrence), reminder cards on the tablet ("Done" / "Later"), carer "mark done", missed detection
on the device, the onboarding wizard for carers. Local-first; works in demo mode.
Exit: a carer can set up a person, three photos and a daily medicine reminder in under 10 minutes; the tablet shows it
at the right time, speaks it, and records the outcome; unit tests cover recurrence and "next occurrence" maths.

## Phase 2: PWA, sync engine and notifications

Feature F11 and the notification part of F2. Installable PWA, offline shell, IndexedDB outbox with
`pending/synced/failed` status, idempotent sync, screen wake lock in patient mode, Web Push for reminders and
carer alerts, a scheduled job that flags missed reminders and sends carer notifications and a daily e-mail digest, a
"tablet last seen" heartbeat. Be honest in the UI about what a browser can and cannot guarantee.
Exit: with the network off, patient mode shows reminders and records outcomes; they sync when back online; an e2e test
proves it; a missed reminder produces a carer notification in a dev environment.

## Phase 3: Familiar voices, Ask-me cards, call and help

Features F3, F4. Record and play voice answers (`MediaRecorder`), Ask-me cards, voice messages from family, one-tap call
(`tel:`), the "I need help" button and carer acknowledgement. Voice files in a private bucket, cached offline.
Exit: a family member records "Priya is coming at 5", the patient taps the card and hears it, offline too.

## Phase 4: Music, memories and My Day

Features F5, F6. Playlists from the family's own audio files or links, photo slideshows with captions, evening calm mode,
reminiscence prompts; "My Day" activity built from the person's real schedule items. Keep photo Memory Match and
Who is this? Respect copyright: only user-provided files or user-pasted links; no scraping.
Exit: a playlist plays offline on the tablet; the activity list shows only relevant, available activities.

## Phase 5: Carer timeline, mood log, reports and family sharing

Features F7, F8. Daily timeline, 3-face mood log with tags, weekly report (Recharts + print stylesheet to PDF, share via
a wa.me text), co-carer and viewer invitations with roles, audit log of sharing changes.
Exit: two accounts see the same person with different permissions (RLS tests prove it); a weekly report prints cleanly.

## Phase 6: Hindi and voice

Feature F10. i18n (English + Hindi), a Devanagari font, translated content, TTS where a good voice exists with recorded
voices preferred, language per profile. Exit: the full patient flow works in Hindi and passes the a11y checks.

## Phase 7: Hardening

Security review (RLS tests, storage policy tests, headers/CSP, rate limits on auth and invitations, input validation),
accessibility audit, performance budget, error tracking (privacy-scrubbed), backups note, legal pages, data export and
account deletion. Exit: the checklist in the spec section 12 is fully ticked or each gap is documented.

## Phase 8: Ship and evaluate

Deploy (Vercel + a separate production Supabase project), seed demo data and a demo script, evaluation kit
(`docs/EVALUATION.md`), carer and patient quick-start guides, report/viva material, and a one-page scope-change note for
the mentor linking the pivot to the evidence. Exit: a stranger can follow the README and run it; the demo works with no
internet using demo mode.

