"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, ChevronLeft, Images, Play, Trash2 } from "lucide-react";

import { ProfileSettings } from "@/components/family/profile-settings";
import { startPatientMode } from "@/components/family/start-patient-mode";
import { Avatar } from "@/components/profile/avatar";
import { ProgressHistory } from "@/components/progress/progress-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearProfileHistory } from "@/lib/games/session-history";
import { getLifeStore } from "@/lib/life-story/store";
import { getProfileStore } from "@/lib/profiles/store";
import { clearScheduleForProfile } from "@/lib/schedule/store";
import { MAX_NAME_LENGTH, type CareProfile } from "@/lib/profiles/types";

export function ProfileDetail({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CareProfile | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getProfileStore().get(profileId);
        if (cancelled) return;
        setProfile(found);
        setName(found?.displayName ?? "");
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await getProfileStore().update(profileId, { displayName: name });
      setProfile(updated);
      setName(updated.displayName);
      setMessage({ kind: "ok", text: "Saved." });
    } catch (failure) {
      setMessage({
        kind: "error",
        text: failure instanceof Error ? failure.message : "The change could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      // Photos live in storage, which is not cleaned up automatically, so remove them first.
      await getLifeStore().removeAll(profileId);
      await getProfileStore().remove(profileId);
      clearProfileHistory(profileId);
      clearScheduleForProfile(profileId);
      router.push("/family");
    } catch (failure) {
      setMessage({
        kind: "error",
        text: failure instanceof Error ? failure.message : "That person could not be removed.",
      });
      setConfirmRemove(false);
    }
  }

  if (profile === undefined) {
    return (
      <p role="status" className="text-lg">
        Loading…
      </p>
    );
  }

  if (profile === null) {
    return (
      <div className="space-y-5 rounded-3xl border-2 bg-card p-8">
        <h1 className="text-4xl font-bold">We could not find that person</h1>
        <Button asChild size="lg">
          <Link href="/family">Back to the family area</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <Link
          href="/family"
          className="inline-flex min-h-12 items-center gap-1 rounded-lg text-lg font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ChevronLeft aria-hidden className="size-5" />
          All people
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar name={profile.displayName} size="lg" />
            <h1 className="min-w-0 text-4xl font-bold [overflow-wrap:anywhere] sm:text-5xl">{profile.displayName}</h1>
          </div>
          <Button size="lg" onClick={() => void startPatientMode(profile.id, router.push)}>
            <Play aria-hidden />
            Start patient mode
          </Button>
        </div>
      </div>

      <section aria-labelledby="name-heading" className="space-y-4 rounded-3xl border-2 bg-card p-6 sm:p-8">
        <h2 id="name-heading" className="text-2xl font-bold">
          Name
        </h2>
        <form onSubmit={save} className="flex flex-wrap items-end gap-4">
          <label className="block min-w-60 flex-1 space-y-2 text-lg font-semibold">
            First name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              required
              autoComplete="off"
            />
          </label>
          <Button
            type="submit"
            variant="outline"
            disabled={saving || !name.trim() || name.trim() === profile.displayName}
          >
            {saving ? "Saving…" : "Save name"}
          </Button>
        </form>
        <div aria-live="polite">
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={message.kind === "error" ? "text-lg font-semibold text-destructive" : "text-lg text-success"}
            >
              {message.text}
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="schedule-heading"
        className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-routine-soft p-6 sm:p-8"
      >
        <div className="flex max-w-xl items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-routine text-white">
            <CalendarClock aria-hidden className="size-7" />
          </span>
          <div className="space-y-1">
            <h2 id="schedule-heading" className="text-2xl font-bold">
              Daily schedule and reminders
            </h2>
            <p className="text-lg">
              Medicine, meals, water and visits. The tablet shows each one at the right time and reads it aloud.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={`/family/profiles/${profile.id}/schedule`}>
            Open the schedule
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>

      <section
        aria-labelledby="life-story-heading"
        className="flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-people-soft p-6 sm:p-8"
      >
        <div className="flex max-w-xl items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-people text-white">
            <Images aria-hidden className="size-7" />
          </span>
          <div className="space-y-1">
            <h2 id="life-story-heading" className="text-2xl font-bold">
              Life story: photos and names
            </h2>
            <p className="text-lg">
              Add photos of family, places and familiar things. The games use them, so playing feels personal.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={`/family/profiles/${profile.id}/life-story`}>
            Add or change photos
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>

      <ProfileSettings profile={profile} onSaved={setProfile} />

      <ProgressHistory profileId={profile.id} title="Progress" intro={`Games ${profile.displayName} has completed.`} />

      <section
        aria-labelledby="remove-heading"
        className="space-y-4 rounded-3xl border-2 border-destructive/40 p-6 sm:p-8"
      >
        <h2 id="remove-heading" className="text-2xl font-bold">
          Remove {profile.displayName}
        </h2>
        <p className="text-lg text-muted-foreground">
          This permanently deletes {profile.displayName} and all their saved games.
        </p>
        {confirmRemove ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="destructive" onClick={() => void remove()}>
              <Trash2 aria-hidden />
              Yes, remove {profile.displayName}
            </Button>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirmRemove(true)}>
            <Trash2 aria-hidden />
            Remove this person
          </Button>
        )}
      </section>
    </div>
  );
}
