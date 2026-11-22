import type { SupportLevel } from "@/lib/profiles/types";

/*
 * "Support level" is how much the games simplify themselves for one person.
 * It is an interface setting the family chooses, never a medical label.
 *   1 Standard: all five levels, up to three answer choices
 *   2 Simpler:  up to level 3, two answer choices
 *   3 Simplest: up to level 2, two answer choices
 */
export const SUPPORT_OPTIONS: { value: SupportLevel; title: string; text: string }[] = [
  { value: 1, title: "Standard", text: "All five levels, with up to three answers to choose from." },
  { value: 2, title: "Simpler", text: "Easier levels only, and just two answers to choose from." },
  { value: 3, title: "Simplest", text: "The easiest levels, with two answers and short games." },
];

export const SESSION_MINUTE_OPTIONS = [5, 10, 15, 20, 30];

const LEVEL_CAP: Record<SupportLevel, number> = { 1: 5, 2: 3, 3: 2 };
const CHOICE_CAP: Record<SupportLevel, number> = { 1: 3, 2: 2, 3: 2 };

/** The highest game level this support level will reach. */
export function levelCap(support: SupportLevel): number {
  return LEVEL_CAP[support] ?? 5;
}

/** Keeps a level within what this support level allows. */
export function capLevel(level: number, support: SupportLevel): number {
  return Math.min(level, levelCap(support));
}

/** The most answers a question may show at once. */
export function maxChoices(support: SupportLevel): number {
  return CHOICE_CAP[support] ?? 3;
}
