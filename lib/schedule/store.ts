"use client";

import { mergeEvents, normalizeIso } from "@/lib/schedule/occurrences";
import {
  MAX_REMINDERS,
  REMINDER_KINDS,
  cleanReminder,
  parseRepeat,
  type NewReminder,
  type Reminder,
  type ReminderEvent,
  type ReminderKind,
} from "@/lib/schedule/types";
import { createClient } from "@/lib/supabase/client";

/*
 * Where the schedule is kept. Same two backends as profiles and Life Story:
 *   - "local": this browser only (demo mode).
 *   - "cloud": Supabase, with a copy on the device so the tablet keeps working offline.
 * What happened to each reminder (done, later, missed) is ALWAYS written to the
 * device first; the cloud backend then uploads it. One record per reminder per
 * due moment, so retrying an upload never creates a duplicate.
 */

export interface ScheduleStore {
  readonly kind: "cloud" | "local";
  /** Active and stopped reminders (stopped ones keep their history). */
  listReminders(profileId: string): Promise<Reminder[]>;
  /** Create (no `existing`) or edit. Edits apply from now on. */
  saveReminder(profileId: string, input: NewReminder, existing?: Reminder): Promise<Reminder>;
  /** Stop a reminder. Its history stays. */
  stopReminder(reminder: Reminder): Promise<void>;
  /** Events due since `since` (device and cloud merged). */
  listEvents(profileId: string, since: Date): Promise<ReminderEvent[]>;
  /** Save an outcome on the device, then upload it when possible. */
  recordEvent(event: ReminderEvent): Promise<void>;
  /** Retry uploads that have not reached the cloud yet. */
  syncPending(profileId: string): Promise<void>;
}

/** Shown when the signed-in database has not been updated with the reminders tables yet. */
export const NEEDS_UPDATE_MESSAGE =
  "Reminders need a database update. Ask the person who set up CogniCare to check the database setup in the README.";

const KEEP_EVENTS_DAYS = 14;
const remindersKey = (profileId: string) => `mindplay:reminders:v1:${profileId}`;
const remindersCacheKey = (profileId: string) => `mindplay:reminders-cache:v1:${profileId}`;
const eventsKey = (profileId: string) => `mindplay:reminder-events:v1:${profileId}`;
const pendingKey = (profileId: string) => `mindplay:reminder-pending:v1:${profileId}`;

// ---------------------------------------------------------------- device storage

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full: the schedule keeps working for this visit. */
  }
}

function asReminder(value: unknown): Reminder | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Reminder>;
  const repeat = parseRepeat(item.repeat);
  if (typeof item.id !== "string" || typeof item.profileId !== "string" || typeof item.title !== "string" || !repeat)
    return null;
  if (!Array.isArray(item.times) || item.times.length === 0) return null;
  return {
    id: item.id,
    profileId: item.profileId,
    title: item.title,
    kind: REMINDER_KINDS.includes(item.kind as ReminderKind) ? (item.kind as ReminderKind) : "other",
    repeat,
    times: item.times.filter((time): time is string => typeof time === "string"),
    photoItemId: item.photoItemId ?? null,
    speakText: item.speakText ?? null,
    graceMinutes: typeof item.graceMinutes === "number" ? item.graceMinutes : 30,
    needsConfirmation: !!item.needsConfirmation,
    active: item.active !== false,
    activeFrom: item.activeFrom ?? item.createdAt ?? new Date(0).toISOString(),
    createdAt: item.createdAt ?? new Date(0).toISOString(),
  };
}

function readReminders(key: string): Reminder[] {
  const raw = readJson<unknown[]>(key, []);
  return Array.isArray(raw) ? raw.map(asReminder).filter((item): item is Reminder => item !== null) : [];
}

function readEvents(profileId: string): ReminderEvent[] {
  const raw = readJson<ReminderEvent[]>(eventsKey(profileId), []);
  return Array.isArray(raw)
    ? raw.filter((event) => event && typeof event.reminderId === "string" && typeof event.dueAt === "string")
    : [];
}

/** Keeps two weeks of outcomes on the device. */
function writeEvents(profileId: string, events: ReminderEvent[]) {
  const cutoff = Date.now() - KEEP_EVENTS_DAYS * 86_400_000;
  writeJson(
    eventsKey(profileId),
    events.filter((event) => Date.parse(event.dueAt) >= cutoff),
  );
}

function saveEventOnDevice(event: ReminderEvent) {
  writeEvents(event.profileId, mergeEvents(readEvents(event.profileId), [event]));
}

function eventsSince(profileId: string, since: Date) {
  return readEvents(profileId).filter((event) => Date.parse(event.dueAt) >= since.getTime());
}

function buildReminder(profileId: string, input: NewReminder, existing?: Reminder): Reminder {
  const clean = cleanReminder(input);
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    profileId,
    ...clean,
    active: true,
    activeFrom: now,
    createdAt: existing?.createdAt ?? now,
  };
}

