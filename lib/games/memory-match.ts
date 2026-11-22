/*
 * Memory Match rules, scoring and the adaptive difficulty rule.
 *
 * Everything here is plain data and pure functions, with no React and no
 * browser APIs, so the rules can be tested on their own and reused by the UI.
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export type Level = {
  level: number;
  name: string;
  pairs: number;
};

/** Levels 1-5, from easiest to hardest. */
export const LEVELS: Level[] = [
  { level: 1, name: "Gentle", pairs: 4 },
  { level: 2, name: "Easy", pairs: 6 },
  { level: 3, name: "Steady", pairs: 8 },
  { level: 4, name: "Challenging", pairs: 10 },
  { level: 5, name: "Tricky", pairs: 12 },
];

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

export function getLevel(level: number): Level {
  const clamped = clampLevel(level);
  return LEVELS[clamped - 1] ?? LEVELS[0];
}

/*
 * Difficulty rule (also shown to the player on the game page):
 *
 *   Look at the two most recent finished games AT THE LEVEL JUST PLAYED.
 *   - Both accuracy >= 75%  -> move up one level (maximum 5)
 *   - Both accuracy <  50%  -> move down one level (minimum 1)
 *   - Anything else         -> stay on the same level
 *
 * Accuracy is matched pairs divided by moves, so a perfect game is 100%.
 * Two games at the same level are required before the level can change.
 * After a level change the count starts again, so the player always gets two
 * games to settle in. (Without this, one good game right after moving up
 * would immediately move the player up again.)
 */
export const ACCURACY_TO_MOVE_UP = 75;
export const ACCURACY_TO_MOVE_DOWN = 50;

export type LevelChange = "increase" | "keep" | "decrease";

export type LevelDecision = {
  /** The level the player just played. */
  previousLevel: number;
  /** The level to use for the next game. */
  level: number;
  action: LevelChange;
  /** How many of the latest games (0, 1 or 2) were played at `previousLevel`. */
  gamesAtLevel: number;
};

/**
 * `history` is newest first. Only the unbroken run of latest games that were
 * played at `playedLevel` counts, up to a maximum of two.
 */
export function evaluateDifficulty(history: readonly GameSession[], playedLevel: number): LevelDecision {
  const previousLevel = clampLevel(playedLevel);
  const recent: GameSession[] = [];

  for (const session of history) {
    if (recent.length === 2 || session.level !== previousLevel) break;
    recent.push(session);
  }

  const gamesAtLevel = recent.length;
  const keep: LevelDecision = {
    previousLevel,
    level: previousLevel,
    action: "keep",
    gamesAtLevel,
  };

  if (gamesAtLevel < 2) return keep;

  const allHigh = recent.every((session) => session.accuracy >= ACCURACY_TO_MOVE_UP);
  const allLow = recent.every((session) => session.accuracy < ACCURACY_TO_MOVE_DOWN);

  if (allHigh && previousLevel < MAX_LEVEL) {
    return { ...keep, level: previousLevel + 1, action: "increase" };
  }

  if (allLow && previousLevel > MIN_LEVEL) {
    return { ...keep, level: previousLevel - 1, action: "decrease" };
  }

  return keep;
}

/** The level a new game should start at, based on saved history. */
export function levelForNextGame(history: readonly GameSession[]): number {
  const latest = history[0];
  if (!latest) return MIN_LEVEL;
  return evaluateDifficulty(history, latest.level).level;
}

export type GameSymbol = {
  key: string;
  label: string;
};

/** Twelve easy-to-recognise symbols; each level uses a subset. */
export const SYMBOLS: GameSymbol[] = [
  { key: "sun", label: "Sun" },
  { key: "moon", label: "Moon" },
  { key: "star", label: "Star" },
  { key: "heart", label: "Heart" },
  { key: "flower", label: "Flower" },
  { key: "leaf", label: "Leaf" },
  { key: "cloud", label: "Cloud" },
  { key: "umbrella", label: "Umbrella" },
  { key: "fish", label: "Fish" },
  { key: "bird", label: "Bird" },
  { key: "car", label: "Car" },
  { key: "house", label: "House" },
];

export type MemoryCard = {
  /** Unique per card, e.g. "sun-1" and "sun-2". */
  id: string;
  symbol: GameSymbol;
  /** Set on cards made from a family's own photos (see createPersonalDeck). */
  personal?: { photoUrl: string; face: "photo-and-name" | "photo" | "name" };
};

