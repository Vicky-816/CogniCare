# ADR 0001: Keep the existing codebase as the base

Date: 2026-11-13 · Status: accepted

## Decision

Build CogniCare (the care companion) on top of the existing app instead of starting a new project.

## Why

- The parts the new product needs already exist and work: sign-in with RLS, care profiles, patient mode with the exit
  PIN, Life Story photos in a private bucket with an offline cache, local-first game saving with background sync, the
  calm design system and the errorless game UI.
- Each of these has tests and has been checked for accessibility. Rewriting them would cost weeks and bring back bugs
  that were already fixed (see the gotchas in `docs/CURRENT_STATE.md`).
- The store-interface pattern (a `local` and a `cloud` backend) suits the new features (Today board, reminders) well.

## What changes

- Removed: the old `/patient` and `/caregiver` pages, the caregiver-approval screens, and the unused reminder tables.
  The old URLs still redirect to `/play` and `/family`.
- The four general games are hidden unless a carer turns them on. The product is a daily-life companion first.
- New features follow the same patterns: store interfaces, device first, RLS on every table.

## Revisit when

A core part (for example the sync model) cannot support a needed feature without a rewrite.
