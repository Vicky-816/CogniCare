# CogniCare product specification

## 1. Vision, users and scope

**Vision:** a calm, caregiver-led companion that makes everyday life easier for a person living with mild to moderate
dementia and for the people who care for them. It answers repeated questions, keeps the day orderly, brings familiar
faces, voices and music close, and gives carers a clear picture of the day.

**Personas**

- **Amma (patient):** 70s, mild to moderate dementia, limited tech experience, may read slowly, prefers Hindi, repeats
  questions ("What day is it? When is Priya coming?"), calmer with familiar voices and old songs, tires quickly.
- **Priya (primary carer):** adult child living with or near Amma, stretched thin, short on time, comfortable with a
  smartphone, wants fewer interruptions and less guilt.
- **Rohan (remote family):** lives in another city, wants to stay present: record a voice message, see how the day went.
- **Care worker / nurse (later):** reads the daily log and the weekly report; does not manage accounts.

**Jobs to be done:** know what day and part of the day it is; remember medicine, meals, water and visits; get reassurance
without asking the carer again; enjoy music and photos; stay in touch with family; let carers see a trustworthy daily
summary without constant calls.

**Non-goals:** diagnosis, treatment claims, cognitive scoring, emergency services, GPS/location tracking, social
network features, advertising, selling data. The person is never tested.

## 2. Evidence and claim discipline

Use evidence to justify design, not to promise outcomes. Verify every citation before it goes into the report.

- Cognitive stimulation (social, enjoyable, person-centred activity) has the best evidence among non-drug approaches;
  repetitive "brain training" has weak evidence for dementia (Cochrane reviews of cognitive stimulation and of cognitive
  training; NICE dementia guideline 2018). Therefore generic puzzles are optional and never the product's core.
- Personalised reminiscence (own photos, stories, music) engages people more than generic content (reminiscence app literature).
- Music-based interventions: Cochrane reviews report probable benefit for depressive symptoms and overall behaviour, with
  mixed results for agitation; responsiveness to music can persist into later stages.
- Assistive technology (reminders, orientation aids, calendar clocks, communication aids): reviews are mixed overall and
  stress fit to the individual, simple interfaces and visual plus spoken prompts; some report reduced carer burden.
- Digital interventions for family carers can reduce burden (meta-analyses; cite the ones in the synopsis).
  **Allowed wording:** "supports daily routines", "helps carers", "familiar and calming". **Forbidden:** "improves memory",
  "treats", "prevents", "clinically proven", "reduces dementia symptoms". Add the disclaimer "CogniCare is not a medical
  device and does not diagnose or treat any condition" to the footer, onboarding and report.

## 3. Product principles

1. **Caregiver-led.** The carer configures; the person just taps. No account, password or typing for the person.
2. **Dignity.** Adult tone. Never infantilise, never test, never show failure.
3. **Familiar first.** Own photos, own voices, own music, own routine.
4. **Calm.** Few elements, gentle motion, no urgency or red. The tablet is a quiet object in the home.
5. **Reliable beats clever.** Offline-first; honest about limits; fail soft; a missed reminder is surfaced to the carer.
6. **Privacy by default.** Collect the minimum, keep it private, make deletion easy.
7. **Honest.** No clinical claims; state what the app cannot guarantee (for example, browser alarms).

## 4. Information architecture

- **Public:** landing, sign in/up, privacy policy, terms, "how it works" page, demo mode link.
- **Family area `/family` (carer, laptop or phone):** people list; per person: Today schedule, Reminders, Ask-me cards,
  Contacts, Life story (photos), Music and memories, Daily log and reports, Settings (support level, language, quiet
  hours, rest length, show general games), Family members and invitations, Devices (last seen), Data export/delete.
- **Patient mode `/play/[id]` (tablet):** Today board (home) with the next thing, the clock in words, big buttons:
  _What is happening?_ (Ask-me cards), _Music_, _Photos_, _Call_, _Help_, and _Activities_ (only available ones).
  A small "Family" button leads out behind the PIN. Installed as a PWA on a dedicated Android tablet.
- **Remote family `/join/[token]`:** accept an invitation; contributor role can record voice messages and add photos.

## 5. Feature specifications

Each feature lists behaviour and acceptance criteria (AC).