// ---------------------------------------------------------------- local

const localStore: ScheduleStore = {
  kind: "local",
  async listReminders(profileId) {
    return readReminders(remindersKey(profileId));
  },
  async saveReminder(profileId, input, existing) {
    const list = readReminders(remindersKey(profileId));
    if (!existing && list.filter((item) => item.active).length >= MAX_REMINDERS)
      throw new Error(`You can have up to ${MAX_REMINDERS} reminders.`);
    const reminder = buildReminder(profileId, input, existing);
    writeJson(
      remindersKey(profileId),
      existing ? list.map((item) => (item.id === existing.id ? reminder : item)) : [...list, reminder],
    );
    return reminder;
  },
  async stopReminder(reminder) {
    const list = readReminders(remindersKey(reminder.profileId));
    writeJson(
      remindersKey(reminder.profileId),
      list.map((item) => (item.id === reminder.id ? { ...item, active: false } : item)),
    );
  },
  async listEvents(profileId, since) {
    return eventsSince(profileId, since);
  },
  async recordEvent(event) {
    saveEventOnDevice(event);
  },
  async syncPending() {
    /* Nothing to upload in demo mode. */
  },
};

// ---------------------------------------------------------------- cloud

type ReminderRow = {
  id: string;
  profile_id: string;
  title: string;
  kind: string;
  repeat: unknown;
  times: string[];
  photo_item_id: string | null;
  speak_text: string | null;
  grace_minutes: number;
  needs_confirmation: boolean;
  active: boolean;
  active_from: string;
  created_at: string;
};
const REMINDER_COLUMNS =
  "id, profile_id, title, kind, repeat, times, photo_item_id, speak_text, grace_minutes, needs_confirmation, active, active_from, created_at";

type EventRow = {
  id: string;
  reminder_id: string;
  profile_id: string;
  due_at: string;
  status: ReminderEvent["status"];
  acted_by: ReminderEvent["actedBy"];
  acted_at: string;
  snooze_until: string | null;
  confirmed_at: string | null;
};
const EVENT_COLUMNS = "id, reminder_id, profile_id, due_at, status, acted_by, acted_at, snooze_until, confirmed_at";

/** Errors meaning "this table does not exist yet" (the migration has not been run). */
const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST202"]);
let databaseLacksTables = false;

/** True once the signed-in database turned out to have no reminders tables. */
export function scheduleNeedsDatabaseUpdate() {
  return databaseLacksTables;
}

function noteMissing(error: { code?: string } | null) {
  if (error && MISSING_TABLE.has(error.code ?? "")) databaseLacksTables = true;
}

function fromReminderRow(row: ReminderRow): Reminder | null {
  return asReminder({
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    kind: row.kind,
    repeat: row.repeat,
    times: row.times,
    photoItemId: row.photo_item_id,
    speakText: row.speak_text,
    graceMinutes: row.grace_minutes,
    needsConfirmation: row.needs_confirmation,
    active: row.active,
    activeFrom: row.active_from,
    createdAt: row.created_at,
  });
}

function fromEventRow(row: EventRow): ReminderEvent {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    profileId: row.profile_id,
    dueAt: normalizeIso(row.due_at),
    status: row.status,
    actedBy: row.acted_by,
    actedAt: row.acted_at,
    snoozeUntil: row.snooze_until,
    confirmedAt: row.confirmed_at,
  };
}

