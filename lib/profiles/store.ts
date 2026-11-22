"use client";

import { createClient } from "@/lib/supabase/client";
import {
  MAX_PROFILES,
  cleanName,
  normalizeTimezone,
  type CareProfile,
  type Language,
  type NewProfile,
  type PinRecord,
  type ProfilePatch,
  type SupportLevel,
} from "@/lib/profiles/types";

/*
 * Where profiles are kept. Two backends share one interface:
 *   - "cloud": Supabase, used when .env.local is set up (real use).
 *   - "local": this browser only, used when Supabase is not configured. It
 *     makes the app demo-able with no internet and no account.
 * Cloud reads are cached on the device, so the "Who is playing?" screen still
 * works if the connection drops.
 */

export interface ProfileStore {
  readonly kind: "cloud" | "local";
  list(): Promise<CareProfile[]>;
  get(id: string): Promise<CareProfile | null>;
  create(input: NewProfile): Promise<CareProfile>;
  update(id: string, patch: ProfilePatch): Promise<CareProfile>;
  remove(id: string): Promise<void>;
  getPin(): Promise<PinRecord | null>;
  setPin(record: PinRecord | null): Promise<void>;
}

const LOCAL_PROFILES_KEY = "mindplay:profiles:v1";
const LOCAL_PIN_KEY = "mindplay:pin:v1";
const CACHE_PROFILES_KEY = "mindplay:profiles-cache:v1";
const CACHE_PIN_KEY = "mindplay:pin-cache:v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or blocked: the app keeps working without the cache. */
  }
}

function isProfile(value: unknown): value is CareProfile {
  const v = value as Partial<CareProfile> | null;
  return !!v && typeof v.id === "string" && typeof v.displayName === "string" && typeof v.createdAt === "string";
}

/** Profiles saved before a setting existed get its default. */
function withDefaults(profile: CareProfile): CareProfile {
  return {
    ...profile,
    timezone: normalizeTimezone(profile.timezone),
    showGeneralGames: profile.showGeneralGames === true,
  };
}

function readProfiles(key: string): CareProfile[] {
  const parsed = readJson<unknown>(key);
  return Array.isArray(parsed) ? parsed.filter(isProfile).map(withDefaults) : [];
}

function clampLevel(value: number | undefined): SupportLevel {
  return value === 2 || value === 3 ? value : 1;
}

function clampMinutes(value: number | undefined): number {
  return Math.min(30, Math.max(3, Math.round(value ?? 10)));
}

function normalizeLanguage(value: Language | undefined): Language {
  return value === "hi" ? "hi" : "en";
}

function validateName(name: string): string {
  const cleaned = cleanName(name);
  if (!cleaned) throw new Error("Please enter a name.");
  return cleaned;
}

