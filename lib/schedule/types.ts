/*
 * The person's daily schedule: reminders the carer sets up, and what happened
 * each time one was due. Times are stored as the person's LOCAL clock time
 * ("08:00") plus the profile's time zone; moments are stored in UTC.
 */

export const REMINDER_KINDS = ["medicine", "meal", "water", "activity", "visit", "appointment", "other"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const KIND_LABEL: Record<ReminderKind, string> = {
  medicine: "Medicine",
  meal: "Meal",
  water: "Water",
  activity: "Activity",
  visit: "Visit",
  appointment: "Appointment",
  other: "Other",
};

/** 0 = Sunday … 6 = Saturday (as in `Date.getUTCDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type Repeat =
  | { type: "daily" }
  | { type: "weekdays"; days: Weekday[] }
  /** One day only, as "YYYY-MM-DD" in the person's time zone. */
  | { type: "once"; date: string };

export type Reminder = {
  id: string;
  profileId: string;
  title: string;
  kind: ReminderKind;
  repeat: Repeat;
  /** Local clock times, "HH:MM", sorted. */
  times: string[];
  /** A Life Story photo shown on the card. */
  photoItemId: string | null;
  /** What the tablet says. Falls back to the title. */
  speakText: string | null;
  /** Minutes after the due time before it counts as missed. */
  graceMinutes: number;
  /** For medicine: the carer checks it was really taken. */
  needsConfirmation: boolean;
  /** Stopped reminders keep their history but never appear again. */
  active: boolean;
  /** Times before this moment are never shown (set when created or edited, so edits apply from now on). */
  activeFrom: string;
  createdAt: string;
};

export type NewReminder = {
  title: string;
  kind: ReminderKind;
  repeat: Repeat;
  times: string[];
  photoItemId?: string | null;
  speakText?: string | null;
  graceMinutes?: number;
  needsConfirmation?: boolean;
};

export type EventStatus = "done" | "later" | "missed";
export type Actor = "patient" | "carer";

/** What happened to one reminder at one due time. One row per (reminderId, dueAt). */
export type ReminderEvent = {
  id: string;
  reminderId: string;
  profileId: string;
  /** UTC ISO string of the due moment. */
  dueAt: string;
  status: EventStatus;
  actedBy: Actor | null;
  actedAt: string;
  /** For "later": when to show the card again. */
  snoozeUntil: string | null;
  /** For medicine that needs a check: when the carer confirmed it. */
  confirmedAt: string | null;
};

export const MAX_REMINDERS = 40;
export const MAX_TIMES = 6;
export const MAX_TITLE_LENGTH = 80;
export const MAX_SPEAK_LENGTH = 200;
export const DEFAULT_GRACE_MINUTES = 30;
export const MIN_GRACE_MINUTES = 5;
export const MAX_GRACE_MINUTES = 180;
export const SNOOZE_MINUTES = 10;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function cleanText(value: string | null | undefined, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Checks and tidies what the carer typed. Throws an Error with a plain message. */
export function cleanReminder(input: NewReminder): Required<NewReminder> {
  const title = cleanText(input.title, MAX_TITLE_LENGTH);
  if (!title) throw new Error("Please type what the reminder is for, for example “Morning tablets”.");
  if (!REMINDER_KINDS.includes(input.kind)) throw new Error("Please choose a type of reminder.");

  const times = [...new Set(input.times.map((time) => time.trim()))].filter(Boolean).sort();
  if (times.length === 0) throw new Error("Please add at least one time.");
  if (times.length > MAX_TIMES) throw new Error(`You can add up to ${MAX_TIMES} times.`);
  if (!times.every(isTime)) throw new Error("Please check the times. Use the time picker, for example 08:00.");

  let repeat: Repeat;
  if (input.repeat.type === "daily") repeat = { type: "daily" };
  else if (input.repeat.type === "weekdays") {
    const days = [...new Set(input.repeat.days)].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (days.length === 0) throw new Error("Please choose at least one day of the week.");
    repeat = days.length === 7 ? { type: "daily" } : { type: "weekdays", days: days.sort() as Weekday[] };
  } else if (input.repeat.type === "once") {
    if (!isDateKey(input.repeat.date)) throw new Error("Please choose the date.");
    repeat = { type: "once", date: input.repeat.date };
  } else throw new Error("Please choose how often it repeats.");

  const grace = Math.round(input.graceMinutes ?? DEFAULT_GRACE_MINUTES);
  if (!Number.isFinite(grace) || grace < MIN_GRACE_MINUTES || grace > MAX_GRACE_MINUTES)
    throw new Error(`The waiting time must be between ${MIN_GRACE_MINUTES} and ${MAX_GRACE_MINUTES} minutes.`);

  const speakText = cleanText(input.speakText, MAX_SPEAK_LENGTH) || null;
  return {
    title,
    kind: input.kind,
    repeat,
    times,
    photoItemId: input.photoItemId || null,
    speakText,
    graceMinutes: grace,
    needsConfirmation: !!input.needsConfirmation,
  };
}

/** Reads a repeat rule saved earlier (device or database), or null if it is damaged. */
export function parseRepeat(value: unknown): Repeat | null {
  if (!value || typeof value !== "object") return null;
  const repeat = value as { type?: unknown; days?: unknown; date?: unknown };
  if (repeat.type === "daily") return { type: "daily" };
  if (repeat.type === "weekdays" && Array.isArray(repeat.days)) {
    const days = repeat.days.filter((day): day is Weekday => Number.isInteger(day) && day >= 0 && day <= 6);
    return days.length ? { type: "weekdays", days } : null;
  }
  if (repeat.type === "once" && isDateKey(repeat.date)) return { type: "once", date: repeat.date };
  return null;
}

/** "Every day", "Monday, Wednesday and Friday", or "Only on 14 November 2026". */
export function describeRepeat(repeat: Repeat): string {
  if (repeat.type === "daily") return "Every day";
  if (repeat.type === "once") {
    const [year, month, day] = repeat.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return `Only on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;
  }
  const names = repeat.days.map((day) => WEEKDAY_NAMES[day]);
  return names.length === 1 ? `Every ${names[0]}` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
