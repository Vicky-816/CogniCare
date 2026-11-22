import { shuffle } from "@/lib/games/memory-match";
import { maxChoices } from "@/lib/profiles/support";
import type { SupportLevel } from "@/lib/profiles/types";
import type { ChoiceQuestion } from "@/lib/games/pattern-practice";

/** What the game needs to know about each photo in someone's Life Story. */
export type WhoItem = {
  id: string;
  kind: "person" | "place" | "thing";
  label: string;
  note: string | null;
  photoUrl: string;
};

export const WHO_MIN_ITEMS = 3;

/** How many answers to show: two at first, up to four at the hardest level. */
export function choiceCountForLevel(level: number, support: SupportLevel): number {
  const wanted = level <= 2 ? 2 : level <= 4 ? 3 : 4;
  return support === 1 ? wanted : Math.min(wanted, maxChoices(support));
}

const PROMPTS = { person: "Who is this?", place: "Where is this?", thing: "What is this?" } as const;
const HINTS = {
  person: "Take a good look at the face.",
  place: "Think about being there.",
  thing: "Think about where you have seen it.",
} as const;
const IMAGE_LABELS = {
  person: "A photo of someone you know",
  place: "A photo of a place you know",
  thing: "A photo of something familiar",
} as const;

/**
 * Builds the questions for one game from the photos. Each question shows one
 * photo and asks for its name. Wrong answers come from the other photos,
 * preferring the same kind (a person's name among other people's names).
 */
export function buildWhoQuestions(
  items: readonly WhoItem[],
  level: number,
  count: number,
  support: SupportLevel,
  random: () => number = Math.random,
): ChoiceQuestion[] {
  const usable = items.filter((item) => item.label.trim() && item.photoUrl);
  const picks = shuffle(usable, random).slice(0, Math.min(count, usable.length));
  const wanted = choiceCountForLevel(level, support);

  return picks.map((item) => {
    const others = usable.filter(
      (other) => other.id !== item.id && other.label.trim().toLowerCase() !== item.label.trim().toLowerCase(),
    );
    const sameKind = shuffle(
      others.filter((other) => other.kind === item.kind),
      random,
    );
    const rest = shuffle(
      others.filter((other) => other.kind !== item.kind),
      random,
    );
    const seen = new Set<string>();
    const wrong = [...sameKind, ...rest]
      .filter((other) => {
        const name = other.label.trim().toLowerCase();
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, Math.max(1, wanted - 1));

    return {
      prompt: PROMPTS[item.kind],
      hint: HINTS[item.kind],
      visual: [],
      visualLabel: IMAGE_LABELS[item.kind],
      imageUrl: item.photoUrl,
      choices: shuffle([item, ...wrong], random).map((choice) => ({ key: choice.id, label: choice.label.trim() })),
      correctKey: item.id,
      praise: item.note?.trim() ? `${item.label.trim()}, ${item.note.trim()}.` : `${item.label.trim()}.`,
    };
  });
}
