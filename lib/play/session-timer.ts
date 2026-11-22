/*
 * A gentle session clock. A "session" is one stretch of playing on this
 * device. When the family's chosen length is up, the games suggest a rest
 * (they never cut anyone off). If nobody plays for 30 minutes, the next visit
 * starts a fresh session.
 */

export const IDLE_LIMIT_MS = 30 * 60 * 1000;

type Info = { startedAt: number; lastActive: number };
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function key(profileId: string) {
  return `mindplay:session:${profileId}`;
}

function defaultStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(store: Store, profileId: string): Info | null {
  try {
    const parsed = JSON.parse(store.getItem(key(profileId)) ?? "null") as Partial<Info> | null;
    return parsed && typeof parsed.startedAt === "number" && typeof parsed.lastActive === "number"
      ? { startedAt: parsed.startedAt, lastActive: parsed.lastActive }
      : null;
  } catch {
    return null;
  }
}

function write(store: Store, profileId: string, info: Info) {
  try {
    store.setItem(key(profileId), JSON.stringify(info));
  } catch {
    /* Storage blocked: the rest reminder simply does not appear. */
  }
}

/** Marks activity now, and starts a new session after a long gap. */
export function touchSession(profileId: string, now: number, store: Store | null = defaultStore()) {
  if (!store) return;
  const current = read(store, profileId);
  if (!current || now - current.lastActive > IDLE_LIMIT_MS)
    write(store, profileId, { startedAt: now, lastActive: now });
  else write(store, profileId, { ...current, lastActive: now });
}

/** True once the chosen session length has passed. */
export function isSessionOver(
  profileId: string,
  minutes: number,
  now: number,
  store: Store | null = defaultStore(),
): boolean {
  if (!store) return false;
  const current = read(store, profileId);
  if (!current || now - current.lastActive > IDLE_LIMIT_MS) return false;
  return now - current.startedAt >= minutes * 60_000;
}

/** "Keep playing": starts the clock again. */
export function extendSession(profileId: string, now: number, store: Store | null = defaultStore()) {
  if (store) write(store, profileId, { startedAt: now, lastActive: now });
}
