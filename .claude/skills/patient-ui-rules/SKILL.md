---
name: patient-ui-rules
description: Use when building or changing any screen under /play (patient mode) or any content the person with dementia sees. Defines the calm, errorless interface rules.
---

# Patient mode interface rules

- One primary action per screen. At most four choices. Large, plain-language labels. No jargon, no abbreviations.
- Targets at least 48px (prefer 64px); body text at least 18px (the root is already 112.5%); high contrast pairs from the tokens only.
- Never show: scores, levels, percentages, mistakes, countdowns, streak pressure, or red/cross marks. A wrong choice fades and
  the screen says "Let us look again". Praise is specific and warm ("Priya, your daughter"), never childish.
- Never block or lock the person out. Suggestions to rest are gentle and always dismissible.
- Never require typing, passwords or small gestures (no drag, long-press or double tap). Tap only.
- Motion is calm and short, and respects `prefers-reduced-motion`. No flashing.
- Time is shown in words ("It is Tuesday afternoon"), not only digits.
- Everything the person needs must work offline. Show no spinners longer than a moment: show the saved version first.
- Use the person's own photos, names and voices wherever possible. Fall back to neutral, adult-appropriate content.
- Hindi and English must both fit without layout changes (allow 30% longer text).
- Anything the family needs to see (numbers, logs, settings) lives in `/family`, never in `/play`.
