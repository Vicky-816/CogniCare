"use client";

import { levelForNextGame, type GameSession } from "@/lib/games/memory-match";
import { GAME_IDS, clearAllGameHistory, loadAllGameHistory, mergeGameHistory } from "@/lib/games/session-history";
import { clearLifeStoryCache } from "@/lib/life-story/store";
import { clearProfileCache } from "@/lib/profiles/store";
import { clearScheduleCache } from "@/lib/schedule/store";
import { createClient } from "@/lib/supabase/client";
import { GUEST_PROFILE_ID } from "@/lib/games/guest";

/*
 * Local-first sync, one person (profile) at a time. Every finished game is
 * saved in this browser first, so the games always work, even offline. When
 * someone is signed in, games the account does not have yet are uploaded, and
 * the account's history for that person is merged back into this device.
 */

const SYNC_TIMEOUT_MS = 12_000;

type Client = NonNullable<ReturnType<typeof createClient>>;

export type SyncResult = {
  configured: boolean;
  signedIn: boolean;
  synced: number;
  history: GameSession[];
  error: unknown;
};

/** Forget this device's saved games and cached names. Only call after a successful sync. */
export function clearDeviceHistory() {
  clearAllGameHistory();
  clearProfileCache();
  // Photos are cleared too, so the next person on a shared tablet never sees them.
  void clearLifeStoryCache();
  clearScheduleCache();
}

function emptyResult(profileId: string, overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    configured: false,
    signedIn: false,
    synced: 0,
    history: typeof window === "undefined" ? [] : loadAllGameHistory(profileId),
    error: null,
    ...overrides,
  };
}

/** The signed-in account's id, read from the saved session (no network wait). */
async function currentUserId(client: Client): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Uploads one finished game right after it is saved on the device. */
export async function syncGameSession(profileId: string, session: GameSession) {
  try {
    if (profileId === GUEST_PROFILE_ID) return { synced: 0, error: null };
    if (typeof window === "undefined") return { synced: 0, error: null };
    const client = createClient();
    if (!client) return { synced: 0, error: null };
    const userId = await currentUserId(client);
    if (!userId) return { synced: 0, error: null };
    return await uploadSessions(client, userId, profileId, [session], loadAllGameHistory(profileId));
  } catch (error) {
    return { synced: 0, error };
  }
}

const inFlight = new Map<string, Promise<SyncResult>>();

/**
 * Brings this device and the signed-in account up to date for one person.
 * Several parts of the app ask for this at once, so they share one running
 * sync, and it gives up after a while so a bad connection can never leave a
 * screen waiting.
 */
export function syncPendingSessions(profileId: string): Promise<SyncResult> {
  if (profileId === GUEST_PROFILE_ID) return Promise.resolve(emptyResult(profileId));
  const running = inFlight.get(profileId);
  if (running) return running;
  const timeout = new Promise<SyncResult>((resolve) => {
    setTimeout(
      () => resolve(emptyResult(profileId, { configured: true, error: new Error("Sync timed out") })),
      SYNC_TIMEOUT_MS,
    );
  });
  const run = Promise.race([runSync(profileId), timeout]).finally(() => {
    inFlight.delete(profileId);
  });
  inFlight.set(profileId, run);
  return run;
}

async function runSync(profileId: string): Promise<SyncResult> {
  try {
    if (typeof window === "undefined") return emptyResult(profileId);
    const client = createClient();
    if (!client) return emptyResult(profileId);
    const userId = await currentUserId(client);
    if (!userId) return emptyResult(profileId, { configured: true });

    const localHistory = loadAllGameHistory(profileId);
    const { data: cloudRows, error: readError } = await client
      .from("sessions")
      .select(
        "id, game_id, completed_at, difficulty, accuracy, attempts, mistakes, duration_seconds, response_time_seconds, metrics, results(score, completed)",
      )
      .eq("profile_id", profileId)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (readError) {
      return emptyResult(profileId, { configured: true, signedIn: true, error: readError });
    }

    const cloudHistory = (cloudRows ?? []).flatMap((row) => {
      const game = row.game_id as GameSession["game"];
      if (!GAME_IDS.includes(game)) return [];
      const metrics = row.metrics && typeof row.metrics === "object" ? (row.metrics as Record<string, unknown>) : {};
      const result = Array.isArray(row.results) ? row.results[0] : row.results;
      const score =
        result && typeof result === "object" && "score" in result && typeof result.score === "number"
          ? result.score
          : Number(metrics.score ?? 0);
      return [
        {
          ...metrics,
          id: row.id,
          game,
          completedAt: row.completed_at,
          level: row.difficulty,
          accuracy: Number(row.accuracy),
          attempts: row.attempts,
          mistakes: row.mistakes,
          durationSeconds: row.duration_seconds,
          responseTimeSeconds: row.response_time_seconds ?? undefined,
          score,
        } as GameSession,
      ];
    });

    const merged = mergeGameHistory(profileId, [...cloudHistory, ...localHistory], false);

    // Only upload what the account does not have yet.
    const cloudIds = new Set(cloudHistory.map((session) => session.id));
    const missing = merged.filter((session) => !cloudIds.has(session.id));
    const uploaded = await uploadSessions(client, userId, profileId, missing, merged);
    if (uploaded.error) {
      return { configured: true, signedIn: true, history: merged, synced: 0, error: uploaded.error };
    }
    return { configured: true, signedIn: true, history: merged, synced: uploaded.synced, error: null };
  } catch (error) {
    return emptyResult(profileId, { configured: true, error });
  }
}

async function uploadSessions(
  client: Client,
  userId: string,
  profileId: string,
  sessions: readonly GameSession[],
  fullHistory: readonly GameSession[],
) {
  let synced = 0;
  for (const game of GAME_IDS) {
    const gameSessions = sessions.filter((session) => session.game === game);
    if (!gameSessions.length) continue;

    const rows = gameSessions.map((session) => ({
      id: session.id,
      user_id: userId,
      profile_id: profileId,
      game_id: session.game,
      completed_at: session.completedAt,
      difficulty: session.level,
      accuracy: session.accuracy,
      attempts: session.attempts,
      mistakes: session.mistakes,
      duration_seconds: session.durationSeconds,
      response_time_seconds: session.responseTimeSeconds ?? null,
      metrics: session,
    }));
    const { error } = await client.from("sessions").upsert(rows, { onConflict: "id" });
    if (error) return { synced, error };

    const results = gameSessions.map((session) => ({
      session_id: session.id,
      user_id: userId,
      score: session.score,
      completed: true,
    }));
    const { error: resultError } = await client.from("results").upsert(results, { onConflict: "session_id" });
    if (resultError) return { synced, error: resultError };

    // The level for the next game comes from the whole history of this game,
    // not just the sessions uploaded in this batch.
    const level = levelForNextGame(fullHistory.filter((session) => session.game === game));
    const { error: levelError } = await client
      .from("profile_difficulty")
      .upsert({ profile_id: profileId, owner_id: userId, game_id: game, level }, { onConflict: "profile_id,game_id" });
    if (levelError) return { synced, error: levelError };

    synced += gameSessions.length;
  }
  return { synced, error: null };
}

