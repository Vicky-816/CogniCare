"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getLifeStore } from "@/lib/life-story/store";
import type { LifeItem, LifeItemWithPhoto } from "@/lib/life-story/types";
import { GUEST_PROFILE_ID } from "@/lib/games/guest";

type State = { status: "loading" | "ready" | "error"; items: LifeItemWithPhoto[]; error: string | null };

async function loadItems(profileId: string): Promise<LifeItemWithPhoto[]> {
  if (profileId === GUEST_PROFILE_ID) return [];
  const store = getLifeStore();
  const items: LifeItem[] = await store.list(profileId);
  const loaded = await Promise.all(
    items.map(async (item) => {
      try {
        const blob = await store.photo(item);
        return blob ? ({ ...item, photoUrl: URL.createObjectURL(blob) } as LifeItemWithPhoto) : null;
      } catch {
        return null;
      }
    }),
  );
  return loaded.filter((item): item is LifeItemWithPhoto => item !== null);
}

/**
 * The photos and names for one person, with each photo ready to show. The
 * state stays "loading" until every photo is ready, so a game never starts
 * with half its pictures missing. Photos that cannot be loaded are skipped.
 */
export function useLifeStory(profileId: string) {
  const [state, setState] = useState<State>({ status: "loading", items: [], error: null });
  const urls = useRef<string[]>([]);

  const release = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await loadItems(profileId);
        if (cancelled) {
          items.forEach((item) => URL.revokeObjectURL(item.photoUrl));
          return;
        }
        release();
        urls.current = items.map((item) => item.photoUrl);
        setState({ status: "ready", items, error: null });
      } catch (error) {
        if (!cancelled)
          setState({
            status: "error",
            items: [],
            error: error instanceof Error ? error.message : "Something went wrong.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, release]);

  // Free the photo memory when the screen goes away.
  useEffect(() => release, [release]);

  /** Call after adding, editing or removing a photo. */
  const reload = useCallback(async () => {
    try {
      const items = await loadItems(profileId);
      release();
      urls.current = items.map((item) => item.photoUrl);
      setState({ status: "ready", items, error: null });
    } catch (error) {
      setState({ status: "error", items: [], error: error instanceof Error ? error.message : "Something went wrong." });
    }
  }, [profileId, release]);

  return { ...state, reload };
}

