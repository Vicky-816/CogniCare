# ADR 0002: Turn off the experimental Next.js flags

Date: 2026-11-13 · Status: accepted

## Decision

Remove `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback` from `next.config.ts`.

## Why

- **`cacheComponents`** keeps the page you left mounted but hidden (React `<Activity>`), so its state comes back when
  you return. In patient mode that is the wrong default: a half-finished game, an open dialog or an old message could
  reappear, and every visit should start fresh and calm. It also forced a workaround in tests (two copies of a page in
  the DOM), and coming features (reminder cards, audio, wake lock) are simpler when pages unmount. The app used none of
  its caching APIs (`"use cache"`, `cacheLife`, `cacheTag`).
- **`partialPrefetching`** belongs to the same model and adds nothing without it.
- **`agentFeedback`** makes `next dev` rewrite `AGENTS.md` with instructions to send usage feedback to Vercel. We do
  not want tools sending data out of this project.

## Result

`tsc`, lint, unit tests, `next build` and the e2e suite pass without the flags. An e2e test checks that clicking a
link leaves exactly one page in the DOM. The existing `<Suspense>` wrappers stay; they are still correct.

## Revisit when

We need per-component caching on the server and can show it does not bring back stale patient-mode screens.
