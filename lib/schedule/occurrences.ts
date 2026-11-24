import { addDays, dayKey, weekdayOf, zonedToUtc } from "@/lib/schedule/time";
import type { Reminder, ReminderEvent } from "@/lib/schedule/types";

/*
 * When reminders are due and what state each one is in. Pure functions: the
 * same inputs always give the same answer, so they are easy to test and the
 * tablet can recompute everything on every tick without drifting.
 */

export type OccurrenceStatus =
  /** Later today. */
  | "upcoming"
  /** Time to show the card. */
  | "due"
  /** The person chose "Later"; the card comes back at `snoozeUntil`. */
  | "snoozed"
  | "done"
  /** Not done within the waiting time. */
  | "missed";

export type Occurrence = {
  /** `${reminderId}@${dueAt}`: one per reminder per due time, so a reminder never fires twice. */
  key: string;
  reminder: Reminder;
  /** Local clock time, "HH:MM". */
  time: string;
  dueAt: string;
  /** After this moment it counts as missed. */
  deadline: string;
  status: OccurrenceStatus;
  event: ReminderEvent | null;
};

export const occurrenceKey = (reminderId: string, dueAt: string) => `${reminderId}@${dueAt}`;

export function needsCaregiverCheck(item: Occurrence): boolean {
  return (
    item.status === "done" &&
    item.reminder.needsConfirmation &&
    item.event?.actedBy === "patient" &&
    !item.event.confirmedAt
  );
}

/** Does the reminder repeat on this calendar day (ignoring times)? */
export function repeatsOn(reminder: Reminder, key: string): boolean {
  const { repeat } = reminder;
  if (repeat.type === "daily") return true;
  if (repeat.type === "once") return repeat.date === key;
  return (repeat.days as number[]).includes(weekdayOf(key));
}

/** The due moments of one reminder on one day of the person's calendar, oldest first. */
export function dueTimesOn(reminder: Reminder, key: string, timeZone: string): { time: string; dueAt: Date }[] {
  if (!reminder.active || !repeatsOn(reminder, key)) return [];
  const from = Date.parse(reminder.activeFrom);
  return reminder.times
    .map((time) => ({ time, dueAt: zonedToUtc(key, time, timeZone) }))
    .filter(({ dueAt }) => !(dueAt.getTime() < from))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

function statusOf(dueAt: number, deadline: number, event: ReminderEvent | null, now: number): OccurrenceStatus {
  if (event?.status === "done") return "done";
  if (event?.status === "missed") return "missed";
  if (now >= deadline) return "missed";
  if (event?.status === "later" && event.snoozeUntil && now < Date.parse(event.snoozeUntil)) return "snoozed";
  return now >= dueAt ? "due" : "upcoming";
}

/**
 * The missed deadline: the waiting time after the due time. "Later" pushes it
 * back so the person always gets the full waiting time after the card returns.
 */
function deadlineOf(dueAt: number, reminder: Reminder, event: ReminderEvent | null): number {
  const grace = reminder.graceMinutes * 60_000;
  const snoozed = event?.status === "later" && event.snoozeUntil ? Date.parse(event.snoozeUntil) : 0;
  return Math.max(dueAt + grace, snoozed + grace);
}

export function eventIndex(events: ReminderEvent[]): Map<string, ReminderEvent> {
  return new Map(events.map((event) => [occurrenceKey(event.reminderId, normalizeIso(event.dueAt)), event]));
}

/** Databases may return "…+00:00" while devices write "…Z": compare instants, not strings. */
export function normalizeIso(value: string): string {
  return new Date(value).toISOString();
}

/** Every occurrence on one day of the person's calendar, in time order. */
export function occurrencesOn(
  reminders: Reminder[],
  events: ReminderEvent[],
  key: string,
  timeZone: string,
  now: Date,
): Occurrence[] {
  const index = eventIndex(events);
  const list: Occurrence[] = [];
  for (const reminder of reminders) {
    for (const { time, dueAt } of dueTimesOn(reminder, key, timeZone)) {
      const iso = dueAt.toISOString();
      const event = index.get(occurrenceKey(reminder.id, iso)) ?? null;
      const deadline = deadlineOf(dueAt.getTime(), reminder, event);
      list.push({
        key: occurrenceKey(reminder.id, iso),
        reminder,
        time,
        dueAt: iso,
        deadline: new Date(deadline).toISOString(),
        status: statusOf(dueAt.getTime(), deadline, event, now.getTime()),
        event,
      });
    }
  }
  return list.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.reminder.title.localeCompare(b.reminder.title));
}