function cloudStore(): ScheduleStore {
  const client = createClient();
  if (!client) return localStore;

  async function ownerId(): Promise<string> {
    const { data } = await client!.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Please sign in again.");
    return id;
  }

  const readPending = (profileId: string) => readJson<string[]>(pendingKey(profileId), []);

  async function upload(event: ReminderEvent, owner: string): Promise<boolean> {
    const outcome = {
      status: event.status,
      acted_by: event.actedBy,
      acted_at: event.actedAt,
      snooze_until: event.snoozeUntil,
      confirmed_at: event.confirmedAt,
    };
    const { error } = await client!.from("reminder_events").insert({
      id: event.id,
      reminder_id: event.reminderId,
      profile_id: event.profileId,
      owner_id: owner,
      due_at: event.dueAt,
      ...outcome,
    });
    if (!error) return true;
    noteMissing(error);
    if (error.code !== "23505") return false;
    // Already recorded for this moment (another device, or a retry): update the outcome.
    // "Done" is final, so nothing else may overwrite it.
    let update = client!
      .from("reminder_events")
      .update(outcome)
      .eq("reminder_id", event.reminderId)
      .eq("due_at", event.dueAt);
    if (event.status !== "done") update = update.neq("status", "done");
    const { error: updateError } = await update;
    return !updateError;
  }

  const store: ScheduleStore = {
    kind: "cloud",
    async listReminders(profileId) {
      const { data, error } = await client!
        .from("reminders")
        .select(REMINDER_COLUMNS)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });
      if (error) {
        noteMissing(error);
        // Offline or not set up yet: use the copy saved on this device.
        return readReminders(remindersCacheKey(profileId));
      }
      const list = (data as unknown as ReminderRow[]).map(fromReminderRow).filter((item): item is Reminder => !!item);
      writeJson(remindersCacheKey(profileId), list);
      return list;
    },
    async saveReminder(profileId, input, existing) {
      if (databaseLacksTables) throw new Error(NEEDS_UPDATE_MESSAGE);
      const reminder = buildReminder(profileId, input, existing);
      const fields = {
        title: reminder.title,
        kind: reminder.kind,
        repeat: reminder.repeat,
        times: reminder.times,
        photo_item_id: reminder.photoItemId,
        speak_text: reminder.speakText,
        grace_minutes: reminder.graceMinutes,
        needs_confirmation: reminder.needsConfirmation,
        active: true,
        active_from: reminder.activeFrom,
      };
      const request = existing
        ? client!
            .from("reminders")
            .update({ ...fields, updated_at: reminder.activeFrom })
            .eq("id", existing.id)
        : client!
            .from("reminders")
            .insert({ id: reminder.id, profile_id: profileId, owner_id: await ownerId(), ...fields });
      const { data, error } = await request.select(REMINDER_COLUMNS).single();
      if (error || !data) {
        noteMissing(error);
        if (databaseLacksTables) throw new Error(NEEDS_UPDATE_MESSAGE);
        throw new Error("The reminder could not be saved. Check your connection and try again.");
      }
      const saved = fromReminderRow(data as unknown as ReminderRow) ?? reminder;
      const cached = readReminders(remindersCacheKey(profileId)).filter((item) => item.id !== saved.id);
      writeJson(remindersCacheKey(profileId), [...cached, saved]);
      return saved;
    },
    async stopReminder(reminder) {
      const { error } = await client!
        .from("reminders")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", reminder.id);
      if (error) throw new Error("The reminder could not be stopped. Check your connection and try again.");
      writeJson(
        remindersCacheKey(reminder.profileId),
        readReminders(remindersCacheKey(reminder.profileId)).map((item) =>
          item.id === reminder.id ? { ...item, active: false } : item,
        ),
      );
    },
    async listEvents(profileId, since) {
      const device = eventsSince(profileId, since);
      const { data, error } = await client!
        .from("reminder_events")
        .select(EVENT_COLUMNS)
        .eq("profile_id", profileId)
        .gte("due_at", since.toISOString());
      if (error) {
        noteMissing(error);
        return device;
      }
      const merged = mergeEvents(device, (data as unknown as EventRow[]).map(fromEventRow));
      writeEvents(profileId, mergeEvents(readEvents(profileId), merged));
      return merged;
    },
    async recordEvent(event) {
      saveEventOnDevice(event);
      const pending = readPending(event.profileId).filter((id) => id !== event.id);
      writeJson(pendingKey(event.profileId), [...pending, event.id]);
      await store.syncPending(event.profileId);
    },
    async syncPending(profileId) {
      const pending = readPending(profileId);
      if (pending.length === 0 || databaseLacksTables) return;
      let owner: string;
      try {
        owner = await ownerId();
      } catch {
        return; // Signed out: keep them for later.
      }
      const events = new Map(readEvents(profileId).map((event) => [event.id, event]));
      const left: string[] = [];
      for (const id of pending) {
        const event = events.get(id);
        if (!event) continue; // Too old and pruned: nothing to upload.
        let ok = false;
        try {
          ok = await upload(event, owner);
        } catch {
          ok = false;
        }
        if (!ok) left.push(id);
      }
      // Keep anything added while uploading.
      const latest = readPending(profileId).filter((id) => !pending.includes(id));
      writeJson(pendingKey(profileId), [...left, ...latest]);
    },
  };
  return store;
}

export function getScheduleStore(): ScheduleStore {
  return createClient() ? cloudStore() : localStore;
}

/** Remove one person's schedule from this device (when that person is removed). */
export function clearScheduleForProfile(profileId: string) {
  try {
    for (const key of [remindersKey, remindersCacheKey, eventsKey, pendingKey])
      window.localStorage.removeItem(key(profileId));
  } catch {
    /* Nothing to remove. */
  }
}

/** Forget cached schedules on this device (used at sign-out). Unsent outcomes are lost only if the caller allows it. */
export function clearScheduleCache() {
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (
        key?.startsWith("mindplay:reminders-cache:v1:") ||
        key?.startsWith("mindplay:reminder-events:v1:") ||
        key?.startsWith("mindplay:reminder-pending:v1:")
      )
        storage.removeItem(key);
    }
  } catch {
    /* Nothing to clear. */
  }
}

/** True if this device still has outcomes that have not reached the cloud. */
export function hasPendingScheduleUploads(): boolean {
  try {
    const storage = window.localStorage;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith("mindplay:reminder-pending:v1:") && readJson<string[]>(key, []).length > 0) return true;
    }
  } catch {
    /* Storage unavailable. */
  }
  return false;
}
