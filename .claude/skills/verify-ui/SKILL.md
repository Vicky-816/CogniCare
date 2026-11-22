---
name: verify-ui
description: Use before finishing any UI change. How to run the app in demo mode, drive it with Playwright, and check accessibility and small-phone layout.
---

# Verifying UI

1. Demo mode: run with no Supabase env vars (`createClient()` returns null), so profiles, photos and games use browser storage.
2. Use the Playwright MCP, or `npm run e2e`, at **390 px** (phone) and **1280 px** (desktop) widths.
3. For every new screen: run axe-core and fix all serious/critical issues; check keyboard-only operation and visible focus.
4. Check **360 px** for sideways scroll: `document.documentElement.scrollWidth` must not exceed the viewport width.
5. In e2e, change pages with `page.goto` (not link clicks), because Next keeps the previous page hidden in the DOM.
6. Test with a long name ("Meenakshi Sundaram"), an empty state, an error state, and offline (`context.setOffline(true)`).
7. Take a screenshot and look at it. Do not claim a screen works without having seen it.
8. Production build once per phase: `npm run build` (Google Fonts need internet; in a sandbox stub them in a scratch copy).