export type TodayPlan = {
  day: string;
  items: Occurrence[];
  /** The card to show now (the oldest one waiting), or null. */
  due: Occurrence | null;
  /** The next thing that has not happened yet (due, snoozed or upcoming). */
  next: Occurrence | null;
  /** Up to three things after `next`. */
  later: Occurrence[];
  /** Missed with no saved record yet: the store should save them as missed. */
  newlyMissed: Occurrence[];
};

export function todayPlan(reminders: Reminder[], events: ReminderEvent[], now: Date, timeZone: string): TodayPlan {
  const day = dayKey(now, timeZone);
  const items = occurrencesOn(reminders, events, day, timeZone, now);
  const open = items.filter((item) => item.status === "due" || item.status === "snoozed" || item.status === "upcoming");
  return {
    day,
    items,
    due: items.find((item) => item.status === "due") ?? null,
    next: open[0] ?? null,
    later: open.slice(1, 4),
    newlyMissed: items.filter((item) => item.status === "missed" && item.event?.status !== "missed"),
  };
}

/** Missed occurrences from yesterday that were never recorded (the tablet was off overnight, for example). */
export function missedYesterday(
  reminders: Reminder[],
  events: ReminderEvent[],
  now: Date,
  timeZone: string,
): Occurrence[] {
  const yesterday = addDays(dayKey(now, timeZone), -1);
  return occurrencesOn(reminders, events, yesterday, timeZone, now).filter(
    (item) => item.status === "missed" && item.event?.status !== "missed",
  );
}

/** The next due moment after `now`, looking up to 8 days ahead (for "next on Thursday" in the family area). */
export function nextOccurrence(reminder: Reminder, now: Date, timeZone: string): Date | null {
  const today = dayKey(now, timeZone);
  for (let offset = 0; offset <= 8; offset += 1) {
    const found = dueTimesOn(reminder, addDays(today, offset), timeZone).find(
      ({ dueAt }) => dueAt.getTime() > now.getTime(),
    );
    if (found) return found.dueAt;
  }
  return null;
}

/** The record to save when someone acts on an occurrence. Same key, so saving twice is harmless. */
export function eventFor(
  occurrence: Occurrence,
  status: ReminderEvent["status"],
  actedBy: ReminderEvent["actedBy"],
  now: Date,
  options: { id?: string; snoozeMinutes?: number } = {},
): ReminderEvent {
  return {
    id: occurrence.event?.id ?? options.id ?? crypto.randomUUID(),
    reminderId: occurrence.reminder.id,
    profileId: occurrence.reminder.profileId,
    dueAt: occurrence.dueAt,
    status,
    actedBy,
    actedAt: now.toISOString(),
    snoozeUntil:
      status === "later" ? new Date(now.getTime() + (options.snoozeMinutes ?? 10) * 60_000).toISOString() : null,
    confirmedAt: actedBy === "carer" && status === "done" ? now.toISOString() : (occurrence.event?.confirmedAt ?? null),
  };
}

/**
 * Merge two event lists (device and cloud). "Done" beats "missed" (a carer may
 * mark it done afterwards), which beats "later"; within the same state the
 * newest action wins. Keeps one event per occurrence.
 */
export function mergeEvents(a: ReminderEvent[], b: ReminderEvent[]): ReminderEvent[] {
  const RANK = { later: 0, missed: 1, done: 2 } as const;
  const rank = (event: ReminderEvent) => RANK[event.status];
  const merged = new Map<string, ReminderEvent>();
  for (const event of [...a, ...b]) {
    const key = occurrenceKey(event.reminderId, normalizeIso(event.dueAt));
    const current = merged.get(key);
    const normalized = { ...event, dueAt: normalizeIso(event.dueAt) };
    if (
      !current ||
      rank(normalized) > rank(current) ||
      (rank(normalized) === rank(current) && normalized.actedAt > current.actedAt)
    )
      merged.set(key, normalized);
  }
  return [...merged.values()];
}
