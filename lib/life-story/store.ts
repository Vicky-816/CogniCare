"use client";

import { clearPhotoCache, deletePhoto, getPhoto, putPhoto } from "@/lib/life-story/photo-cache";
import {
  MAX_LIFE_ITEMS,
  cleanLabel,
  cleanNote,
  type LifeItem,
  type LifeKind,
  type NewLifeItem,
} from "@/lib/life-story/types";
import { createClient } from "@/lib/supabase/client";

/*
 * Where Life Story photos and names are kept. As with profiles, there are two
 * backends behind one interface:
 *   - "cloud": names in Supabase, photos in a PRIVATE storage bucket.
 *   - "local": this browser only (demo mode, no Supabase needed).
 * Photos are also cached on the device so games work offline.
 */

export interface LifeStore {
  readonly kind: "cloud" | "local";
  list(profileId: string): Promise<LifeItem[]>;
  add(profileId: string, input: NewLifeItem, photo: Blob): Promise<LifeItem>;
  update(item: LifeItem, patch: { label?: string; note?: string | null; kind?: LifeKind }): Promise<LifeItem>;
  remove(item: LifeItem): Promise<void>;
  /** Deletes every photo of one person (used when that person is removed). */
  removeAll(profileId: string): Promise<void>;
  photo(item: LifeItem): Promise<Blob | null>;
}

const BUCKET = "life-story";
const listKey = (profileId: string) => `mindplay:life:v1:${profileId}`;
const cacheKey = (profileId: string) => `mindplay:life-cache:v1:${profileId}`;

function readItems(key: string): LifeItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is LifeItem => !!item && typeof item.id === "string" && typeof item.label === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function writeItems(key: string, items: LifeItem[], required = false) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    if (required)
      throw new Error("The photo could not be saved on this device. Check available storage and try again.");
  }
}

function validate(input: NewLifeItem) {
  const label = cleanLabel(input.label);
  if (!label) throw new Error("Please type a name for this photo.");
  return { label, note: cleanNote(input.note), kind: input.kind };
}

// ---------------------------------------------------------------- local

const localStore: LifeStore = {
  kind: "local",
  async list(profileId) {
    return readItems(listKey(profileId));
  },
  async add(profileId, input, photo) {
    const items = readItems(listKey(profileId));
    if (items.length >= MAX_LIFE_ITEMS) throw new Error(`You can add up to ${MAX_LIFE_ITEMS} photos.`);
    const { label, note, kind } = validate(input);
    const item: LifeItem = {
      id: crypto.randomUUID(),
      profileId,
      kind,
      label,
      note,
      createdAt: new Date().toISOString(),
    };
    if (!(await putPhoto(item.id, photo))) {
      throw new Error("The photo could not be saved on this device. Check available storage and try again.");
    }
    try {
      writeItems(listKey(profileId), [...items, item], true);
    } catch (error) {
      await deletePhoto(item.id);
      throw error;
    }
    return item;
  },
  async update(item, patch) {
    const items = readItems(listKey(item.profileId));
    const next: LifeItem = {
      ...item,
      label: patch.label === undefined ? item.label : validate({ kind: item.kind, label: patch.label }).label,
      note: patch.note === undefined ? item.note : cleanNote(patch.note),
      kind: patch.kind ?? item.kind,
    };
    writeItems(
      listKey(item.profileId),
      items.map((existing) => (existing.id === item.id ? next : existing)),
      true,
    );
    return next;
  },
  async remove(item) {
    await deletePhoto(item.id);
    writeItems(
      listKey(item.profileId),
      readItems(listKey(item.profileId)).filter((existing) => existing.id !== item.id),
    );
  },
  async removeAll(profileId) {
    for (const item of readItems(listKey(profileId))) await deletePhoto(item.id);
    try {
      window.localStorage.removeItem(listKey(profileId));
    } catch {
      /* Nothing to remove. */
    }
  },
  async photo(item) {
    return getPhoto(item.id);
  },
};

// ---------------------------------------------------------------- cloud

type Row = {
  id: string;
  profile_id: string;
  kind: string;
  label: string;
  note: string | null;
  photo_path: string;
  created_at: string;
};
const COLUMNS = "id, profile_id, kind, label, note, photo_path, created_at";

function asKind(value: string): LifeKind {
  return value === "place" || value === "thing" ? value : "person";
}