/**
 * Only a second, different symbol begins the short mismatch-reset timer.
 * A first card has no comparison yet and must stay visible until the player
 * chooses another card, even if that takes a while.
 */
export function shouldStartMismatchTimer(firstCard: MemoryCard | undefined, nextCard: MemoryCard): boolean {
  return firstCard !== undefined && firstCard.symbol.key !== nextCard.symbol.key;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Builds a shuffled deck with two cards for each of `pairs` symbols. */
export function createDeck(pairs: number, random: () => number = Math.random): MemoryCard[] {
  const count = Math.min(Math.max(1, Math.round(pairs)), SYMBOLS.length);
  const chosen = shuffle(SYMBOLS, random).slice(0, count);
  const deck = chosen.flatMap((symbol) => [
    { id: `${symbol.key}-1`, symbol },
    { id: `${symbol.key}-2`, symbol },
  ]);
  return shuffle(deck, random);
}

/** A photo and name from a person's Life Story, ready to become cards. */
export type PersonalCardItem = { id: string; label: string; photoUrl: string };

/** Personal boards only use these pair counts, so every grid fills its last row. */
const PERSONAL_PAIR_STEPS = [4, 6, 8, 10, 12];
export const MIN_PERSONAL_ITEMS = 4;

/**
 * How many pairs a personal board gets: the level's usual number, or fewer
 * when there are not enough photos. Returns 0 when there are too few photos
 * to make a personal board at all.
 */
export function personalPairCount(levelPairs: number, itemCount: number): number {
  if (itemCount < MIN_PERSONAL_ITEMS) return 0;
  const limit = Math.min(levelPairs, itemCount);
  return [...PERSONAL_PAIR_STEPS].reverse().find((steps) => steps <= limit) ?? 0;
}

/**
 * A deck from the family's own photos. In "same" mode both cards of a pair
 * show the same photo with the name underneath (easier, and it repeats the
 * name). In "name" mode one card is the photo and the other is just the name,
 * so the player matches a face to a name.
 */
export function createPersonalDeck(
  items: readonly PersonalCardItem[],
  pairs: number,
  mode: "same" | "name",
  random: () => number = Math.random,
): MemoryCard[] {
  const chosen = shuffle(items, random).slice(0, Math.max(1, pairs));
  const deck = chosen.flatMap((item): MemoryCard[] => {
    const symbol = { key: item.id, label: item.label };
    return mode === "same"
      ? [
          { id: `${item.id}-1`, symbol, personal: { photoUrl: item.photoUrl, face: "photo-and-name" } },
          { id: `${item.id}-2`, symbol, personal: { photoUrl: item.photoUrl, face: "photo-and-name" } },
        ]
      : [
          { id: `${item.id}-1`, symbol, personal: { photoUrl: item.photoUrl, face: "photo" } },
          { id: `${item.id}-2`, symbol, personal: { photoUrl: item.photoUrl, face: "name" } },
        ];
  });
  return shuffle(deck, random);
}

/*
 * Session record. This is the only data we store, and it is exactly what the
 * caregiver dashboard will need in a later phase.
 */
export type GameSession = {
  id: string;
  game: "memory-match" | "sequence-recall" | "pattern-practice" | "daily-routine" | "who-is-this";
  completedAt: string; // ISO 8601
  level: number;
  pairs?: number;
  moves?: number;
  mistakes: number;
  accuracy: number; // 0-100, rounded
  attempts: number;
  durationSeconds: number;
  score: number;
  sequenceLength?: number;
  roundsCompleted?: number;
  responseTimeSeconds?: number;
  activityCount?: number;
};

/** Matched pairs divided by moves. A perfect game is 100%. */
export function calculateAccuracy(pairs: number, moves: number): number {
  if (moves <= 0) return 0;
  return Math.round((pairs / moves) * 100);
}

export function normalizeSession(session: Omit<GameSession, "attempts"> & { attempts?: number }): GameSession {
  return {
    ...session,
    attempts: session.attempts ?? session.moves ?? session.roundsCompleted ?? 0,
  };
}

/** 100 points per pair, minus 10 for each wrong guess, never below zero. */
export function calculateScore(pairs: number, mistakes: number): number {
  return Math.max(0, pairs * 100 - mistakes * 10);
}

/** Seconds as "m:ss", e.g. 65 -> "1:05". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
