"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, ChevronLeft, Lock, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { getLifeStore } from "@/lib/life-story/store";
import { resizeToJpeg } from "@/lib/life-story/resize";
import {
  KIND_OPTIONS,
  MAX_LABEL_LENGTH,
  MAX_LIFE_ITEMS,
  MAX_NOTE_LENGTH,
  type LifeItemWithPhoto,
  type LifeKind,
} from "@/lib/life-story/types";
import { useLifeStory } from "@/lib/life-story/use-life-story";
import { getProfileStore } from "@/lib/profiles/store";
import { MIN_PERSONAL_ITEMS } from "@/lib/games/memory-match";
import { WHO_MIN_ITEMS } from "@/lib/games/who-is-this";
import { SetupGuide } from "@/components/family/setup-guide";

const KIND_TITLES: Record<LifeKind, string> = { person: "Person", place: "Place", thing: "Familiar thing" };

export function LifeStoryManager({ profileId }: { profileId: string }) {
  const { status, items, error, reload } = useLifeStory(profileId);
  const [name, setName] = useState<string | null>(null);

  // add form
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<LifeKind>("person");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // edit / remove
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editNote, setEditNote] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfileStore().get(profileId);
        if (!cancelled) setName(profile?.displayName ?? "");
      } catch {
        if (!cancelled) setName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // Show a small preview of the chosen photo, and free it when it changes.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The preview is created from an external object (the chosen file), so setting it here is safe.
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setFormError("Please choose a photo first.");
      return;
    }
    setAdding(true);
    setFormError(null);
    setNotice(null);
    try {
      const photo = await resizeToJpeg(file);
      await getLifeStore().add(profileId, { kind, label, note }, photo);
      setFile(null);
      setPreview(null);
      setLabel("");
      setNote("");
      setNotice(`${label.trim()} was added.`);
      await reload();
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "That photo could not be added.");
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(item: LifeItemWithPhoto) {
    setItemError(null);
    try {
      await getLifeStore().update(item, { label: editLabel, note: editNote });
      setEditingId(null);
      await reload();
    } catch (failure) {
      setItemError(failure instanceof Error ? failure.message : "The changes could not be saved.");
    }
  }

  async function remove(item: LifeItemWithPhoto) {
    setItemError(null);
    try {
      await getLifeStore().remove(item);
      setRemovingId(null);
      await reload();
    } catch (failure) {
      setItemError(failure instanceof Error ? failure.message : "The photo could not be removed.");
    }
  }

  const full = items.length >= MAX_LIFE_ITEMS;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href={`/family/profiles/${profileId}`}
          className="inline-flex min-h-12 items-center gap-1 rounded-lg text-lg font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-5" />
          Back{name ? ` to ${name}` : ""}
        </Link>
        <h1 className="text-4xl font-bold sm:text-5xl">Life story{name ? ` for ${name}` : ""}</h1>
        <p className="max-w-3xl text-xl text-muted-foreground">
          Photos of family, places and familiar things. The games use them, so playing feels personal and meaningful.
        </p>
        <p className="max-w-3xl text-lg">
          Add at least {WHO_MIN_ITEMS} photos to start “Who is this?” and {MIN_PERSONAL_ITEMS} for Memory Match. You can
          return and add more later.
        </p>
        <p className="flex max-w-3xl items-start gap-3 rounded-xl bg-accent-soft p-4 text-lg">
          <Lock aria-hidden className="mt-1 size-5 shrink-0" />
          Add only photos you have permission to use. In demo mode, photos stay on this device. When signed in, they are
          stored in your account and may also be cached on this device.
        </p>
      </div>

      {status === "ready" && <SetupGuide profileId={profileId} step="photos" photoCount={items.length} />}

      <section aria-labelledby="add-heading" className="space-y-5 rounded-3xl border-2 bg-card p-6 sm:p-8">
        <h2 id="add-heading" className="text-2xl font-bold">
          Add a photo
        </h2>
        {full ? (
          <p className="text-lg text-muted-foreground">
            You have added the most photos allowed ({MAX_LIFE_ITEMS}). Remove one to add another.
          </p>
        ) : (
          <form onSubmit={add} className="space-y-5">
            <div className="flex flex-wrap items-center gap-5">
              <input
                id="photo-file"
                type="file"
                accept="image/*"
                className="peer sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setFormError(null);
                }}
              />
              <label
                htmlFor="photo-file"
                className="inline-flex min-h-14 tile cursor-pointer items-center gap-2 rounded-2xl border-2 border-primary bg-card px-6 text-lg font-semibold [--lip:#9aa4bb] peer-focus-visible:ring-4 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 hover:bg-secondary"
              >
                <Camera aria-hidden className="size-6" />
                {file ? "Choose a different photo" : "Choose a photo"}
              </label>
              {file && preview && (
                // A plain <img>: a local preview of the chosen file.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Preview of the chosen photo"
                  className="size-24 rounded-2xl border-2 object-cover"
                />
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 text-lg font-semibold">
                Name
                <Input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  maxLength={MAX_LABEL_LENGTH}
                  required
                  autoComplete="off"
                  placeholder="For example, Priya"
                />
              </label>
              <label className="block space-y-2 text-lg font-semibold">
                This is
                <Select value={kind} onChange={(event) => setKind(event.target.value as LifeKind)}>
                  {KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.title}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <label className="block space-y-2 text-lg font-semibold">
              A few words (optional)
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={MAX_NOTE_LENGTH}
                autoComplete="off"
                placeholder="For example, your daughter"
              />
              <span className="block text-base font-normal text-muted-foreground">
                Shown after a right answer, such as “Priya, your daughter.”
              </span>
            </label>

            <div aria-live="polite">
              {formError && (
                <p role="alert" className="text-lg font-semibold text-destructive">
                  {formError}
                </p>
              )}
              {notice && (
                <p role="status" className="text-lg text-success">
                  {notice}
                </p>
              )}
            </div>
            <Button type="submit" size="lg" disabled={adding || !file || !label.trim()}>
              {adding ? "Adding…" : "Add photo"}
            </Button>
          </form>
        )}
      </section>

      <section aria-labelledby="photos-heading" className="space-y-5">
        <div className="space-y-1">
          <h2 id="photos-heading" className="text-3xl font-bold">
            Photos ({items.length} of {MAX_LIFE_ITEMS})
          </h2>
          <p className="text-lg text-muted-foreground">
            Memory Match with photos needs at least {MIN_PERSONAL_ITEMS} photos, and “Who is this?” needs at least{" "}
            {WHO_MIN_ITEMS}.
          </p>
        </div>

        <div aria-live="polite">
          {itemError && (
            <p role="alert" className="text-lg font-semibold text-destructive">
              {itemError}
            </p>
          )}
        </div>

        {status === "loading" && (
          <p role="status" className="text-lg">
            Loading photos…
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="text-lg font-semibold text-destructive">
            {error}
          </p>
        )}
        {status === "ready" && items.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed p-6 text-lg text-muted-foreground">
            No photos yet. Add the first one above.
          </p>
        )}

        {items.length > 0 && (
          <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-3xl border-2 bg-card">
                {/* A plain <img>: the photo is a local blob, so next/image has nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photoUrl} alt={`Photo of ${item.label}`} className="aspect-square w-full object-cover" />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <label className="block space-y-1 text-base font-semibold">
                        Name
                        <Input
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                          maxLength={MAX_LABEL_LENGTH}
                        />
                      </label>
                      <label className="block space-y-1 text-base font-semibold">
                        A few words
                        <Input
                          value={editNote}
                          onChange={(event) => setEditNote(event.target.value)}
                          maxLength={MAX_NOTE_LENGTH}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveEdit(item)} disabled={!editLabel.trim()}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold [overflow-wrap:anywhere]">{item.label}</h3>
                      {item.note && <p className="text-lg text-muted-foreground">{item.note}</p>}
                      <p className="text-base font-semibold text-people">{KIND_TITLES[item.kind]}</p>
                    </div>
                  )}

                  {editingId !== item.id && (
                    <div className="mt-auto flex flex-wrap gap-2">
                      {removingId === item.id ? (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => void remove(item)}>
                            <Trash2 aria-hidden className="size-5" />
                            Yes, remove
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRemovingId(null)}>
                            Keep
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditLabel(item.label);
                              setEditNote(item.note ?? "");
                              setItemError(null);
                            }}
                          >
                            <Pencil aria-hidden className="size-5" />
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRemovingId(item.id)}>
                            <Trash2 aria-hidden className="size-5" />
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
