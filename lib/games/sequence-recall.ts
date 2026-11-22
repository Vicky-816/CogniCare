import { clampLevel } from "@/lib/games/memory-match";

export type SequenceLevel = {
  level: number;
  name: string;
  startingLength: number;
};

export const SEQUENCE_LEVELS: SequenceLevel[] = [
  { level: 1, name: "Gentle", startingLength: 3 },
  { level: 2, name: "Easy", startingLength: 4 },
  { level: 3, name: "Steady", startingLength: 5 },
  { level: 4, name: "Challenging", startingLength: 6 },
  { level: 5, name: "Tricky", startingLength: 7 },
];

export const ROUNDS_PER_GAME = 3;
export const MAX_SEQUENCE_LENGTH = 9;

export type SequenceItem = {
  key: string;
  label: string;
  colorClass: string;
};

export const SEQUENCE_ITEMS: SequenceItem[] = [
  { key: "sun", label: "Sun", colorClass: "bg-accent text-accent-foreground" },
  { key: "leaf", label: "Leaf", colorClass: "bg-routine text-white" },
  { key: "heart", label: "Heart", colorClass: "bg-destructive text-white" },
  { key: "cloud", label: "Cloud", colorClass: "bg-memory text-white" },
  { key: "star", label: "Star", colorClass: "bg-sequence text-white" },
  { key: "flower", label: "Flower", colorClass: "bg-pattern text-white" },
];

export function getSequenceLevel(level: number): SequenceLevel {
  return SEQUENCE_LEVELS[clampLevel(level) - 1] ?? SEQUENCE_LEVELS[0];
}

export function sequenceLengthForRound(level: number, round: number): number {
  return Math.min(MAX_SEQUENCE_LENGTH, getSequenceLevel(level).startingLength + Math.max(0, round - 1));
}

/** Builds a sequence without immediately repeating an item. */
export function createSequence(length: number, random: () => number = Math.random): SequenceItem[] {
  const count = Math.max(1, Math.min(MAX_SEQUENCE_LENGTH, Math.round(length)));
  const sequence: SequenceItem[] = [];
  while (sequence.length < count) {
    const choices = SEQUENCE_ITEMS.filter((item) => item.key !== sequence.at(-1)?.key);
    sequence.push(choices[Math.floor(random() * choices.length)] ?? SEQUENCE_ITEMS[0]);
  }
  return sequence;
}

export function isCorrectAnswer(sequence: readonly SequenceItem[], answer: readonly string[]): boolean {
  return sequence.length === answer.length && sequence.every((item, index) => item.key === answer[index]);
}

export function calculateSequenceScore(correctRounds: number, mistakes: number): number {
  return Math.max(0, correctRounds * 100 - mistakes * 10);
}