### F1 Today board (home of patient mode)

Shows in words: "It is Tuesday afternoon, 14 November." Part of day (morning/afternoon/evening/night) with a calm
background. "Now": the current/next item from the schedule with its photo. "Later today": up to three items. If nothing
is scheduled: a warm line and the Music button. Updates every minute without flicker. Works offline.
AC: correct for the profile's timezone; no digits-only time; readable at 2 m; passes axe; renders from local data first.

### F2 Schedule and reminders

Carer creates items: title, kind (medicine, meal, water, activity, visit, appointment, other), recurrence (once, daily,
chosen weekdays), times, optional photo (from Life story), optional recorded voice or spoken text, grace window
(default 30 min), "needs carer confirmation" (for medicine). On the tablet a reminder appears as a full-screen gentle card
with chime, spoken text and two buttons: **Done** and **Later (10 min)**; after the grace window it becomes **missed**
and the carer is notified. The carer can mark done remotely. Quiet hours suppress chimes (not the card).
Edge cases: timezone changes, device asleep, clock changes, duplicate firing (idempotent by `reminder_id + due_at`),
editing a recurring item (applies from now on), deleting (history kept).
AC: unit tests for next-occurrence and missed logic across weekdays/timezones; e2e: due reminder shows, speaks, records
outcome; offline works; a missed reminder is flagged in the family area.
Honest limit: web apps cannot guarantee alarms when the browser is closed. Mitigate with screen wake lock, an installed PWA,
Web Push, "tablet last seen" and a clear setup guide (keep the tablet charging, app open, screen pinned).

### F3 Ask-me cards and voice messages

