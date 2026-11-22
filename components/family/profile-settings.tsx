"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { MIN_PERSONAL_ITEMS } from "@/lib/games/memory-match";
import { getProfileStore } from "@/lib/profiles/store";
import { SESSION_MINUTE_OPTIONS, SUPPORT_OPTIONS } from "@/lib/profiles/support";
import type { CareProfile, SupportLevel } from "@/lib/profiles/types";
import { cn } from "@/lib/utils";

/** How much the games simplify themselves, and how long a playing session lasts, for one person. */
export function ProfileSettings({
  profile,
  onSaved,
}: {
  profile: CareProfile;
  onSaved: (profile: CareProfile) => void;
}) {
  const [support, setSupport] = useState<SupportLevel>(profile.supportLevel);
  const [minutes, setMinutes] = useState(profile.sessionMinutes);
  const [generalGames, setGeneralGames] = useState(profile.showGeneralGames);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const changed =
    support !== profile.supportLevel || minutes !== profile.sessionMinutes || generalGames !== profile.showGeneralGames;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await getProfileStore().update(profile.id, {
        supportLevel: support,
        sessionMinutes: minutes,
        showGeneralGames: generalGames,
      });
      onSaved(updated);
      setMessage({ kind: "ok", text: "Saved. It applies the next time they play." });
    } catch (failure) {
      setMessage({
        kind: "error",
        text: failure instanceof Error ? failure.message : "The settings could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="settings-heading" className="space-y-6 rounded-3xl border-2 bg-card p-6 sm:p-8">
      <div className="space-y-1">
        <h2 id="settings-heading" className="text-2xl font-bold">
          How the games feel
        </h2>
        <p className="text-lg text-muted-foreground">
          Games are always calm: no scores, no timers and no wrong-answer marks are shown to {profile.displayName}.
          These settings choose how simple they are.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">How simple should the games be?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SUPPORT_OPTIONS.map((option) => (
              <label key={option.value} className="block cursor-pointer">
                <input
                  type="radio"
                  name="support"
                  value={option.value}
                  checked={support === option.value}
                  onChange={() => setSupport(option.value)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-full flex-col gap-1 rounded-2xl border-2 border-input bg-card p-4 peer-focus-visible:ring-4 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                    support === option.value && "border-primary bg-accent-soft",
                  )}
                >
                  <span className="text-xl font-bold">{option.title}</span>
                  <span className="text-base text-muted-foreground">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block max-w-xs space-y-2 text-lg font-semibold">
          Suggest a rest after
          <Select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            {SESSION_MINUTE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} minutes
              </option>
            ))}
          </Select>
        </label>

        <label className="flex max-w-2xl cursor-pointer items-start gap-4 rounded-2xl border-2 border-input p-4">
          <input
            type="checkbox"
            checked={generalGames}
            onChange={(event) => setGeneralGames(event.target.checked)}
            aria-describedby="general-games-help"
            className="mt-0.5 size-7 shrink-0 accent-primary"
          />
          <span className="space-y-1">
            <span className="block text-lg font-semibold">Show general games</span>
            <span id="general-games-help" className="block text-base text-muted-foreground">
              Memory Match, Sequence Recall, Pattern Practice and Daily Routine. Off by default, so the tablet focuses
              on {profile.displayName}&rsquo;s own photos and day. Memory Match also appears once Life Story has{" "}
              {MIN_PERSONAL_ITEMS} photos.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={saving || !changed}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
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
        </div>
      </form>
    </section>
  );
}
