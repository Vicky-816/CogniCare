/*
 * Clock maths in the PERSON's time zone (not the device's), using only the
 * browser's built-in Intl. A "day key" is "YYYY-MM-DD" on the person's calendar.
 */

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };
export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The person's wall-clock date and time at an instant. */
export function localParts(date: Date, timeZone: string): LocalParts & { second: number } {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const { year, month, day } = values;
  return {
    year,
    month,
    day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

const DAY_MS = 86_400_000;
const pad = (value: number) => String(value).padStart(2, "0");

export function dayKey(date: Date, timeZone: string): string {
  const { year, month, day } = localParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function weekdayOf(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** How far the zone is ahead of UTC at an instant, in milliseconds. */
function offsetAt(ms: number, timeZone: string): number {
  const p = localParts(new Date(ms), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant when the person's clock shows `time` on day `key`. On the day the
 * clocks go forward, a time that does not exist (e.g. 02:30) moves to the
 * first real time after the jump; on the day they go back, the first of the
 * two moments is used.
 */
export function zonedToUtc(key: string, time: string, timeZone: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // The zone's offset a day before and a day after covers both sides of any clock change.
  const candidates = [...new Set([wall - offsetAt(wall - DAY_MS, timeZone), wall - offsetAt(wall + DAY_MS, timeZone)])];
  candidates.sort((a, b) => a - b);
  const shows = (ms: number) => {
    const p = localParts(new Date(ms), timeZone);
    return p.hour === hour && p.minute === minute;
  };
  // Earliest real match; in the skipped hour, the later candidate lands just after the jump.
  return new Date(candidates.find(shows) ?? candidates[candidates.length - 1]);
}

export function partOfDay(hour: number): PartOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** "It is Tuesday afternoon, 14 November." */
export function dayInWords(date: Date, timeZone: string): string {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone });
  const dayMonth = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone });
  return `It is ${weekday} ${partOfDay(localParts(date, timeZone).hour)}, ${dayMonth}.`;
}

/** "8:00 in the morning", "1:30 in the afternoon", "9:15 at night". */
export function timeInWords(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const part = partOfDay(hour);
  if (hour === 12 && minute === 0) return "12:00 noon";
  return `${twelve}:${pad(minute)} ${part === "night" ? "at night" : `in the ${part}`}`;
}