Carer (or a contributor) creates cards: a question the person repeats ("Where is Priya?") with an answer in text, an
optional recorded voice answer and optional photo. The patient taps a big card and hears/reads the answer. Family can send
voice messages ("Good morning Amma"), shown as a gentle "Message from Rohan" with a play button; played state is logged.
Recording uses `MediaRecorder` (store the recorder's mime type; accept webm/opus and mp4), max 60 s, with preview and
re-record, and a consent line when recording another person. AC: record, play, delete; works offline once cached; the
audio plays on Android Chrome; file size capped; private bucket; cascade delete including storage objects.

### F4 Call and help

Contacts with photo and number; the patient taps a photo, and `tel:` opens the dialer (one confirmation, large "Call"
button). "I need help" creates a help request, notifies carers (push and e-mail) and shows a calm "Help is on the way:
Priya knows" screen; the carer acknowledges. It is not an emergency service: say so in setup and on the button's
first use. AC: works offline by queueing the request and showing honest status ("will send when connected").

### F5 Music and memories

Playlists per mood (morning, afternoon, evening calm). Items: audio files uploaded by the family (their own recordings or
purchases they are free to use) or pasted links (opened in a new tab or embedded if allowed). Never scrape or download from
streaming services. Photo slideshows from Life story with captions read aloud. Reminiscence prompts ("Tell me about your
wedding day") for the carer to use beside the person. Evening calm mode: dim palette, slow slideshow, soft music, no
notifications. AC: offline playback of uploaded audio; large controls; sleep timer; volume cap set by the carer.

### F6 Activities (secondary, optional)

Keep: Memory Match with photos, Who is this? (errorless), and add **My Day** (put the steps of the person's own routine in
order, using their real schedule items and photos). The four generic games (Memory Match with icons, Sequence Recall,
Pattern Practice, Daily Routine) are hidden unless "show general games" is on. Calm rules apply; the adaptive engine and
support levels stay. Only show activities that can run (enough photos, etc.).

### F7 Daily log, timeline and weekly report (carer)

Timeline of the day: reminders (done/missed), messages played, music listened, activities, help requests, tablet last
seen. Carer adds a **3-face mood** (calm/mixed/unsettled), tags (slept well, poor appetite, agitated, visitors) and a note;
quick-add from a phone. Weekly report: adherence %, mood trend, activity engagement, notable tags; charts (Recharts) and a
print stylesheet for PDF; share as a text summary via a `wa.me` link. Wording is descriptive ("tablet used 5 of 7 days"),
never interpretive or diagnostic. AC: correct numbers on seeded data; prints on one A4 page; no personal data in the share URL.

### F8 Family members and sharing

Roles: **owner** (all), **carer** (everything except deleting the person/account), **contributor** (add photos, voice
messages, ask-me answers), **viewer** (read the timeline and reports). Invitation by e-mail link with an expiring,
single-use token (store only a hash); the invitee must sign in; the owner can change roles and remove members; all changes
go to an audit log. RLS enforces roles via `private.can_access_profile`. AC: RLS tests for each role and for outsiders.

### F9 Settings

Per person: name, photo, language, timezone, support level 1 to 3, rest suggestion length, quiet hours, volume cap, show
general games, music default mood, PIN (account level). Preview patient mode from the family area without leaving it.

### F10 Languages and voice

English and Hindi (all patient content and the family UI). Use `next-intl` or an equally light i18n layer; keep message files
reviewed by a native speaker. Fonts: a Devanagari font alongside the Latin fonts; verify line height. Web Speech TTS for
reminders where a decent voice exists (check availability); **prefer recorded voices**; fall back to text. Do not machine-translate
medical or safety text without a human check.

### F11 PWA and offline

Installable (manifest, icons, maskable), service worker precaching the patient shell and runtime caching of photos/audio,
IndexedDB **outbox** for writes (reminder outcomes, help requests, logs, messages played), `pending/synced/failed` status with
retry and backoff, idempotent server writes using client-generated UUIDs, conflict rules (append-only events: never
overwritten; settings: last write wins with timestamps), update prompt that never interrupts the person ("update when the
carer opens the family area"), and "storage almost full" handling. Choose the maintained service-worker approach for Next 16
with Context7 (for example Serwist); if unsupported, hand-write a small worker.

### F12 Carer onboarding

A wizard with a visible checklist: (1) add the person, (2) add three photos, (3) add the first reminder, (4) set the PIN,
(5) install on the tablet (a printable one-page guide with screenshots, including Android screen pinning and keeping the app
open), (6) try patient mode. Progress is saved. Empty states always explain the next step in plain language.

### F13 Demo mode and seed data

Without Supabase env vars the app runs fully in the browser. Provide a "Load demo family" button that creates "Amma" with
sample (licensed or self-made) photos, a schedule, ask-me cards, a playlist of royalty-free audio, and a week of history so
reports are not empty. This is the viva safety net: it works with no internet.

### F14 Privacy tools

Export all of a person's data (JSON + media zip), delete a person (cascades, including storage), delete the account,
clear this device (sign-out cleanup already exists). Visible, plain-language privacy page and consent text at every upload.

## 6. Data model (Supabase Postgres; all tables RLS-protected)

Existing: `profiles`, `care_profiles` (+timezone, language, support_level, session_minutes, show_general_games),
`account_settings` (PIN hash), `sessions`, `results`, `profile_difficulty`, `memory_items`.
New (use `profile_id`, `owner_id`, `created_at`; add `created_by` where a member writes):

- `care_members(profile_id, user_id, role)` and `invitations(id, profile_id, email, role, token_hash, expires_at, accepted_at)`
- `reminders(id, profile_id, title, kind, schedule jsonb, times, photo_item_id, voice_path, speak_text, grace_minutes,
needs_confirmation, active)`; `reminder_events(id, reminder_id, profile_id, due_at, status pending|done|skipped|missed,
acted_by, acted_at, device_id; unique(reminder_id, due_at))`
- `answer_cards(id, profile_id, question, answer_text, audio_path, photo_item_id, sort)`
- `voice_messages(id, profile_id, from_name, audio_path, duration_s, created_by, played_at)`
- `contacts(id, profile_id, name, phone, photo_item_id, sort)`; `help_requests(id, profile_id, created_at, acknowledged_by, acknowledged_at)`
- `media_items(id, profile_id, kind, title, storage_path, url, mood)`; `playlists`, `playlist_items`
- `daily_logs(id, profile_id, day, mood smallint, tags text[], note, created_by)`
- `devices(id, profile_id, name, last_seen_at)`; `push_subscriptions(id, user_id, device_id, endpoint, p256dh, auth)`
- `audit_log(id, actor, profile_id, action, target, at)`
  Buckets (private): `life-story` (exists), `voice`, `media`; path `<owner id>/<profile id>/<file>`; size and MIME limits per bucket.
  Rules: indexes on `(profile_id, due_at)` and `(profile_id, day)`; checks on lengths; time stored as `timestamptz`, schedule
  times as local `time` plus the profile timezone; migrations idempotent and ordered; seed script for dev.

## 7. Architecture

- **Layers:** UI components → hooks → store interfaces (`cloud` | `local`) → Supabase / IndexedDB. No component talks to Supabase directly.
- **Local-first:** reads come from the device first; writes enter the outbox then sync; the cloud is the shared source of truth.
- **Scheduler on the device:** compute the next occurrences from the schedule locally (a pure, well-tested function); a
  1-minute tick plus visibilitychange re-check; do not rely on `setTimeout` alone.
- **Server jobs:** Vercel Cron or Supabase `pg_cron` + Edge Function every 5 minutes to mark `missed` and notify carers; a
  daily digest e-mail; push via Web Push (VAPID keys in env). E-mail via a transactional provider (for example Resend).
- **Auth:** Supabase Auth (e-mail + password, e-mail confirmation); session cookies via `@supabase/ssr`.
- **API surface:** prefer direct Supabase client calls under RLS; use Next Route Handlers/Server Actions only for secrets
  (push, e-mail, invitations). Validate all inputs with a schema library (ask before adding, for example zod).
- **Observability:** structured, PII-free logs; error tracking with scrubbing; a `/api/health` route.

## 8. Security and privacy

- **Data classes:** account data; person's name; photos and voices of the person and of third parties; routine and mood logs
  (health-adjacent, treat as sensitive). Collect the minimum; no analytics that fingerprint; no third-party trackers.
- **Consent and notice:** plain-language privacy notice; consent when uploading a photo or recording of another person;
  purpose limitation (used only inside the app); retention (kept until deleted); erasure and export. Design for the principles
  of India's Digital Personal Data Protection Act, 2023 (notice, consent, purpose limitation, minimisation, security safeguards,
  erasure, breach handling) and verify current obligations with the college or legal guidance; this is a student project but
  handles sensitive data, so behave as if it were real.
- **Access control:** RLS everywhere, membership roles, SECURITY DEFINER helpers with `set search_path = ''`, least-privilege
  grants, no service-role key in the browser, signed/authorised storage access only.
- **Web security:** HTTPS/HSTS, CSP (nonce or hashes), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`,
  secure cookies, CSRF-safe server actions, output encoding, upload validation (type, size, dimensions, strip EXIF/GPS by
  re-encoding, which the app already does for photos), rate limits on login, signup, invitations and uploads.
- **PIN:** a convenience lock only; never protect secrets with it.
- **Secrets:** `.env.local` never committed; `.env.example` documented; Vercel env vars per environment; rotate keys on leak.
- **Threats to model (write `docs/THREAT_MODEL.md`):** stolen tablet, shared device, curious visitor, ex-family member with an
  old invitation, malicious uploads, enumeration of ids, over-broad storage policies, push endpoint leakage.
- **Incident basics:** how to revoke a member, rotate keys, delete a person, and what to tell users.

## 9. Accessibility, UX and language

- WCAG 2.2 AA minimum for the whole app; patient mode aims for AAA contrast where possible; focus visible; skip link; semantic
  landmarks; labels on every control; live regions for status; `prefers-reduced-motion`; text resizing to 200% without loss.
- Patient mode rules: see the `patient-ui-rules` skill. Family area is calm but denser; mobile-first for carers.
- Plain language, short sentences, reading age about 12; no idioms; test with a screen reader (NVDA/TalkBack) at least once.
- Hindi: layout tested with Devanagari, 30% longer strings; numerals consistent; right-to-left not needed.
- Empty, loading, error and offline states are designed, not defaults. Every error says what happened and what to do.

## 10. Quality, testing and performance

- **Unit:** pure logic (schedule maths, adaptive rules, sync/outbox, role checks). Keep the current `node --test` suite or move
  to Vitest if asked and approved.
- **Component/flow:** Playwright in demo mode for every user flow; offline tests with `setOffline`; axe on every route; 360/390/1280 px.
- **Database:** RLS tests with two accounts against the dev project (a script that signs in as each and attempts forbidden actions).
- **CI:** GitHub Actions on every PR: install, tsc, lint, unit, build, e2e; fail on warnings that matter; Dependabot or Renovate.
- **Performance budget (patient mode, mid-range Android on 4G):** LCP under 2.5 s, initial JS under about 200 KB gzip,
  photos at most 800 px, lazy-load media, no layout shift, works from cache offline. Measure with Lighthouse CI.
- **Code quality:** TypeScript strict, no `any` without a comment, small modules, no dead code, conventional commits.

## 11. Operations

- **Environments:** local (demo or dev Supabase), preview (per PR, dev Supabase), production (separate Supabase project and Vercel
  project). Never share keys across them.
- **Releases:** merge to `main` after CI; Vercel deploy; apply migrations to production by hand from the SQL files, in order,
  after a backup; keep a rollback note per migration.
- **Backups:** enable Supabase backups for the production project; document restore steps; test one restore.
- **Monitoring:** uptime check on `/api/health`; error tracking with scrubbing; Vercel/Supabase usage alerts (stay inside free tiers
  and say what happens when they are reached).
- **Cost note:** estimate monthly cost at 1, 100 and 1,000 families (Supabase storage and egress dominate because of photos/audio).

## 12. Production-readiness checklist (Phase 7 exit)

- [ ] RLS tests pass for every role and outsider; storage policies tested; no table without RLS.
- [ ] Security headers and CSP verified; rate limits in place; invitations expire and are single-use.
- [ ] Privacy page, terms, disclaimer, consent text, export and delete work end to end (including storage objects).
- [ ] axe clean on every route; keyboard and screen-reader pass done once; 360 px has no sideways scroll.
- [ ] Offline: patient mode works with the network off; outbox syncs; failure states are visible.
- [ ] Performance budget met on a mid-range Android; Lighthouse PWA installable.
- [ ] Error tracking with PII scrubbing; health route; backups enabled and restore tested once.
- [ ] CI green; README lets a stranger run it; `docs/ARCHITECTURE.md`, `THREAT_MODEL.md`, ADRs current.
- [ ] Demo mode and seed data work with no internet. Known limitations are written down honestly.

## 13. Evaluation plan and ethics (for the report and viva)

- **Needs finding (before building each big feature):** interview 3 to 5 family carers (a dementia-care society or day-care
  centre can introduce you). Ask for their hardest hour, repeated questions, medicine routine, what they tried and why it failed.
  Get informed consent, record nothing without permission, anonymise, store notes safely. Summarise in `docs/RESEARCH.md`.
- **Usability test (carers):** 5 carers do five tasks (add a person, add a photo, add a reminder, record an answer, read the
  weekly report) while thinking aloud; measure task success, time, errors, and the System Usability Scale (SUS).
- **Patient-side:** only with a carer present, informed consent from the person and the carer, stop at any sign of distress.
  Observe engagement and ease of use (did they tap the right thing, did they seem comfortable), never cognition.
- **Technical evaluation:** offline test results, reminder timing accuracy, sync correctness, performance and accessibility scores.
- **Reporting:** state limits honestly (small sample, short duration, no clinical measures). Do not claim clinical benefit.
- **Ethics:** get the mentor's approval for any testing with people; keep consent forms; follow the college's guidance.

## 14. Documentation and demo

- Deliver: `README.md` (run, env, migrations in order, deploy), `docs/ARCHITECTURE.md` (mermaid), `docs/THREAT_MODEL.md`,
  `docs/adr/` (decisions, including "keep the base" and "caregiver-led"), `docs/USER_GUIDE_CARER.md`, a one-page patient
  quick start, `docs/EVALUATION.md`, `docs/RESEARCH.md`, `docs/PROGRESS.md`, and a one-page scope-change note for the mentor
  linking the pivot (generic games to a care companion) to the evidence in section 2.
- **Demo script, "A day with Amma" (7 minutes):** 1 carer onboarding (2 min); 2 morning Today board with a spoken medicine
  reminder; 3 Amma repeats a question, taps the card and hears Priya's voice; 4 a missed reminder shows up for the carer;
  5 afternoon: Who is this? with her own photos, no failure marks; 6 evening calm music; 7 the weekly report; finish with the
  offline demonstration (switch the network off) and the honest-limits slide.
