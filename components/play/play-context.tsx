"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { TodayProvider } from "@/components/play/today-context";
import { Button } from "@/components/ui/button";
import { touchSession } from "@/lib/play/session-timer";
import { getProfileStore } from "@/lib/profiles/store";
import type { CareProfile } from "@/lib/profiles/types";

const PlayContext = createContext<CareProfile | null>(null);

/** The person who is playing. Only works inside <PlayProvider>. */
export function usePlay() {
  const profile = useContext(PlayContext);
  if (!profile) throw new Error("usePlay must be used inside PlayProvider");
  return { profile, profileId: profile.id };
}

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; profile: CareProfile };

/** Loads one person and shares them with everything inside, or explains if they cannot be found. */
export function PlayProvider({ profileId, children }: { profileId: string; children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfileStore().get(profileId);
        if (cancelled) return;
        // Playing starts (or continues) a session, which the rest reminder counts from.
        if (profile) touchSession(profileId, Date.now());
        setState(profile ? { status: "ready", profile } : { status: "missing" });
      } catch {
        if (!cancelled) setState({ status: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (state.status === "loading") {
    return (
      <p role="status" className="text-xl">
        Getting ready…
      </p>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="space-y-5 rounded-3xl border-2 bg-card p-8">
        <h1 className="text-4xl font-bold">We could not find that person</h1>
        <p className="text-xl text-muted-foreground">They may have been removed, or the link is old.</p>
        <Button asChild size="lg">
          <Link href="/play">Choose who is playing</Link>
        </Button>
      </div>
    );
  }

  return (
    <PlayContext.Provider value={state.profile}>
      <TodayProvider profileId={state.profile.id} timeZone={state.profile.timezone}>
        {children}
      </TodayProvider>
    </PlayContext.Provider>
  );
}
