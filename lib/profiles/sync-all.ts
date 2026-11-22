"use client";

import { getProfileStore } from "@/lib/profiles/store";
import { getScheduleStore, hasPendingScheduleUploads } from "@/lib/schedule/store";
import { syncPendingSessions } from "@/lib/supabase/sync";

/**
 * Syncs every person on the account. Returns true only when everything is
 * safely uploaded, which is the signal that it is safe to clear this device.
 */
export async function syncAllProfiles(): Promise<{ signedIn: boolean; ok: boolean }> {
  const store = getProfileStore();
  if (store.kind === "local") return { signedIn: false, ok: false };
  try {
    const profiles = await store.list();
    const results = await Promise.all(profiles.map((profile) => syncPendingSessions(profile.id)));
    // Reminder outcomes (done, later, missed) recorded on this device.
    const schedule = getScheduleStore();
    await Promise.all(profiles.map((profile) => schedule.syncPending(profile.id).catch(() => undefined)));
    return {
      signedIn: results.every((result) => result.signedIn),
      ok: results.every((result) => result.signedIn && !result.error) && !hasPendingScheduleUploads(),
    };
  } catch {
    return { signedIn: false, ok: false };
  }
}
