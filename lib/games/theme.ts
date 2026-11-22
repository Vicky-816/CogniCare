import type { GameSession } from "@/lib/games/memory-match";

export type GameId = GameSession["game"];

/*
 * Each game owns one colour, used for its tiles, its badge and its results
 * screen, so people learn "blue is the card game" without reading. The class
 * names are written out in full so Tailwind can find them.
 */
export const GAME_THEME: Record<
  GameId,
  {
    label: string;
    /** Solid fill with readable text on top. */
    solid: string;
    /** Soft tint for backgrounds. */
    soft: string;
    /** Coloured text on a white or soft background. */
    text: string;
    border: string;
    /** Colour of the lip under a tile. */
    lip: string;
    pip: string;
  }
> = {
  "memory-match": {
    label: "Memory Match",
    solid: "bg-memory text-white",
    soft: "bg-memory-soft",
    text: "text-memory",
    border: "border-memory",
    lip: "[--lip:#172a8a]",
    pip: "bg-memory",
  },
  "sequence-recall": {
    label: "Sequence Recall",
    solid: "bg-sequence text-white",
    soft: "bg-sequence-soft",
    text: "text-sequence",
    border: "border-sequence",
    lip: "[--lip:#4a1556]",
    pip: "bg-sequence",
  },
  "pattern-practice": {
    label: "Pattern Practice",
    solid: "bg-pattern text-white",
    soft: "bg-pattern-soft",
    text: "text-pattern",
    border: "border-pattern",
    lip: "[--lip:#7c2a07]",
    pip: "bg-pattern",
  },
  "daily-routine": {
    label: "Daily Routine",
    solid: "bg-routine text-white",
    soft: "bg-routine-soft",
    text: "text-routine",
    border: "border-routine",
    lip: "[--lip:#124a2e]",
    pip: "bg-routine",
  },
  "who-is-this": {
    label: "Who is this?",
    solid: "bg-people text-white",
    soft: "bg-people-soft",
    text: "text-people",
    border: "border-people",
    lip: "[--lip:#6b0f3a]",
    pip: "bg-people",
  },
};
