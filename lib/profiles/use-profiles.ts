"use client";

import { useCallback, useEffect, useState } from "react";

import { getProfileStore } from "@/lib/profiles/store";
import type { CareProfile } from "@/lib/profiles/types";

type State = { status: "loading" | "ready" | "error"; profiles: CareProfile[]; error: string | null };

/** The list of people for the signed-in account (or this browser in demo mode). */
export function useProfiles() {
  const [state, setState] = useState<State>({ status: "loading", profiles: [], error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profiles = await getProfileStore().list();
        if (!cancelled) setState({ status: "ready", profiles, error: null });
      } catch (error) {
        if (!cancelled)
          setState({
            status: "error",
            profiles: [],
            error: error instanceof Error ? error.message : "Something went wrong.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Call after adding, renaming or removing someone. */
  const reload = useCallback(async () => {
    try {
      const profiles = await getProfileStore().list();
      setState({ status: "ready", profiles, error: null });
    } catch (error) {
      setState({
        status: "error",
        profiles: [],
        error: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }, []);

  return { ...state, reload };
}
