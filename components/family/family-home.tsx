"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarClock, Images, Play, UserPlus } from "lucide-react";

import { PinPanel } from "@/components/family/pin-panel";
import { startPatientMode } from "@/components/family/start-patient-mode";
import { Avatar } from "@/components/profile/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProfileStore } from "@/lib/profiles/store";
import { MAX_NAME_LENGTH, MAX_PROFILES } from "@/lib/profiles/types";
import { useProfiles } from "@/lib/profiles/use-profiles";

export function FamilyHome() {
  const router = useRouter();
  const { status, profiles, error, reload } = useProfiles();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setAdding(true);
    setFormError(null);
    try {
      const profile = await getProfileStore().create({ displayName: name });
      setName("");
      router.push(`/family/profiles/${profile.id}/life-story`);
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : "That person could not be added.");
    } finally {
      setAdding(false);
    }
  }

  const canAdd = profiles.length < MAX_PROFILES;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold sm:text-5xl">Your family area</h1>
        <p className="max-w-2xl text-xl text-muted-foreground">
          Manage each person’s daily reminders, familiar photos and activities.
        </p>
      </div>

      <section aria-labelledby="people-heading" className="space-y-5">
        <h2 id="people-heading" className="text-3xl font-bold">
          People
        </h2>

        {status === "loading" && (
          <p role="status" className="text-lg">
            Loading…
          </p>
        )}
        {status === "error" && (
          <div role="alert" className="space-y-3 rounded-2xl border-2 border-destructive bg-destructive/10 p-5">
            <p className="text-lg font-semibold text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && (
          <ul role="list" className="grid gap-6 sm:grid-cols-2">
            {profiles.map((profile) => (
              <li key={profile.id} className="flex flex-col gap-5 rounded-3xl border-2 bg-card p-6">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={profile.displayName} size="lg" />
                  <h3 className="min-w-0 text-2xl font-bold [overflow-wrap:anywhere] sm:text-3xl">
                    {profile.displayName}
                  </h3>
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <Button size="lg" onClick={() => void startPatientMode(profile.id, router.push)}>
                    <Play aria-hidden />
                    Start patient mode
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/family/profiles/${profile.id}/schedule`}>
                      <CalendarClock aria-hidden />
                      Daily schedule
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/family/profiles/${profile.id}/life-story`}>
                      <Images aria-hidden />
                      Add or change photos
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/family/profiles/${profile.id}`}>
                      Progress and settings
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}

            {canAdd && (
              <li className="flex flex-col gap-4 rounded-3xl border-2 border-dashed p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft">
                    <UserPlus aria-hidden className="size-7" />
                  </span>
                  <h3 className="text-2xl font-bold">
                    {profiles.length === 0 ? "Add the first person" : "Add someone"}
                  </h3>
                </div>
                <form onSubmit={add} className="space-y-4">
                  <label className="block space-y-2 text-lg font-semibold">
                    First name
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={MAX_NAME_LENGTH}
                      required
                      autoComplete="off"
                    />
                  </label>
                  <div aria-live="polite">
                    {formError && (
                      <p role="alert" className="text-lg font-semibold text-destructive">
                        {formError}
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={adding || !name.trim()}>
                    {adding ? "Adding…" : "Add person"}
                  </Button>
                </form>
              </li>
            )}
          </ul>
        )}
      </section>

      <PinPanel />

      <section aria-labelledby="how-heading" className="space-y-3 rounded-3xl bg-accent-soft p-6 sm:p-8">
        <h2 id="how-heading" className="text-2xl font-bold">
          How it works
        </h2>
        <ol role="list" className="space-y-2 text-lg">
          <li>1. Add the person, then add familiar photos with their permission.</li>
          <li>2. Choose Start patient mode and hand over the device so they can choose an activity.</li>
          <li>
            3. To come back, tap <strong>Family</strong> at the top and enter your PIN.
          </li>
        </ol>
      </section>
    </div>
  );
}
