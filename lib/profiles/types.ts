export type SupportLevel = 1 | 2 | 3;
export type Language = "en" | "hi";

/** A person who plays. Managed by a signed-in family member (or by themselves). */
export type CareProfile = {
  id: string;
  displayName: string;
  /** 1 = standard, 2 = simpler, 3 = simplest. An interface setting, not a medical stage. */
  supportLevel: SupportLevel;
  sessionMinutes: number;
  language: Language;
  /** IANA time zone, e.g. "Asia/Kolkata". Reminders use the person's local time. */
  timezone: string;
  /** The four general games are hidden on the tablet unless a carer turns this on. */
  showGeneralGames: boolean;
  createdAt: string;
};

export type NewProfile = {
  displayName: string;
  supportLevel?: SupportLevel;
  sessionMinutes?: number;
  language?: Language;
  timezone?: string;
  showGeneralGames?: boolean;
};

export type ProfilePatch = Partial<NewProfile>;

/** The exit PIN is stored only as a salted hash. */
export type PinRecord = { salt: string; hash: string };

export const MAX_PROFILES = 6;
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const MAX_NAME_LENGTH = 60;

export function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

/** A time zone the browser understands, or the default (India). */
export function normalizeTimezone(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 64) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