/** Forget cached names and the PIN on this device (used at sign-out). */
export function clearProfileCache() {
  try {
    window.localStorage.removeItem(CACHE_PROFILES_KEY);
    window.localStorage.removeItem(CACHE_PIN_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

// ---------------------------------------------------------------- local

const localStore: ProfileStore = {
  kind: "local",
  async list() {
    return readProfiles(LOCAL_PROFILES_KEY);
  },
  async get(id) {
    return readProfiles(LOCAL_PROFILES_KEY).find((profile) => profile.id === id) ?? null;
  },
  async create(input) {
    const profiles = readProfiles(LOCAL_PROFILES_KEY);
    if (profiles.length >= MAX_PROFILES) throw new Error(`You can add up to ${MAX_PROFILES} people.`);
    const profile: CareProfile = {
      id: crypto.randomUUID(),
      displayName: validateName(input.displayName),
      supportLevel: clampLevel(input.supportLevel),
      sessionMinutes: clampMinutes(input.sessionMinutes),
      language: normalizeLanguage(input.language),
      timezone: normalizeTimezone(input.timezone),
      showGeneralGames: input.showGeneralGames === true,
      createdAt: new Date().toISOString(),
    };
    writeJson(LOCAL_PROFILES_KEY, [...profiles, profile]);
    return profile;
  },
  async update(id, patch) {
    const profiles = readProfiles(LOCAL_PROFILES_KEY);
    const current = profiles.find((profile) => profile.id === id);
    if (!current) throw new Error("That person could not be found.");
    const next: CareProfile = {
      ...current,
      displayName: patch.displayName === undefined ? current.displayName : validateName(patch.displayName),
      supportLevel: patch.supportLevel === undefined ? current.supportLevel : clampLevel(patch.supportLevel),
      sessionMinutes: patch.sessionMinutes === undefined ? current.sessionMinutes : clampMinutes(patch.sessionMinutes),
      language: patch.language === undefined ? current.language : normalizeLanguage(patch.language),
      timezone: patch.timezone === undefined ? current.timezone : normalizeTimezone(patch.timezone),
      showGeneralGames:
        patch.showGeneralGames === undefined ? current.showGeneralGames : patch.showGeneralGames === true,
    };
    writeJson(
      LOCAL_PROFILES_KEY,
      profiles.map((profile) => (profile.id === id ? next : profile)),
    );
    return next;
  },
  async remove(id) {
    writeJson(
      LOCAL_PROFILES_KEY,
      readProfiles(LOCAL_PROFILES_KEY).filter((profile) => profile.id !== id),
    );
  },
  async getPin() {
    return readJson<PinRecord>(LOCAL_PIN_KEY);
  },
  async setPin(record) {
    try {
      if (record) window.localStorage.setItem(LOCAL_PIN_KEY, JSON.stringify(record));
      else window.localStorage.removeItem(LOCAL_PIN_KEY);
    } catch {
      throw new Error("The PIN could not be saved on this device.");
    }
  },
};

// ---------------------------------------------------------------- cloud

const BASE_COLUMNS = "id, display_name, support_level, session_minutes, language, created_at";
const COLUMNS = `${BASE_COLUMNS}, timezone, show_general_games`;

/*
 * Until the owner runs the Phase 0 migration, the database has no timezone or
 * show_general_games columns. Reads then fall back to the older columns (and
 * the defaults), so the app keeps working; only saving those settings fails.
 */
let databaseLacksNewColumns = false;
const UNKNOWN_COLUMN = new Set(["42703", "PGRST204"]);
const NEEDS_UPDATE_MESSAGE =
  "This setting needs a database update. Ask the person who set up CogniCare to check the database setup in the README.";

function columns(): string {
  return databaseLacksNewColumns ? BASE_COLUMNS : COLUMNS;
}

/** Runs a query; if the database is missing the new columns, retries once with the older ones. */
async function withColumns<T extends { error: { code?: string } | null }>(
  run: (selected: string) => PromiseLike<T>,
): Promise<T> {
  const result = await run(columns());
  if (result.error && UNKNOWN_COLUMN.has(result.error.code ?? "") && !databaseLacksNewColumns) {
    databaseLacksNewColumns = true;
    return run(columns());
  }
  return result;
}

type Row = {
  id: string;
  display_name: string;
  support_level: number;
  session_minutes: number;
  language: string;
  timezone?: string | null;
  show_general_games?: boolean | null;
  created_at: string;
};

function fromRow(row: Row): CareProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    supportLevel: clampLevel(row.support_level),
    sessionMinutes: row.session_minutes,
    language: normalizeLanguage(row.language as Language),
    timezone: normalizeTimezone(row.timezone),
    showGeneralGames: row.show_general_games === true,
    createdAt: row.created_at,
  };
}

function cloudStore(): ProfileStore {
  const client = createClient();
  if (!client) return localStore;

  async function ownerId(): Promise<string> {
    // getSession reads the saved session without a network round trip.
    const { data } = await client!.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Please sign in again.");
    return id;
  }

  return {
    kind: "cloud",
    async list() {
      const { data, error } = await withColumns((selected) =>
        client!.from("care_profiles").select(selected).order("created_at", { ascending: true }),
      );
      if (error) {
        const cached = readProfiles(CACHE_PROFILES_KEY);
        if (cached.length) return cached;
        throw new Error("We could not load the list of people. Check your connection and try again.");
      }
      const profiles = (data as unknown as Row[]).map(fromRow);
      writeJson(CACHE_PROFILES_KEY, profiles);
      return profiles;
    },
    async get(id) {
      const profiles = await this.list();
      return profiles.find((profile) => profile.id === id) ?? null;
    },
    async create(input) {
      const existing = await this.list();
      if (existing.length >= MAX_PROFILES) throw new Error(`You can add up to ${MAX_PROFILES} people.`);
      const row = {
        owner_id: await ownerId(),
        display_name: validateName(input.displayName),
        support_level: clampLevel(input.supportLevel),
        session_minutes: clampMinutes(input.sessionMinutes),
        language: normalizeLanguage(input.language),
      };
      // New people get the database defaults for time zone and general games.
      const { data, error } = await withColumns((selected) =>
        client!.from("care_profiles").insert(row).select(selected).single(),
      );
      if (error || !data) throw new Error("We could not add that person. Please try again.");
      const profile = fromRow(data as unknown as Row);
      writeJson(CACHE_PROFILES_KEY, [...existing, profile]);
      return profile;
    },
    async update(id, patch) {
      const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.displayName !== undefined) changes.display_name = validateName(patch.displayName);
      if (patch.supportLevel !== undefined) changes.support_level = clampLevel(patch.supportLevel);
      if (patch.sessionMinutes !== undefined) changes.session_minutes = clampMinutes(patch.sessionMinutes);
      if (patch.language !== undefined) changes.language = normalizeLanguage(patch.language);
      const touchesNewColumns = patch.timezone !== undefined || patch.showGeneralGames !== undefined;
      if (patch.timezone !== undefined) changes.timezone = normalizeTimezone(patch.timezone);
      if (patch.showGeneralGames !== undefined) changes.show_general_games = patch.showGeneralGames === true;
      if (touchesNewColumns && databaseLacksNewColumns) throw new Error(NEEDS_UPDATE_MESSAGE);
      const { data, error } = await withColumns((selected) =>
        client!.from("care_profiles").update(changes).eq("id", id).select(selected).single(),
      );
      if (error && touchesNewColumns && UNKNOWN_COLUMN.has(error.code ?? "")) throw new Error(NEEDS_UPDATE_MESSAGE);
      if (error || !data) throw new Error("We could not save the changes. Please try again.");
      const profile = fromRow(data as unknown as Row);
      writeJson(
        CACHE_PROFILES_KEY,
        readProfiles(CACHE_PROFILES_KEY).map((item) => (item.id === id ? profile : item)),
      );
      return profile;
    },
    async remove(id) {
      const { error } = await client!.from("care_profiles").delete().eq("id", id);
      if (error) throw new Error("We could not remove that person. Please try again.");
      writeJson(
        CACHE_PROFILES_KEY,
        readProfiles(CACHE_PROFILES_KEY).filter((item) => item.id !== id),
      );
    },
    async getPin() {
      try {
        const { data, error } = await client!
          .from("account_settings")
          .select("pin_salt, pin_hash")
          .eq("user_id", await ownerId())
          .maybeSingle();
        if (error) throw error;
        const record: PinRecord | null =
          data?.pin_salt && data?.pin_hash ? { salt: data.pin_salt, hash: data.pin_hash } : null;
        if (record) writeJson(CACHE_PIN_KEY, record);
        else window.localStorage.removeItem(CACHE_PIN_KEY);
        return record;
      } catch {
        // Offline: use the copy saved on this device.
        return readJson<PinRecord>(CACHE_PIN_KEY);
      }
    },
    async setPin(record) {
      const userId = await ownerId();
      const { error } = record
        ? await client!
            .from("account_settings")
            .upsert(
              { user_id: userId, pin_salt: record.salt, pin_hash: record.hash, updated_at: new Date().toISOString() },
              { onConflict: "user_id" },
            )
        : await client!.from("account_settings").delete().eq("user_id", userId);
      if (error) throw new Error("We could not save the PIN. Please try again.");
      if (record) writeJson(CACHE_PIN_KEY, record);
      else window.localStorage.removeItem(CACHE_PIN_KEY);
    },
  };
}

export function getProfileStore(): ProfileStore {
  return createClient() ? cloudStore() : localStore;
}
