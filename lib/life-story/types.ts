export type LifeKind = "person" | "place" | "thing";

/** One photo with a name: a person, a place or something familiar. */
export type LifeItem = {
  id: string;
  profileId: string;
  kind: LifeKind;
  label: string;
  /** Optional line shown after a right answer, e.g. "your daughter". */
  note: string | null;
  createdAt: string;
  /** Where the photo lives in cloud storage (cloud mode only). */
  photoPath?: string;
};

export type LifeItemWithPhoto = LifeItem & { photoUrl: string };

export type NewLifeItem = { kind: LifeKind; label: string; note?: string | null };

export const MAX_LIFE_ITEMS = 24;
export const MAX_LABEL_LENGTH = 40;
export const MAX_NOTE_LENGTH = 80;

export const KIND_OPTIONS: { value: LifeKind; title: string }[] = [
  { value: "person", title: "A person" },
  { value: "place", title: "A place" },
  { value: "thing", title: "Something familiar" },
];

export function cleanLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
}

export function cleanNote(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LENGTH);
  return cleaned || null;
}