function fromRow(row: Row): LifeItem {
  return {
    id: row.id,
    profileId: row.profile_id,
    kind: asKind(row.kind),
    label: row.label,
    note: row.note,
    createdAt: row.created_at,
    photoPath: row.photo_path,
  };
}

function cloudStore(): LifeStore {
  const client = createClient();
  if (!client) return localStore;

  async function ownerId(): Promise<string> {
    const { data } = await client!.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Please sign in again.");
    return id;
  }

  return {
    kind: "cloud",
    async list(profileId) {
      const { data, error } = await client!
        .from("memory_items")
        .select(COLUMNS)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });
      if (error) {
        // Offline or a hiccup: use the last list saved on this device.
        const cached = readItems(cacheKey(profileId));
        if (cached.length) return cached;
        throw new Error("We could not load the photos. Check your connection and try again.");
      }
      const items = (data as Row[]).map(fromRow);
      writeItems(cacheKey(profileId), items);
      return items;
    },
    async add(profileId, input, photo) {
      const existing = await this.list(profileId);
      if (existing.length >= MAX_LIFE_ITEMS) throw new Error(`You can add up to ${MAX_LIFE_ITEMS} photos.`);
      const { label, note, kind } = validate(input);
      const owner = await ownerId();
      const id = crypto.randomUUID();
      const path = `${owner}/${profileId}/${id}.jpg`;
      const { error: uploadError } = await client!.storage
        .from(BUCKET)
        .upload(path, photo, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error("The photo could not be uploaded. Check your connection and try again.");
      const { data, error } = await client!
        .from("memory_items")
        .insert({ id, profile_id: profileId, owner_id: owner, kind, label, note, photo_path: path })
        .select(COLUMNS)
        .single();
      if (error || !data) {
        await client!.storage.from(BUCKET).remove([path]);
        throw new Error("The photo could not be saved. Please try again.");
      }
      const item = fromRow(data as Row);
      await putPhoto(item.id, photo);
      writeItems(cacheKey(profileId), [...existing, item]);
      return item;
    },
    async update(item, patch) {
      const changes: Record<string, unknown> = {};
      if (patch.label !== undefined) changes.label = validate({ kind: item.kind, label: patch.label }).label;
      if (patch.note !== undefined) changes.note = cleanNote(patch.note);
      if (patch.kind !== undefined) changes.kind = patch.kind;
      const { data, error } = await client!
        .from("memory_items")
        .update(changes)
        .eq("id", item.id)
        .select(COLUMNS)
        .single();
      if (error || !data) throw new Error("The changes could not be saved. Please try again.");
      const next = fromRow(data as Row);
      writeItems(
        cacheKey(item.profileId),
        readItems(cacheKey(item.profileId)).map((existing) => (existing.id === item.id ? next : existing)),
      );
      return next;
    },
    async remove(item) {
      if (item.photoPath) await client!.storage.from(BUCKET).remove([item.photoPath]);
      const { error } = await client!.from("memory_items").delete().eq("id", item.id);
      if (error) throw new Error("The photo could not be removed. Please try again.");
      await deletePhoto(item.id);
      writeItems(
        cacheKey(item.profileId),
        readItems(cacheKey(item.profileId)).filter((existing) => existing.id !== item.id),
      );
    },
    async removeAll(profileId) {
      // Storage files are not removed automatically when a person is deleted, so remove them first.
      const { data } = await client!.from("memory_items").select(COLUMNS).eq("profile_id", profileId);
      const rows = (data as Row[] | null) ?? [];
      const paths = rows.map((row) => row.photo_path).filter(Boolean);
      if (paths.length) await client!.storage.from(BUCKET).remove(paths);
      for (const row of rows) await deletePhoto(row.id);
      try {
        window.localStorage.removeItem(cacheKey(profileId));
      } catch {
        /* Nothing to remove. */
      }
    },
    async photo(item) {
      const cached = await getPhoto(item.id);
      if (cached) return cached;
      if (!item.photoPath) return null;
      const { data, error } = await client!.storage.from(BUCKET).download(item.photoPath);
      if (error || !data) return null;
      await putPhoto(item.id, data);
      return data;
    },
  };
}

export function getLifeStore(): LifeStore {
  return createClient() ? cloudStore() : localStore;
}

/** Forget photos and photo lists on this device (used at sign-out). */
export async function clearLifeStoryCache() {
  await clearPhotoCache();
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith("mindplay:life-cache:v1:")) storage.removeItem(key);
    }
  } catch {
    /* Nothing to clear. */
  }
}
