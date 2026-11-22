"use client";

import Link from "next/link";

import { Avatar } from "@/components/profile/avatar";
import { Button } from "@/components/ui/button";
import { useProfiles } from "@/lib/profiles/use-profiles";

/** The first screen in patient mode: one big tile per person. */
export function WhoIsPlaying() {
  const { status, profiles, error, reload } = useProfiles();

  return (
    <div className="space-y-10">
      <h1 className="text-center text-5xl font-bold sm:text-6xl">Who is playing?</h1>

      {status === "loading" && (
        <p role="status" className="text-center text-xl">
          Getting ready…
        </p>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mx-auto max-w-lg space-y-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-6 text-center"
        >
          <p className="text-lg font-semibold text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      )}

      {status === "ready" && profiles.length === 0 && (
        <div className="mx-auto max-w-lg space-y-5 rounded-3xl border-2 bg-card p-8 text-center">
          <p className="text-xl">
            No one has been added yet. A family member can add the first person in the family area.
          </p>
          <Button asChild size="lg">
            <Link href="/family">Open the family area</Link>
          </Button>
        </div>
      )}

      {status === "ready" && profiles.length > 0 && (
        <ul role="list" className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Link
                href={`/play/${profile.id}`}
                className="flex h-full min-h-56 tile flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary bg-card p-6 text-center [--lip:#9aa4bb] hover:bg-secondary focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Avatar name={profile.displayName} size="xl" />
                <span className="font-display text-4xl font-bold break-words">{profile.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
