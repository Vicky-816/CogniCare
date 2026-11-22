"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { usePlay } from "@/components/play/play-context";
import { Button } from "@/components/ui/button";
import { extendSession, isSessionOver } from "@/lib/play/session-timer";

/** A gentle, dismissible suggestion to rest after a long session. Never blocks anything. */
export function RestSuggestion() {
  const { profile, profileId } = usePlay();
  const [rest, setRest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRest(isSessionOver(profileId, profile.sessionMinutes, Date.now()));
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, profile.sessionMinutes]);

  if (!rest) return null;
  return (
    <section
      aria-label="Time for a rest"
      className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-accent-soft p-6"
    >
      <p className="max-w-md text-xl font-semibold">
        You have played for a good while. A rest and a cup of tea might feel nice.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/play">Take a rest</Link>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            extendSession(profileId, Date.now());
            setRest(false);
          }}
        >
          Keep playing
        </Button>
      </div>
    </section>
  );
}
