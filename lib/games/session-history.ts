import { normalizeSession, type GameSession } from "@/lib/games/memory-match";

/*
 * Local persistence: every finished game is saved in this browser first, one
 * list per person ("profile") and per game. No network request is involved,
 * so the games keep working offline. lib/supabase/sync.ts backs the same
 * games up to the account when someone is signed in.
 */

const MAX_SESSIONS = 50;
export const GAME_IDS: GameSession["game"][] = [
  "memory-match",
  "sequence-recall",
  "pattern-practice",
  "daily-routine",
  "who-is-this",
];

const KEY_PREFIX = "mindplay:p:";

function storageKey(profileId: string, game: GameSession["game"]): string {
  return `${KEY_PREFIX}${profileId}:${game}:sessions:v1`;
}

function isGameSession(value: unknown): value is GameSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Partial<GameSession>;
  return (
    typeof session.id === "string" &&
    (session.game === "memory-match" ||
      session.game === "sequence-recall" ||
      session.game === "pattern-practice" ||
      session.game === "daily-routine" ||
      session.game === "who-is-this") &&
    typeof session.completedAt === "string" &&
    typeof session.level === "number" &&
    typeof session.mistakes === "number" &&
    typeof session.accuracy === "number" &&
    typeof session.durationSeconds === "number" &&
    typeof session.score === "number" &&
    (typeof session.attempts === "number" ||
      typeof session.moves === "number" ||
      typeof session.roundsCompleted === "number") &&
    (session.game === "memory-match"
      ? typeof session.pairs === "number" && typeof session.moves === "number"
      : (typeof session.sequenceLength === "number" || typeof session.activityCount === "number") &&
        typeof session.roundsCompleted === "number" &&
        typeof session.responseTimeSeconds === "number")
  );
}

/** Newest first. Returns [] on the server or when storage is unavailable. */
export function loadGameHistory(profileId: string, game: GameSession["game"]): GameSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(profileId, game));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((session): session is GameSession => isGameSession(session) && session.game === game)
      .map((session) => normalizeSession(session))
      .slice(0, MAX_SESSIONS);
  } catch {
    // Private browsing, disabled storage or corrupt data: start fresh.
    return [];
  }
}

/**
 * Adds a session to the front of the history and returns the new list.
 * Storage failures are ignored on purpose: the game must keep working even
 * when saving is impossible.
 */
export function saveGameSession(profileId: string, session: GameSession): GameSession[] {
  const normalized = normalizeSession(session);
  const history = [normalized, ...loadGameHistory(profileId, session.game)].slice(0, MAX_SESSIONS);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(profileId, normalized.game), JSON.stringify(history));
    } catch {
      // Ignore quota or privacy-mode errors.
    }
  }

  return history;
}

/** Removes every saved game, for every person, from this device (used after a safe sign-out). */
export function clearAllGameHistory(): void {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(KEY_PREFIX)) storage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

/** Removes the saved games of one person (used when that person is deleted). */
export function clearProfileHistory(profileId: string): void {
  if (typeof window === "undefined") return;
  for (const game of GAME_IDS) {
    try {
      window.localStorage.removeItem(storageKey(profileId, game));
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }
}

export function loadAllGameHistory(profileId: string): GameSession[] {
  return GAME_IDS.flatMap((game) => loadGameHistory(profileId, game)).sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
}

export function mergeGameHistory(
  profileId: string,
  incoming: readonly GameSession[],
  includeExisting = true,
): GameSession[] {
  const merged = new Map<string, GameSession>();
  const existing = loadAllGameHistory(profileId);
  const returned = new Map<string, GameSession>();
  for (const session of [...incoming, ...existing]) {
    const normalized = normalizeSession(session);
    merged.set(`${normalized.game}:${normalized.id}`, normalized);
  }
  for (const session of [...incoming, ...(includeExisting ? existing : [])]) {
    const normalized = normalizeSession(session);
    returned.set(`${normalized.game}:${normalized.id}`, normalized);
  }
  const all = [...merged.values()].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  const result = [...returned.values()].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  for (const game of GAME_IDS) {
    const gameSessions = all.filter((session) => session.game === game).slice(0, MAX_SESSIONS);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey(profileId, game), JSON.stringify(gameSessions));
      } catch {
        /* Keep the in-memory history usable when storage is unavailable. */
      }
    }
  }
  return result;
}
